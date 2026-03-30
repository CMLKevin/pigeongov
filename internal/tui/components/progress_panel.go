package components

import (
	"fmt"

	"github.com/charmbracelet/bubbles/progress"
	"github.com/charmbracelet/lipgloss"
)

// ProgressPanel shows section completion with a gradient progress bar.
// The actual percentage is driven externally by AnimationState.
type ProgressPanel struct {
	bar   progress.Model
	label string
	style lipgloss.Style
}

// NewProgressPanel creates a progress bar with a gradient fill.
func NewProgressPanel(colorA, colorB string, width int) ProgressPanel {
	bar := progress.New(progress.WithGradient(colorA, colorB))
	bar.Width = width
	bar.ShowPercentage = false
	return ProgressPanel{
		bar: bar,
		style: lipgloss.NewStyle().
			Padding(0, 1),
	}
}

// SetWidth adjusts the progress bar to fit a panel.
func (p *ProgressPanel) SetWidth(w int) {
	if w > 4 {
		p.bar.Width = w - 4 // account for padding
	}
}

// View renders the progress bar at a given percentage with a label.
func (p ProgressPanel) View(percent float64, current, total int) string {
	p.label = fmt.Sprintf("Section %d / %d", current, total)
	return p.style.Render(
		lipgloss.JoinVertical(lipgloss.Left,
			p.label,
			p.bar.ViewAs(percent),
		),
	)
}
