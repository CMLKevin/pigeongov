package tui

import "github.com/charmbracelet/bubbles/key"

// KeyMap defines every keybinding PigeonGov's TUI understands.
// Short help is always visible in the footer; full help appears on '?'.
type KeyMap struct {
	Quit       key.Binding
	Back       key.Binding
	Confirm    key.Binding
	Help       key.Binding
	Jump       key.Binding
	Switch     key.Binding
	Save       key.Binding
	Export     key.Binding
	Search     key.Binding
	TogglePane key.Binding
	NextField  key.Binding
	PrevField  key.Binding
}

// DefaultKeyMap returns the canonical set of bindings.
func DefaultKeyMap() KeyMap {
	return KeyMap{
		Quit: key.NewBinding(
			key.WithKeys("ctrl+c"),
			key.WithHelp("ctrl+c", "quit"),
		),
		Back: key.NewBinding(
			key.WithKeys("esc"),
			key.WithHelp("esc", "back"),
		),
		Confirm: key.NewBinding(
			key.WithKeys("enter"),
			key.WithHelp("enter", "confirm"),
		),
		Help: key.NewBinding(
			key.WithKeys("?"),
			key.WithHelp("?", "help"),
		),
		Jump: key.NewBinding(
			key.WithKeys("ctrl+g"),
			key.WithHelp("ctrl+g", "jump to section"),
		),
		Switch: key.NewBinding(
			key.WithKeys("ctrl+w"),
			key.WithHelp("ctrl+w", "switch pane"),
		),
		Save: key.NewBinding(
			key.WithKeys("ctrl+s"),
			key.WithHelp("ctrl+s", "save"),
		),
		Export: key.NewBinding(
			key.WithKeys("ctrl+e"),
			key.WithHelp("ctrl+e", "export"),
		),
		Search: key.NewBinding(
			key.WithKeys("/"),
			key.WithHelp("/", "search"),
		),
		TogglePane: key.NewBinding(
			key.WithKeys("ctrl+p"),
			key.WithHelp("ctrl+p", "toggle inspector"),
		),
		NextField: key.NewBinding(
			key.WithKeys("tab"),
			key.WithHelp("tab", "next field"),
		),
		PrevField: key.NewBinding(
			key.WithKeys("shift+tab"),
			key.WithHelp("shift+tab", "prev field"),
		),
	}
}

// ShortHelp returns the bindings shown in the footer bar.
func (k KeyMap) ShortHelp() []key.Binding {
	return []key.Binding{k.Confirm, k.Back, k.Help, k.Quit}
}

// FullHelp returns grouped bindings for the expanded help overlay.
func (k KeyMap) FullHelp() [][]key.Binding {
	return [][]key.Binding{
		{k.Confirm, k.Back, k.Quit},
		{k.NextField, k.PrevField, k.Search},
		{k.Jump, k.Switch, k.TogglePane},
		{k.Save, k.Export, k.Help},
	}
}
