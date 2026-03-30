package tui

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"pigeongov/internal/tui/components"
)

// ---- Adaptive styles (rebuilt when theme or size changes) ----

// Styles holds all computed lipgloss styles, derived from the active Theme.
type Styles struct {
	// Layout panes
	Rail      lipgloss.Style
	Main      lipgloss.Style
	Inspector lipgloss.Style

	// Typography
	Title    lipgloss.Style
	Subtitle lipgloss.Style
	Accent   lipgloss.Style
	Status   lipgloss.Style
	Ok       lipgloss.Style
	Warn     lipgloss.Style
	Err      lipgloss.Style

	// Structural
	Header    lipgloss.Style
	Footer    lipgloss.Style
	Breadcrumb lipgloss.Style
	StagePill lipgloss.Style
}

// buildStyles creates every style from a Theme. Called once on init
// and again if the user toggles the theme.
func buildStyles(t Theme) Styles {
	border := lipgloss.RoundedBorder()
	panel := lipgloss.NewStyle().
		Border(border).
		BorderForeground(t.Overlay).
		Padding(1, 2)

	return Styles{
		Rail:      panel.Width(28),
		Main:      panel,
		Inspector: panel.Width(34),

		Title: lipgloss.NewStyle().
			Bold(true).
			Foreground(t.Primary),
		Subtitle: lipgloss.NewStyle().
			Foreground(t.Subtext),
		Accent: lipgloss.NewStyle().
			Foreground(t.Secondary).
			Bold(true),
		Status: lipgloss.NewStyle().
			Foreground(t.Overlay),
		Ok: lipgloss.NewStyle().
			Foreground(t.Success),
		Warn: lipgloss.NewStyle().
			Foreground(t.Warning),
		Err: lipgloss.NewStyle().
			Foreground(t.Error),

		Header: lipgloss.NewStyle().
			Padding(0, 1),
		Footer: lipgloss.NewStyle().
			Padding(0, 1).
			Foreground(t.Subtext),
		Breadcrumb: lipgloss.NewStyle().
			Foreground(t.Subtext).
			Italic(true),
		StagePill: lipgloss.NewStyle().
			Foreground(t.Surface0).
			Background(t.Info).
			Padding(0, 1).
			Bold(true),
	}
}

// ---- Header / Footer ----

func renderHeader(s Styles, descriptor *WorkflowDescriptor, stageLabel string) string {
	title := s.Title.Render("PigeonGov")
	sub := s.Subtitle.Render("Local-first government forms workspace")

	var breadcrumb string
	if descriptor != nil {
		breadcrumb = s.Breadcrumb.Render(
			fmt.Sprintf(" > %s > %s", descriptor.Domain, descriptor.Title),
		)
	}

	pill := s.StagePill.Render(stageLabel)

	left := lipgloss.JoinVertical(lipgloss.Left, title+breadcrumb, sub)
	return lipgloss.JoinHorizontal(lipgloss.Top, left, "  ", pill)
}

func renderFooter(s Styles, helpView string, startTime time.Time) string {
	elapsed := time.Since(startTime).Truncate(time.Second)
	timer := s.Status.Render(fmt.Sprintf("Session: %s", elapsed))
	return s.Footer.Render(
		lipgloss.JoinHorizontal(lipgloss.Top, helpView, "    ", timer),
	)
}

// ---- Three-pane layout ----

// layoutThreePanes arranges rail | main | inspector, collapsing
// side panes when terminal width < 80.
func layoutThreePanes(s Styles, rail, main, inspector string, width, height int) string {
	// Reserve space for header (3 lines) + footer (2 lines) + gaps (2)
	contentHeight := height - 7
	if contentHeight < 5 {
		contentHeight = 5
	}

	narrow := width < 80
	veryNarrow := width < 50

	if veryNarrow {
		// Single pane: just the main content
		return lipgloss.NewStyle().
			Width(width - 2).
			MaxHeight(contentHeight).
			Render(main)
	}

	if narrow {
		// Two panes: main + inspector
		mainWidth := width - 38
		if mainWidth < 20 {
			mainWidth = 20
		}
		mainPane := s.Main.Width(mainWidth).MaxHeight(contentHeight).Render(main)
		inspPane := s.Inspector.MaxHeight(contentHeight).Render(inspector)
		return lipgloss.JoinHorizontal(lipgloss.Top, mainPane, "  ", inspPane)
	}

	// Full three-pane layout
	mainWidth := width - 28 - 34 - 8 // rail + inspector + gaps + borders
	if mainWidth < 30 {
		mainWidth = 30
	}

	railPane := s.Rail.MaxHeight(contentHeight).Render(rail)
	mainPane := s.Main.Width(mainWidth).MaxHeight(contentHeight).Render(main)
	inspPane := s.Inspector.MaxHeight(contentHeight).Render(inspector)

	return lipgloss.JoinHorizontal(lipgloss.Top,
		railPane, "  ", mainPane, "  ", inspPane,
	)
}

