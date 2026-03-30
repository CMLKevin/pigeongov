package tui

import (
	"math"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/harmonica"
)

// tickMsg drives the animation loop at ~60fps.
type tickMsg time.Time

func tickCmd() tea.Cmd {
	return tea.Tick(time.Second/60, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

// AnimationState holds every spring / projectile the TUI animates.
// All values live here so the main Model stays clean.
type AnimationState struct {
	// Section progress bar
	progressSpring harmonica.Spring
	progressValue  float64
	progressVel    float64
	progressTarget float64

	// Refund / derived-value counter
	refundSpring  harmonica.Spring
	refundDisplay float64
	refundVel     float64
	refundTarget  float64

	// Error shake
	shakeSpring harmonica.Spring
	shakeOffset float64
	shakeVel    float64
	shakeTarget float64

	// Fade-in alpha (0..1) for pane transitions
	fadeSpring harmonica.Spring
	fadeValue  float64
	fadeVel    float64
	fadeTarget float64

	// Slide-in offset for entrance animation (starts negative, settles at 0)
	slideInSpring harmonica.Spring
	slideInValue  float64
	slideInVel    float64
	slideInTarget float64

	// Cascade: progress settles first, then refund kicks off
	cascading      bool
	stageComplete  bool
	cascadeRefund  float64

	// Master toggle
	animating    bool
	reduceMotion bool
}

// NewAnimationState creates springs tuned for terminal UI cadence.
// If reduceMotion is true, all values snap to their targets instantly.
func NewAnimationState(reduceMotion bool) AnimationState {
	dt := harmonica.FPS(60)
	return AnimationState{
		// Progress: snappy, slight overshoot
		progressSpring: harmonica.NewSpring(dt, 7.0, 0.4),
		// Refund counter: smooth ramp
		refundSpring: harmonica.NewSpring(dt, 5.5, 0.95),
		// Shake: punchy, slightly elastic
		shakeSpring: harmonica.NewSpring(dt, 18.0, 0.35),
		// Fade: faster pane reveals
		fadeSpring: harmonica.NewSpring(dt, 6.0, 1.0),
		fadeTarget: 1.0,
		// Slide-in: content enters from the left
		slideInSpring: harmonica.NewSpring(dt, 7.0, 0.9),

		reduceMotion: reduceMotion,
	}
}

// AnimateFrame advances every active spring by one tick.
func (a *AnimationState) AnimateFrame() {
	if a.reduceMotion {
		a.progressValue = a.progressTarget
		a.refundDisplay = a.refundTarget
		a.shakeOffset = 0
		a.fadeValue = a.fadeTarget
		a.slideInValue = a.slideInTarget
		a.stageComplete = true
		a.animating = false
		return
	}

	a.progressValue, a.progressVel = a.progressSpring.Update(
		a.progressValue, a.progressVel, a.progressTarget,
	)

	// Cascade: when progress settles, kick off the refund counter
	if a.cascading && !a.stageComplete {
		const epsilon = 0.01
		if math.Abs(a.progressValue-a.progressTarget) < epsilon &&
			math.Abs(a.progressVel) < epsilon {
			a.stageComplete = true
			a.refundTarget = a.cascadeRefund
		}
	}

	a.refundDisplay, a.refundVel = a.refundSpring.Update(
		a.refundDisplay, a.refundVel, a.refundTarget,
	)
	a.shakeOffset, a.shakeVel = a.shakeSpring.Update(
		a.shakeOffset, a.shakeVel, a.shakeTarget,
	)
	a.fadeValue, a.fadeVel = a.fadeSpring.Update(
		a.fadeValue, a.fadeVel, a.fadeTarget,
	)
	a.slideInValue, a.slideInVel = a.slideInSpring.Update(
		a.slideInValue, a.slideInVel, a.slideInTarget,
	)

	a.animating = !a.IsSettled()
}

// StartProgressAnimation sets a new target for the section progress bar.
func (a *AnimationState) StartProgressAnimation(target float64) {
	a.progressTarget = target
	a.animating = true
}

// StartRefundAnimation sets a new target for the refund counter.
func (a *AnimationState) StartRefundAnimation(target float64) {
	a.refundTarget = target
	a.animating = true
}

// StartShake kicks the error shake offset.
func (a *AnimationState) StartShake() {
	a.shakeOffset = 3.0
	a.shakeVel = 0
	a.shakeTarget = 0
	a.animating = true
}

// StartFadeIn resets fade to 0 and animates to 1.
func (a *AnimationState) StartFadeIn() {
	a.fadeValue = 0
	a.fadeVel = 0
	a.fadeTarget = 1.0
	a.animating = true
}

// StartCascade sets up a chained animation: the progress bar fills to
// progressTarget first, and only once it settles does the refund counter
// begin ticking toward refundTarget.
func (a *AnimationState) StartCascade(progressTarget, refundTarget float64) {
	a.progressTarget = progressTarget
	a.cascading = true
	a.stageComplete = false
	a.cascadeRefund = refundTarget
	// Hold refund at zero until progress settles
	a.refundTarget = 0
	a.refundDisplay = 0
	a.refundVel = 0
	a.animating = true
}

// StartSlideIn kicks the horizontal offset to -20 and lets it spring to 0.
func (a *AnimationState) StartSlideIn() {
	a.slideInValue = -20
	a.slideInVel = 0
	a.slideInTarget = 0
	a.animating = true
}

// SlideInOffset returns the current horizontal slide-in displacement (int columns).
func (a *AnimationState) SlideInOffset() int {
	return int(math.Round(a.slideInValue))
}

// IsSettled returns true when all springs are close enough to rest.
func (a *AnimationState) IsSettled() bool {
	const epsilon = 0.001
	return math.Abs(a.progressValue-a.progressTarget) < epsilon &&
		math.Abs(a.progressVel) < epsilon &&
		math.Abs(a.refundDisplay-a.refundTarget) < epsilon &&
		math.Abs(a.refundVel) < epsilon &&
		math.Abs(a.shakeOffset) < epsilon &&
		math.Abs(a.shakeVel) < epsilon &&
		math.Abs(a.fadeValue-a.fadeTarget) < epsilon &&
		math.Abs(a.fadeVel) < epsilon &&
		math.Abs(a.slideInValue-a.slideInTarget) < epsilon &&
		math.Abs(a.slideInVel) < epsilon
}

// ProgressPercent returns the current animated progress as 0..1.
func (a *AnimationState) ProgressPercent() float64 {
	return clampFloat(a.progressValue, 0, 1)
}

// RefundValue returns the current animated refund display value.
func (a *AnimationState) RefundValue() float64 {
	return a.refundDisplay
}

// ShakeOffset returns the current horizontal shake displacement.
func (a *AnimationState) ShakeOffset() int {
	return int(math.Round(a.shakeOffset))
}

// FadeAlpha returns 0..1 representing pane fade-in progress.
func (a *AnimationState) FadeAlpha() float64 {
	return clampFloat(a.fadeValue, 0, 1)
}

func clampFloat(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
