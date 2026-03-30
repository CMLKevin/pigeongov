package components

import (
	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/lipgloss"
)

// HelpOverlay manages the contextual help footer and full-screen help.
type HelpOverlay struct {
	help    help.Model
	showAll bool
}

// NewHelpOverlay creates a help overlay with the given width.
func NewHelpOverlay(width int, textColor, subtextColor lipgloss.Color) HelpOverlay {
	h := help.New()
	h.Width = width
	h.Styles.ShortKey = lipgloss.NewStyle().Foreground(textColor).Bold(true)
	h.Styles.ShortDesc = lipgloss.NewStyle().Foreground(subtextColor)
	h.Styles.FullKey = lipgloss.NewStyle().Foreground(textColor).Bold(true)
	h.Styles.FullDesc = lipgloss.NewStyle().Foreground(subtextColor)
	h.ShortSeparator = " · "
	h.FullSeparator = "   "
	return HelpOverlay{help: h}
}

// SetWidth updates the help width for responsive layout.
func (h *HelpOverlay) SetWidth(w int) {
	h.help.Width = w
}

// Toggle flips between short and full help.
func (h *HelpOverlay) Toggle() {
	h.showAll = !h.showAll
}

// IsShowingAll returns whether the full help overlay is displayed.
func (h *HelpOverlay) IsShowingAll() bool {
	return h.showAll
}

// Hide closes the full help view.
func (h *HelpOverlay) Hide() {
	h.showAll = false
}

// ShortView renders the compact footer help bar.
func (h HelpOverlay) ShortView(bindings []key.Binding) string {
	return h.help.ShortHelpView(bindings)
}

// FullView renders the expanded help overlay with columns.
func (h HelpOverlay) FullView(groups [][]key.Binding) string {
	return h.help.FullHelpView(groups)
}

// View renders either short or full help depending on state.
func (h HelpOverlay) View(km interface {
	ShortHelp() []key.Binding
	FullHelp() [][]key.Binding
}) string {
	if h.showAll {
		return h.FullView(km.FullHelp())
	}
	return h.ShortView(km.ShortHelp())
}
