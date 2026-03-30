package components

import (
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/harmonica"
	"github.com/charmbracelet/lipgloss"
)

// Characters chosen based on particle speed.
const (
	charFast = "✦"
	charSlow = "·"
)

// Large particles use a double-width block; small ones use a narrow block.
const (
	charLarge = "█"
	charSmall = "▪"
)

var confettiChars = []string{"✦", "✧", "◆", "●", "★"}
var confettiColors = []lipgloss.Color{
	"#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8",
	"#94e2d5", "#cba6f7", "#fab387", "#89dceb",
}

// bounceRetention controls how much energy a particle keeps after hitting the floor.
const bounceRetention = 0.6

// Particle is a single confetti piece with projectile physics.
type Particle struct {
	projectile *harmonica.Projectile
	pos        harmonica.Point
	baseChar   string // assigned at creation, may be overridden by speed
	color      lipgloss.Color
	large      bool // if true, render with double-width character
	age        int  // ticks since spawn
	bounced    int  // number of bounces so far
}

// ConfettiModel manages a burst of confetti particles.
type ConfettiModel struct {
	particles []Particle
	width     int
	height    int
	active    bool
	rng       *rand.Rand
}

// ConfettiTickMsg drives the confetti animation.
type ConfettiTickMsg time.Time

// NewConfettiModel creates a confetti burst originating from the centre.
func NewConfettiModel(width, height int) ConfettiModel {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	count := 60 // more drama
	particles := make([]Particle, count)
	dt := harmonica.FPS(60)

	centreX := float64(width) / 2
	centreY := float64(height) / 2

	for i := range particles {
		angle := rng.Float64() * 2 * math.Pi
		speed := 3.0 + rng.Float64()*8.0
		vx := math.Cos(angle) * speed
		vy := -math.Abs(math.Sin(angle) * speed * 1.5) // always starts upward

		p := harmonica.NewProjectile(
			dt,
			harmonica.Point{X: centreX, Y: centreY, Z: 0},
			harmonica.Vector{X: vx, Y: vy, Z: 0},
			harmonica.TerminalGravity,
		)

		charIdx := rng.Intn(len(confettiChars))
		colorIdx := rng.Intn(len(confettiColors))
		isLarge := rng.Float64() < 0.3 // 30% chance of being a large particle

		particles[i] = Particle{
			projectile: p,
			pos:        harmonica.Point{X: centreX, Y: centreY},
			baseChar:   confettiChars[charIdx],
			color:      confettiColors[colorIdx],
			large:      isLarge,
			age:        0,
			bounced:    0,
		}
	}

	return ConfettiModel{
		particles: particles,
		width:     width,
		height:    height,
		active:    true,
		rng:       rng,
	}
}

// ConfettiTickCmd returns the tick command for confetti animation.
func ConfettiTickCmd() tea.Cmd {
	return tea.Tick(time.Second/60, func(t time.Time) tea.Msg {
		return ConfettiTickMsg(t)
	})
}

// Update advances all particles and checks for termination.
func (c ConfettiModel) Update(msg tea.Msg) (ConfettiModel, tea.Cmd) {
	if !c.active {
		return c, nil
	}

	if _, ok := msg.(ConfettiTickMsg); !ok {
		return c, nil
	}

	dt := harmonica.FPS(60)
	floor := float64(c.height) - 1
	allDone := true

	for i := range c.particles {
		c.particles[i].pos = c.particles[i].projectile.Update()
		c.particles[i].age++

		// Bounce off the bottom instead of disappearing
		if c.particles[i].pos.Y >= floor && c.particles[i].bounced < 3 {
			c.particles[i].bounced++
			vel := c.particles[i].projectile.Velocity()
			// Reverse Y velocity with energy loss, keep X
			newVY := -math.Abs(vel.Y) * bounceRetention
			newVX := vel.X * 0.9 // slight horizontal friction
			c.particles[i].projectile = harmonica.NewProjectile(
				dt,
				harmonica.Point{X: c.particles[i].pos.X, Y: floor - 0.1, Z: 0},
				harmonica.Vector{X: newVX, Y: newVY, Z: 0},
				harmonica.TerminalGravity,
			)
			c.particles[i].pos.Y = floor - 0.1
		}

		// Particle is still alive if within bounds (allow some margin above/below)
		if c.particles[i].pos.Y < float64(c.height)+10 &&
			c.particles[i].pos.X > -5 &&
			c.particles[i].pos.X < float64(c.width)+5 &&
			c.particles[i].age < 300 { // ~5 seconds max lifetime
			allDone = false
		}
	}

	if allDone {
		c.active = false
		return c, nil
	}

	return c, ConfettiTickCmd()
}

// renderChar picks the display character based on velocity and size.
func (p *Particle) renderChar() string {
	vel := p.projectile.Velocity()
	speed := math.Sqrt(vel.X*vel.X + vel.Y*vel.Y)

	if p.large {
		return charLarge
	}
	// Velocity-based character selection
	if speed > 5.0 {
		return charFast
	}
	if speed < 1.5 {
		return charSlow
	}
	return p.baseChar
}

// dimColor returns a dimmed version of the color based on particle age.
// Fresh particles are full brightness; old particles fade toward grey.
func dimColor(c lipgloss.Color, age int) lipgloss.Color {
	// Parse the hex color
	hex := string(c)
	if len(hex) != 7 || hex[0] != '#' {
		return c
	}
	var r, g, b int
	fmt.Sscanf(hex, "#%02x%02x%02x", &r, &g, &b)

	// Fade factor: 1.0 at age 0, approaching 0.2 at age 180 (~3 seconds)
	fade := 1.0 - float64(age)/225.0
	if fade < 0.2 {
		fade = 0.2
	}

	r = int(float64(r) * fade)
	g = int(float64(g) * fade)
	b = int(float64(b) * fade)

	return lipgloss.Color(fmt.Sprintf("#%02x%02x%02x", r, g, b))
}

// View renders all particles onto a character grid.
func (c ConfettiModel) View() string {
	if !c.active {
		return ""
	}

	// Build a sparse grid
	grid := make([][]string, c.height)
	for y := range grid {
		grid[y] = make([]string, c.width)
		for x := range grid[y] {
			grid[y][x] = " "
		}
	}

	for _, p := range c.particles {
		x := int(math.Round(p.pos.X))
		y := int(math.Round(p.pos.Y))
		if x >= 0 && x < c.width && y >= 0 && y < c.height {
			ch := p.renderChar()
			color := dimColor(p.color, p.age)
			style := lipgloss.NewStyle().Foreground(color)
			grid[y][x] = style.Render(ch)
		}
	}

	var sb strings.Builder
	for _, row := range grid {
		sb.WriteString(strings.Join(row, ""))
		sb.WriteString("\n")
	}
	return sb.String()
}

// IsActive returns whether the confetti is still animating.
func (c ConfettiModel) IsActive() bool {
	return c.active
}
