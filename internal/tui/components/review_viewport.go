package components

import (
	"fmt"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ReviewViewport wraps bubbles/viewport for scrollable preview content.
// It handles mouse-wheel scrolling and shows a scroll percentage indicator.
type ReviewViewport struct {
	viewport viewport.Model
	ready    bool
	style    lipgloss.Style
	barStyle lipgloss.Style
}

// NewReviewViewport creates a viewport tuned for review/preview content.
func NewReviewViewport(width, height int, accentColor, subtextColor lipgloss.Color) ReviewViewport {
	vp := viewport.New(width, height)
	vp.MouseWheelEnabled = true
	vp.MouseWheelDelta = 3

	return ReviewViewport{
		viewport: vp,
		ready:    true,
		style:    lipgloss.NewStyle(),
		barStyle: lipgloss.NewStyle().
			Foreground(subtextColor).
			Italic(true).
			Padding(0, 1),
	}
}

// SetContent replaces the viewport text and resets scroll to the top.
func (rv *ReviewViewport) SetContent(content string) {
	rv.viewport.SetContent(content)
	rv.viewport.GotoTop()
}

// SetSize adjusts the viewport dimensions for responsive layout.
func (rv *ReviewViewport) SetSize(width, height int) {
	rv.viewport.Width = width
	rv.viewport.Height = height
}

// Update forwards messages (scroll events, key presses) to the viewport.
func (rv *ReviewViewport) Update(msg tea.Msg) tea.Cmd {
	var cmd tea.Cmd
	rv.viewport, cmd = rv.viewport.Update(msg)
	return cmd
}

// View renders the viewport content with a scroll percentage indicator.
func (rv ReviewViewport) View() string {
	content := rv.viewport.View()
	indicator := rv.scrollIndicator()
	if indicator != "" {
		return content + "\n" + indicator
	}
	return content
}

// scrollIndicator returns a percentage string when content overflows.
func (rv ReviewViewport) scrollIndicator() string {
	total := rv.viewport.TotalLineCount()
	visible := rv.viewport.VisibleLineCount()
	if total <= visible {
		return ""
	}
	pct := rv.viewport.ScrollPercent() * 100
	return rv.barStyle.Render(fmt.Sprintf("%.0f%%", pct))
}
