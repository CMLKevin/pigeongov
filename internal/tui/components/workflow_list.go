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

// NewWorkflowList creates a configured bubbles/list for workflow selection.
func NewWorkflowList(items []WorkflowItem, styles WorkflowDelegateStyles, width, height int) list.Model {
	listItems := make([]list.Item, len(items))
	for i, item := range items {
		listItems[i] = item
	}

	delegate := NewWorkflowDelegate(styles)
	l := list.New(listItems, delegate, width, height)
	l.Title = "Choose a Workflow"
	l.SetShowStatusBar(true)
	l.SetFilteringEnabled(true)
	l.SetShowHelp(false) // we render our own help
	l.Styles.Title = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#89b4fa")).
		Padding(0, 0, 1, 0)
	return l
}
