package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	pageBG        = lipgloss.Color("255")
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("31"))
	subtitleStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("245"))
	panelStyle    = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("240")).Padding(1, 2).Background(pageBG)
	railStyle     = panelStyle.Copy().Width(28)
	mainStyle     = panelStyle.Copy()
	inspectorStyle = panelStyle.Copy().Width(34)
	accentStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("36")).Bold(true)
	okStyle       = lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	warnStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("214"))
	errStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	statusStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
)

func header() string {
	return lipgloss.JoinVertical(lipgloss.Left,
		titleStyle.Render("PigeonGov"),
		subtitleStyle.Render("Local-first government forms workspace"),
	)
}

func footer(help string) string {
	return subtitleStyle.Render(help)
}

func renderWorkflowRail(catalog []WorkflowCatalogItem, selected string) string {
	lines := []string{accentStyle.Render("Workflows"), ""}
	for _, item := range catalog {
		line := fmt.Sprintf("%s · %s", item.Domain, item.Title)
		if item.ID == selected {
			line = accentStyle.Render("> " + line)
		}
		lines = append(lines, line)
	}
	return railStyle.Render(strings.Join(lines, "\n"))
}

func renderInspector(descriptor *WorkflowDescriptor, preview *LegacyPreview, stageLabel string, sectionIndex, sectionCount int) string {
	lines := []string{accentStyle.Render("Inspector"), ""}
	if descriptor != nil {
		lines = append(lines,
			fmt.Sprintf("Workflow: %s", descriptor.Title),
			fmt.Sprintf("Domain: %s", descriptor.Domain),
			fmt.Sprintf("Status: %s", descriptor.Status),
			fmt.Sprintf("Progress: %d/%d", sectionIndex, sectionCount),
			"",
			descriptor.Summary,
			"",
			statusStyle.Render("Stage: "+stageLabel),
		)
	}

	if preview != nil {
		lines = append(lines, "", accentStyle.Render("Flags"))
		if len(preview.Validation.FlaggedFields) == 0 {
			lines = append(lines, okStyle.Render("No flagged fields"))
		} else {
			for _, flag := range preview.Validation.FlaggedFields {
				style := warnStyle
				if flag.Severity == "error" {
					style = errStyle
				}
				lines = append(lines, style.Render(fmt.Sprintf("• %s: %s", flag.Field, flag.Message)))
			}
		}
	}

	return inspectorStyle.Render(strings.Join(lines, "\n"))
}

func renderPreview(preview LegacyPreview) string {
	lines := []string{
		accentStyle.Render(preview.Review.Headline),
		"",
		"Review notes:",
	}
	for _, note := range preview.Review.Notes {
		lines = append(lines, "  • "+note)
	}
	if len(preview.Derived) > 0 {
		lines = append(lines, "", "Derived:")
		for key, value := range preview.Derived {
			lines = append(lines, fmt.Sprintf("  • %s: %v", key, value))
		}
	}
	return mainStyle.Render(strings.Join(lines, "\n"))
}

func renderSaved(paths []string) string {
	lines := []string{okStyle.Render("Saved files:")}
	for _, item := range paths {
		lines = append(lines, "  • "+item)
	}
	return mainStyle.Render(strings.Join(lines, "\n"))
}

func renderError(err error) string {
	return mainStyle.Render(errStyle.Render(fmt.Sprintf("Error: %v", err)))
}

func joinLayout(left, main, right string) string {
	return lipgloss.JoinHorizontal(lipgloss.Top, left, "  ", main, "  ", right)
}
