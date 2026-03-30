package components

import (
	"fmt"
	"io"
	"strings"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// WorkflowItem wraps a catalog entry to satisfy list.Item.
type WorkflowItem struct {
	ID      string
	Domain  string
	Title   string
	Summary string
	Status  string
	Tags    []string
}

func (w WorkflowItem) FilterValue() string {
	return w.Title + " " + w.Domain + " " + strings.Join(w.Tags, " ")
}

// WorkflowSelectedMsg is emitted when the user picks a workflow.
type WorkflowSelectedMsg struct {
	ID string
}

// WorkflowDelegate renders each workflow as a coloured card.
type WorkflowDelegate struct {
	Styles WorkflowDelegateStyles
}

// WorkflowDelegateStyles holds the computed lipgloss styles for the delegate.
type WorkflowDelegateStyles struct {
	NormalTitle lipgloss.Style
	NormalDesc  lipgloss.Style
	SelectedTitle lipgloss.Style
	SelectedDesc  lipgloss.Style
	DomainBadge   func(domain string) lipgloss.Style
}

// NewWorkflowDelegateStyles creates delegate styles from theme colours.
func NewWorkflowDelegateStyles(
	primary, secondary, text, subtext lipgloss.Color,
	domainColor func(string) lipgloss.Color,
) WorkflowDelegateStyles {
	return WorkflowDelegateStyles{
		NormalTitle: lipgloss.NewStyle().
			Foreground(text).
			Padding(0, 0, 0, 2),
		NormalDesc: lipgloss.NewStyle().
			Foreground(subtext).
			Padding(0, 0, 0, 2),
		SelectedTitle: lipgloss.NewStyle().
			Foreground(primary).
			Bold(true).
			Padding(0, 0, 0, 1).
			Border(lipgloss.NormalBorder(), false, false, false, true).
			BorderForeground(primary),
		SelectedDesc: lipgloss.NewStyle().
			Foreground(secondary).
			Padding(0, 0, 0, 1).
			Border(lipgloss.NormalBorder(), false, false, false, true).
			BorderForeground(primary),
		DomainBadge: func(domain string) lipgloss.Style {
			return lipgloss.NewStyle().
				Foreground(lipgloss.Color("#1e1e2e")).
				Background(domainColor(domain)).
				Padding(0, 1).
				Bold(true)
		},
	}
}

func NewWorkflowDelegate(styles WorkflowDelegateStyles) WorkflowDelegate {
	return WorkflowDelegate{Styles: styles}
}

func (d WorkflowDelegate) Height() int  { return 3 }
func (d WorkflowDelegate) Spacing() int { return 1 }

func (d WorkflowDelegate) Update(_ tea.Msg, _ *list.Model) tea.Cmd { return nil }

func (d WorkflowDelegate) Render(w io.Writer, m list.Model, index int, item list.Item) {
	wf, ok := item.(WorkflowItem)
	if !ok {
		return
	}

	isSelected := index == m.Index()

	badge := d.Styles.DomainBadge(wf.Domain).Render(wf.Domain)

	statusPill := renderStatusPill(wf.Status)

	var title, desc string
	if isSelected {
		title = d.Styles.SelectedTitle.Render(badge + " " + wf.Title + " " + statusPill)
		desc = d.Styles.SelectedDesc.Render(wf.Summary)
	} else {
		title = d.Styles.NormalTitle.Render(badge + " " + wf.Title + " " + statusPill)
		desc = d.Styles.NormalDesc.Render(wf.Summary)
	}

	fmt.Fprintf(w, "%s\n%s", title, desc)
}

func renderStatusPill(status string) string {
	var fg, bg lipgloss.Color
	switch status {
	case "stable":
		fg = lipgloss.Color("#1e1e2e")
		bg = lipgloss.Color("#a6e3a1")
	case "beta":
		fg = lipgloss.Color("#1e1e2e")
		bg = lipgloss.Color("#f9e2af")
	case "draft":
		fg = lipgloss.Color("#1e1e2e")
		bg = lipgloss.Color("#89b4fa")
	default:
		fg = lipgloss.Color("#cdd6f4")
		bg = lipgloss.Color("#585b70")
	}
	return lipgloss.NewStyle().
		Foreground(fg).
		Background(bg).
		Padding(0, 1).
		Render(status)
}

// WorkflowListModel wraps a bubbles/list for workflow selection with
// domain badges, fuzzy filtering, and status pills. It owns the list
// lifecycle so the parent Model only needs to forward messages.
type WorkflowListModel struct {
	list       list.Model
	styles     WorkflowDelegateStyles
	ready      bool
	titleColor lipgloss.Color
}

// NewWorkflowListModel creates the wrapper. Items are populated later
// via SetItems once the catalog arrives from the backend.
func NewWorkflowListModel(
	primary, secondary, text, subtext lipgloss.Color,
	domainColor func(string) lipgloss.Color,
) WorkflowListModel {
	styles := NewWorkflowDelegateStyles(primary, secondary, text, subtext, domainColor)
	delegate := NewWorkflowDelegate(styles)

	// Start with an empty list; catalog arrives asynchronously.
	l := list.New(nil, delegate, 0, 0)
	l.Title = "Choose a Workflow"
	l.SetShowStatusBar(true)
	l.SetFilteringEnabled(true)
	l.SetShowHelp(false) // we render our own help
	l.Styles.Title = lipgloss.NewStyle().
		Bold(true).
		Foreground(primary).
		Padding(0, 0, 1, 0)

	return WorkflowListModel{
		list:       l,
		styles:     styles,
		titleColor: primary,
	}
}

// SetItems populates the list from a slice of WorkflowItems.
func (wl *WorkflowListModel) SetItems(items []WorkflowItem) {
	listItems := make([]list.Item, len(items))
	for i, item := range items {
		listItems[i] = item
	}
	wl.list.SetItems(listItems)
	wl.ready = true
}

// SetSize adjusts the list dimensions for the current terminal.
func (wl *WorkflowListModel) SetSize(width, height int) {
	wl.list.SetWidth(width)
	wl.list.SetHeight(height)
}

// Update forwards a message to the inner list.
func (wl *WorkflowListModel) Update(msg tea.Msg) tea.Cmd {
	var cmd tea.Cmd
	wl.list, cmd = wl.list.Update(msg)
	return cmd
}

// View renders the list.
func (wl WorkflowListModel) View() string {
	if !wl.ready {
		return ""
	}
	return wl.list.View()
}

// SelectedItem returns the currently highlighted WorkflowItem, or nil.
func (wl WorkflowListModel) SelectedItem() *WorkflowItem {
	item := wl.list.SelectedItem()
	if item == nil {
		return nil
	}
	wf, ok := item.(WorkflowItem)
	if !ok {
		return nil
	}
	return &wf
}

// SetFilterState sets the list's filter state (e.g. list.Filtering).
func (wl *WorkflowListModel) SetFilterState(state list.FilterState) {
	wl.list.SetFilterState(state)
}

// Ready reports whether items have been loaded.
func (wl WorkflowListModel) Ready() bool {
	return wl.ready
}