// ---- Rail content ----

func renderWorkflowRailContent(s Styles, catalog []WorkflowCatalogItem, selected string, theme Theme) string {
	lines := []string{s.Accent.Render("Workflows"), ""}
	for _, item := range catalog {
		badge := lipgloss.NewStyle().
			Foreground(lipgloss.Color("#1e1e2e")).
			Background(theme.DomainColor(item.Domain)).
			Padding(0, 1).
			Bold(true).
			Render(item.Domain)

		line := badge + " " + item.Title
		if item.ID == selected {
			line = s.Accent.Render("> ") + line
		}
		lines = append(lines, line)
	}
	return strings.Join(lines, "\n")
}

// ---- Inspector content ----

func renderInspectorContent(
	s Styles,
	descriptor *WorkflowDescriptor,
	preview *LegacyPreview,
	stageLabel string,
	sectionIndex, sectionCount int,
	progressPanel components.ProgressPanel,
	anim *AnimationState,
) string {
	lines := []string{s.Accent.Render("Inspector"), ""}

	if descriptor != nil {
		lines = append(lines,
			fmt.Sprintf("Workflow: %s", descriptor.Title),
			fmt.Sprintf("Domain: %s", descriptor.Domain),
			fmt.Sprintf("Status: %s", descriptor.Status),
			"",
		)

		// Animated progress bar
		if sectionCount > 0 {
			lines = append(lines,
				progressPanel.View(
					anim.ProgressPercent(),
					sectionIndex,
					sectionCount,
				),
				"",
			)
		}

		lines = append(lines,
			descriptor.Summary,
			"",
			s.Status.Render("Stage: "+stageLabel),
		)

		// Animated refund counter if present
		if anim.RefundValue() != 0 {
			lines = append(lines,
				"",
				s.Ok.Render(fmt.Sprintf("Estimated refund: $%.2f", anim.RefundValue())),
			)
		}
	}

	if preview != nil {
		lines = append(lines, "", s.Accent.Render("Flags"))
		if len(preview.Validation.FlaggedFields) == 0 {
			lines = append(lines, s.Ok.Render("No flagged fields"))
		} else {
			for _, flag := range preview.Validation.FlaggedFields {
				style := s.Warn
				if flag.Severity == "error" {
					style = s.Err
				}
				lines = append(lines, style.Render(
					fmt.Sprintf("  %s: %s", flag.Field, flag.Message),
				))
			}
		}
	}

	return strings.Join(lines, "\n")
}

// ---- Preview / completion ----

func renderPreviewContent(s Styles, preview LegacyPreview) string {
	lines := []string{
		s.Accent.Render(preview.Review.Headline),
		"",
		"Review notes:",
	}
	for _, note := range preview.Review.Notes {
		lines = append(lines, "  "+s.Ok.Render("+")+note)
	}
	if len(preview.Derived) > 0 {
		lines = append(lines, "", s.Accent.Render("Derived values:"))
		for key, value := range preview.Derived {
			lines = append(lines, fmt.Sprintf("  %s: %v", key, value))
		}
	}
	return strings.Join(lines, "\n")
}

func renderSavedContent(s Styles, paths []string) string {
	lines := []string{s.Ok.Render("Saved files:")}
	for _, item := range paths {
		lines = append(lines, "  "+s.Ok.Render("+")+item)
	}
	return strings.Join(lines, "\n")
}

func renderErrorContent(s Styles, err error) string {
	return s.Err.Render(fmt.Sprintf("Error: %v", err))
}

// ---- Legacy compat (used by the old joinLayout calls) ----

var (
	pageBG         = lipgloss.Color("255")
	titleStyle     = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("31"))
	subtitleStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("245"))
	panelStyle     = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("240")).Padding(1, 2).Background(pageBG)
	railStyle      = panelStyle.Width(28)
	mainStyle      = panelStyle
	inspectorStyle = panelStyle.Width(34)
	accentStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("36")).Bold(true)
	okStyle        = lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	warnStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("214"))
	errStyle       = lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	statusStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
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
