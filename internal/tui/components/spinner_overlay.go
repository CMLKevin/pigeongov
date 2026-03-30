package components

import (
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// PigeonSpinner is a custom spinner with pigeon-themed frames.
// Falls back to spinner.Dot in accessible mode.
var PigeonSpinner = spinner.Spinner{
	Frames: []string{"🐦", "🕊️ ", "🐦‍⬛", "🪶 "},
	FPS:    time.Second / 4,
}

// SpinnerOverlay wraps a spinner.Model with a message and styling.
type SpinnerOverlay struct {
	spinner spinner.Model
	message string
	style   lipgloss.Style
}

// NewSpinnerOverlay creates a spinner overlay.
// In accessible mode it uses the simpler Dot spinner.
func NewSpinnerOverlay(message string, primaryColor lipgloss.Color, accessible bool) SpinnerOverlay {
	s := spinner.New()
	if accessible {
		s.Spinner = spinner.Dot
	} else {
		s.Spinner = PigeonSpinner
	}
	s.Style = lipgloss.NewStyle().Foreground(primaryColor)

	return SpinnerOverlay{
		spinner: s,
		message: message,
		style: lipgloss.NewStyle().
			Padding(1, 2).
			Foreground(primaryColor),
	}
}

// Init returns the spinner's initial command.
func (s SpinnerOverlay) Init() tea.Cmd {
	return s.spinner.Tick
}

// Update processes spinner tick messages.
func (s SpinnerOverlay) Update(msg tea.Msg) (SpinnerOverlay, tea.Cmd) {
	var cmd tea.Cmd
	s.spinner, cmd = s.spinner.Update(msg)
	return s, cmd
}

// View renders the spinner with its message.
func (s SpinnerOverlay) View() string {
	return s.style.Render(s.spinner.View() + "  " + s.message)
}

// SetMessage changes the displayed message.
func (s *SpinnerOverlay) SetMessage(msg string) {
	s.message = msg
}
