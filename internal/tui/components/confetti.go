package components

import (
	"math"
	"math/rand"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/harmonica"
	"github.com/charmbracelet/lipgloss"
)

var confettiChars = []string{"✦", "✧", "◆", "●", "★"}
var confettiColors = []lipgloss.Color{
	"#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8",
	"#94e2d5", "#cba6f7", "#fab387", "#89dceb",
}

// Particle is a single confetti piece with projectile physics.
type Particle struct {
	projectile *harmonica.Projectile
	pos        harmonica.Point
	char       string
	style      lipgloss.Style
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
	particles := make([]Particle, 40)
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

		particles[i] = Particle{
			projectile: p,
			pos:        harmonica.Point{X: centreX, Y: centreY},
			char:       confettiChars[charIdx],
			style:      lipgloss.NewStyle().Foreground(confettiColors[colorIdx]),
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

	allDone := true
	for i := range c.particles {
		c.particles[i].pos = c.particles[i].projectile.Update()
		// particle is still visible if within bounds
		if c.particles[i].pos.Y < float64(c.height)+5 {
			allDone = false
		}
	}

	if allDone {
		c.active = false
		return c, nil
	}

	return c, ConfettiTickCmd()
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
			grid[y][x] = p.style.Render(p.char)
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
