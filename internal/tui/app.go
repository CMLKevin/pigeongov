package tui

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"
	"pigeongov/internal/tui/components"
)

// ---- stages ----

type stage int

const (
	stageWorkflowSelect stage = iota
	stageWorkflowSection
	stagePreviewLoading
	stagePreview
	stageSaving
	stageDone
)

// ---- messages ----

type previewMsg struct {
	preview LegacyPreview
}

type descriptorMsg struct {
	descriptor WorkflowDescriptor
}

type catalogMsg struct {
	catalog []WorkflowCatalogItem
}

type savedMsg struct {
	paths   []string
	preview LegacyPreview
}

type errMsg struct {
	err error
}

// statusMsg displays a transient status line (e.g. "Draft saved").
type statusMsg struct {
	text string
}

// ---- overlay state ----

type overlayKind int

const (
	overlayNone overlayKind = iota
	overlayHelp
	overlayConfetti
)

// ---- Model ----

type Model struct {
	// Core
	rootPath      string
	stage         stage
	width         int
	height        int
	startTime     time.Time

	// Workflow data
	catalog       []WorkflowCatalogItem
	selectedID    string
	descriptor    *WorkflowDescriptor
	sectionIndex  int
	sectionState  SectionState
	draft         Draft
	form          *huh.Form
	preview       *LegacyPreview
	saved         []string
	err           error
	preselectedID string

	// Theme & accessibility
	theme         Theme
	accessibility AccessibilityConfig
	styles        Styles
	keys          KeyMap

	// Components
	spinnerOverlay components.SpinnerOverlay
	progressPanel  components.ProgressPanel
	helpOverlay    components.HelpOverlay
	confetti       components.ConfettiModel
	workflowList   components.WorkflowListModel
	reviewViewport components.ReviewViewport

	// Animation
	anim    AnimationState
	overlay overlayKind

	// Inspector visibility
	showInspector bool

	// Transient status text
	statusText string
}

func newModel(
	rootPath string,
	draft Draft,
	preselectedID string,
	theme Theme,
	acc AccessibilityConfig,
) Model {
	styles := buildStyles(theme)
	keys := DefaultKeyMap()
	now := time.Now()

	m := Model{
		rootPath:      rootPath,
		stage:         stageWorkflowSelect,
		draft:         draft,
		preselectedID: normalizeWorkflowID(preselectedID),
		startTime:     now,

		theme:         theme,
		accessibility: acc,
		styles:        styles,
		keys:          keys,

		spinnerOverlay: components.NewSpinnerOverlay(
			"Loading workflows...",
			theme.Primary,
			acc.Accessible,
		),
		progressPanel: components.NewProgressPanel(
			string(theme.Primary), string(theme.Secondary), 26,
		),
		helpOverlay: components.NewHelpOverlay(80, theme.Text, theme.Subtext),
		workflowList: components.NewWorkflowListModel(
			theme.Primary, theme.Secondary, theme.Text, theme.Subtext,
			theme.DomainColor,
		),
		reviewViewport: components.NewReviewViewport(60, 20, theme.Secondary, theme.Subtext),

		anim:          NewAnimationState(!acc.ShouldAnimate()),
		showInspector: true,
	}
	return m
}

// ---- Entry point ----

func Run(args []string) error {
	fs := flag.NewFlagSet("pigeongov", flag.ContinueOnError)
	formID := fs.String("form", "", "Workflow to open")
	outputDir := fs.String("output", ".", "Default output directory")
	format := fs.String("format", "json", "Default output format")
	accessible := fs.Bool("accessible", false, "Enable screen-reader friendly prompts")
	noAltScreen := fs.Bool("no-alt-screen", false, "Disable full-screen mode")
	cwd := fs.String("cwd", "", "Working directory for the Node backend")
	themeFlag := fs.String("theme", "", "Color theme: dark, light, or auto")
	highContrast := fs.Bool("high-contrast", false, "Use 4-bit ANSI colors only")
	reduceMotion := fs.Bool("reduce-motion", false, "Disable all animations")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return err
	}

	root := *cwd
	if root == "" {
		var err error
		root, err = os.Getwd()
		if err != nil {
			return err
		}
	}

	draft := Draft{
		OutputDir: *outputDir,
		Format:    *format,
		Data:      map[string]any{},
	}

	theme := DetectTheme(*themeFlag, *highContrast)
	acc := NewAccessibilityConfig(*accessible, *highContrast, *reduceMotion)

	model := newModel(root, draft, *formID, theme, acc)

	opts := []tea.ProgramOption{
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
		tea.WithReportFocus(),
	}
	if *noAltScreen {
		opts = []tea.ProgramOption{
			tea.WithMouseCellMotion(),
			tea.WithReportFocus(),
		}
	}

	program := tea.NewProgram(model, opts...)
	finalModel, err := program.Run()
	if err != nil {
		return err
	}
	if m, ok := finalModel.(Model); ok && m.err != nil {
		return m.err
	}
	return nil
}

// ---- Bubble Tea interface ----

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		m.loadCatalogCmd(),
		m.spinnerOverlay.Init(),
		tickCmd(),
	)
}

func (m Model) loadCatalogCmd() tea.Cmd {
	return func() tea.Msg {
		catalog, err := fetchWorkflowCatalog(context.Background(), m.rootPath)
		if err != nil {
			return errMsg{err: err}
		}
		return catalogMsg{catalog: catalog}
	}
}

func (m Model) loadDescriptorCmd(workflowID string) tea.Cmd {
	return func() tea.Msg {
		descriptor, err := fetchWorkflowDescriptor(context.Background(), m.rootPath, workflowID)
		if err != nil {
			return errMsg{err: err}
		}
		return descriptorMsg{descriptor: descriptor}
	}
}

func (m Model) loadPreviewCmd() tea.Cmd {
	return func() tea.Msg {
		preview, err := runWorkflowPreview(context.Background(), m.rootPath, m.draft)
		if err != nil {
			return errMsg{err: err}
		}
		return previewMsg{preview: preview}
	}
}

func (m Model) saveCmd() tea.Cmd {
	return func() tea.Msg {
		saved, preview, err := saveWorkflow(context.Background(), m.rootPath, m.draft)
		if err != nil {
			return errMsg{err: err}
		}
		return savedMsg{paths: saved, preview: preview}
	}
}

// ---- Update ----

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.helpOverlay.SetWidth(msg.Width - 4)
		m.progressPanel.SetWidth(26)
		m.workflowList.SetSize(msg.Width-8, msg.Height-10)
		m.reviewViewport.SetSize(msg.Width-12, msg.Height-14)
		return m, nil

	case tickMsg:
		// Advance animation springs
		m.anim.AnimateFrame()
		if m.anim.animating {
			cmds = append(cmds, tickCmd())
		}
		// Update spinner
		var spinCmd tea.Cmd
		m.spinnerOverlay, spinCmd = m.spinnerOverlay.Update(msg)
		if spinCmd != nil {
			cmds = append(cmds, spinCmd)
		}
		return m, tea.Batch(cmds...)

	case components.ConfettiTickMsg:
		// Matched here; falls through to the confetti forwarding path below

	case statusMsg:
		m.statusText = msg.text
		return m, nil

	case tea.KeyMsg:
		// Global key handling
		switch {
		case key.Matches(msg, m.keys.Quit):
			return m, tea.Quit
		case key.Matches(msg, m.keys.Back):
			if m.overlay == overlayHelp {
				m.overlay = overlayNone
				m.helpOverlay.Hide()
				return m, nil
			}
			return m, tea.Quit
		case key.Matches(msg, m.keys.Help):
			if m.overlay == overlayHelp {
				m.overlay = overlayNone
				m.helpOverlay.Hide()
			} else {
				m.overlay = overlayHelp
				m.helpOverlay.Toggle()
			}
			return m, nil
		case key.Matches(msg, m.keys.TogglePane):
			m.showInspector = !m.showInspector
			return m, nil

		// Ctrl+G — jump to next section (cycles)
		case key.Matches(msg, m.keys.Jump):
			if m.stage == stageWorkflowSection && m.descriptor != nil && len(m.descriptor.Sections) > 0 {
				if m.sectionIndex < len(m.descriptor.Sections) {
					commitSectionState(&m.draft, m.descriptor.Sections[m.sectionIndex], m.sectionState)
				}
				m.sectionIndex = (m.sectionIndex + 1) % len(m.descriptor.Sections)
				target := float64(m.sectionIndex+1) / float64(len(m.descriptor.Sections))
				m.anim.StartProgressAnimation(target)
				m.anim.StartFadeIn()
				model, cmd := m.prepareSection()
				return model, tea.Batch(cmd, tickCmd())
			}
			return m, nil

		// Ctrl+S — save draft
		case key.Matches(msg, m.keys.Save):
			if m.stage == stageWorkflowSection || m.stage == stagePreview {
				rootPath := m.rootPath
				draft := m.draft
				return m, func() tea.Msg {
					_, _, err := saveWorkflow(context.Background(), rootPath, draft)
					if err != nil {
						return statusMsg{text: "Draft save failed: " + err.Error()}
					}
					return statusMsg{text: "Draft saved"}
				}
			}
			return m, nil

		// / — activate search filter on workflow list
		case key.Matches(msg, m.keys.Search):
			if m.stage == stageWorkflowSelect && m.workflowList.Ready() {
				m.workflowList.SetFilterState(list.Filtering)
				return m, nil
			}
		}

		// Forward keys to WorkflowList during workflow selection
		if m.stage == stageWorkflowSelect && m.workflowList.Ready() {
			if key.Matches(msg, m.keys.Confirm) {
				if selected := m.workflowList.SelectedItem(); selected != nil {
					m.selectedID = selected.ID
					m.spinnerOverlay.SetMessage("Loading " + m.selectedID + "...")
					return m, m.loadDescriptorCmd(m.selectedID)
				}
			}
			cmd := m.workflowList.Update(msg)
			return m, cmd
		}

		// Forward scroll events to review viewport during preview
		if m.stage == stagePreview {
			cmd := m.reviewViewport.Update(msg)
			if cmd != nil {
				cmds = append(cmds, cmd)
			}
		}

	case catalogMsg:
		m.catalog = msg.catalog
		if len(m.catalog) == 0 {
			m.err = fmt.Errorf("no workflows available")
			return m, tea.Quit
		}
		// Slide the workflow list in from the left on first load
		m.anim.StartSlideIn()
		m.anim.StartFadeIn()
		cmds = append(cmds, tickCmd())
		if m.preselectedID != "" {
			m.selectedID = m.preselectedID
			m.spinnerOverlay.SetMessage("Loading " + m.selectedID + "...")
			cmds = append(cmds, m.loadDescriptorCmd(m.selectedID))
			return m, tea.Batch(cmds...)
		}
		m.selectedID = m.catalog[0].ID
		m.workflowList.SetItems(catalogToListItems(m.catalog))
		m.workflowList.SetSize(m.width-8, m.height-10)
		return m, tea.Batch(cmds...)

	case descriptorMsg:
		descriptor := msg.descriptor
		m.descriptor = &descriptor
		m.draft.WorkflowID = descriptor.ID
		m.draft.Data = cloneMap(descriptor.StarterData)
		m.sectionIndex = 0
		m.stage = stageWorkflowSection
		m.preview = nil
		m.anim.StartFadeIn()
		if len(descriptor.Sections) > 0 {
			m.anim.StartProgressAnimation(1.0 / float64(len(descriptor.Sections)))
		}
		cmds = append(cmds, tickCmd())
		model, cmd := m.prepareSection()
		cmds = append(cmds, cmd)
		return model, tea.Batch(cmds...)

	case previewMsg:
		m.preview = &msg.preview
		m.stage = stagePreview
		m.form = newSaveForm(&m.draft, m.accessibility.Accessible)
		m.anim.StartFadeIn()
		// Populate the review viewport with preview content
		m.reviewViewport.SetContent(renderPreviewContent(m.styles, msg.preview))
		// Cascade: progress bar fills to 1.0 first, then refund counter ticks up
		if refund, ok := m.preview.Derived["estimatedRefund"]; ok {
			if val, ok := refund.(float64); ok {
				m.anim.StartCascade(1.0, val)
			}
		}
		cmds = append(cmds, m.form.Init(), tickCmd())
		return m, tea.Batch(cmds...)

	case savedMsg:
		m.saved = msg.paths
		m.preview = &msg.preview
		m.stage = stageDone
		// Fire confetti if accessibility allows
		if m.accessibility.ShouldShowConfetti() && m.width > 0 && m.height > 0 {
			m.confetti = components.NewConfettiModel(m.width, m.height)
			m.overlay = overlayConfetti
			cmds = append(cmds, components.ConfettiTickCmd())
		}
		return m, tea.Batch(cmds...)

	case errMsg:
		m.err = msg.err
		m.stage = stageDone
		m.anim.StartShake()
		cmds = append(cmds, tickCmd())
		return m, tea.Batch(cmds...)
	}

	// Forward confetti ticks
	if m.overlay == overlayConfetti {
		var confettiCmd tea.Cmd
		m.confetti, confettiCmd = m.confetti.Update(msg)
		if confettiCmd != nil {
			cmds = append(cmds, confettiCmd)
		}
		if !m.confetti.IsActive() {
			m.overlay = overlayNone
		}
	}

	// Forward mouse/resize events to WorkflowList when active
	if m.stage == stageWorkflowSelect && m.workflowList.Ready() {
		cmd := m.workflowList.Update(msg)
		if cmd != nil {
			cmds = append(cmds, cmd)
		}
	}

	// Forward mouse/scroll events to ReviewViewport when in preview
	if m.stage == stagePreview {
		cmd := m.reviewViewport.Update(msg)
		if cmd != nil {
			cmds = append(cmds, cmd)
		}
	}

	// Forward to active form
	if m.form != nil {
		updated, cmd := m.form.Update(msg)
		if form, ok := updated.(*huh.Form); ok {
			m.form = form
		}

		if m.form.State == huh.StateCompleted {
			return m.advance()
		}

		if cmd != nil {
			cmds = append(cmds, cmd)
		}
		return m, tea.Batch(cmds...)
	}

	return m, tea.Batch(cmds...)
}

func (m Model) prepareSection() (tea.Model, tea.Cmd) {
	if m.descriptor == nil {
		return m, nil
	}
	if m.sectionIndex >= len(m.descriptor.Sections) {
		m.stage = stagePreviewLoading
		m.spinnerOverlay.SetMessage("Generating workflow preview...")
		m.anim.StartProgressAnimation(1.0)
		return m, tea.Batch(m.loadPreviewCmd(), tickCmd())
	}

	section := m.descriptor.Sections[m.sectionIndex]
	m.sectionState = newSectionState(section, m.draft)
	m.form = newSectionForm(section, &m.sectionState, m.accessibility.Accessible)
	return m, m.form.Init()
}

func (m Model) advance() (tea.Model, tea.Cmd) {
	switch m.stage {
	case stageWorkflowSelect:
		m.spinnerOverlay.SetMessage("Loading " + m.selectedID + "...")
		return m, m.loadDescriptorCmd(m.selectedID)
	case stageWorkflowSection:
		if m.descriptor != nil && m.sectionIndex < len(m.descriptor.Sections) {
			commitSectionState(&m.draft, m.descriptor.Sections[m.sectionIndex], m.sectionState)
		}
		m.sectionIndex++
		// Animate progress
		if m.descriptor != nil && len(m.descriptor.Sections) > 0 {
			target := float64(m.sectionIndex+1) / float64(len(m.descriptor.Sections))
			if target > 1.0 {
				target = 1.0
			}
			m.anim.StartProgressAnimation(target)
		}
		m.anim.StartFadeIn()
		model, cmd := m.prepareSection()
		return model, tea.Batch(cmd, tickCmd())
	case stagePreview:
		m.stage = stageSaving
		m.form = nil
		m.spinnerOverlay.SetMessage("Saving workflow bundle...")
		return m, m.saveCmd()
	}
	return m, nil
}

// ---- View ----

func (m Model) stageLabel() string {
	switch m.stage {
	case stageWorkflowSelect:
		return "workflow-select"
	case stageWorkflowSection:
		return "guided-intake"
	case stagePreviewLoading:
		return "building-preview"
	case stagePreview:
		return "review-and-save"
	case stageSaving:
		return "saving"
	default:
		return "done"
	}
}

func (m Model) mainPaneContent() string {
	s := m.styles

	switch m.stage {
	case stageWorkflowSelect:
		if m.workflowList.Ready() {
			return m.workflowList.View()
		}
		return m.spinnerOverlay.View()

	case stageWorkflowSection:
		if m.form != nil && m.descriptor != nil && m.sectionIndex < len(m.descriptor.Sections) {
			section := m.descriptor.Sections[m.sectionIndex]
			body := []string{
				s.Accent.Render(section.Title),
			}
			if section.Description != "" {
				body = append(body, s.Subtitle.Render(section.Description), "")
			}
			body = append(body, m.form.View())
			return strings.Join(body, "\n")
		}
		return m.spinnerOverlay.View()

	case stagePreviewLoading:
		return m.spinnerOverlay.View()

	case stagePreview:
		parts := []string{m.reviewViewport.View()}
		if m.form != nil {
			parts = append(parts, m.form.View())
		}
		return strings.Join(parts, "\n\n")

	case stageSaving:
		return m.spinnerOverlay.View()

	case stageDone:
		if m.err != nil {
			return renderErrorContent(s, m.err)
		}
		return renderSavedContent(s, m.saved)
	}
	return ""
}

func (m Model) View() string {
	s := m.styles

	// Header
	headerView := renderHeader(s, m.descriptor, m.stageLabel())

	// Help footer (include status text if present)
	helpView := m.helpOverlay.View(&m.keys)
	if m.statusText != "" {
		helpView = s.Ok.Render(m.statusText) + "  " + helpView
	}
	footerView := renderFooter(s, helpView, m.startTime)

	// Rail
	railContent := renderWorkflowRailContent(s, m.catalog, m.selectedID, m.theme)

	// Main
	mainContent := m.mainPaneContent()

	// Apply shake offset to main content on error
	if offset := m.anim.ShakeOffset(); offset != 0 {
		pad := strings.Repeat(" ", abs(offset))
		mainContent = pad + mainContent
	}

	// Apply slide-in offset: pad from left when offset is negative (entering)
	if slideOffset := m.anim.SlideInOffset(); slideOffset < 0 {
		pad := strings.Repeat(" ", -slideOffset)
		// Indent every line so the whole pane slides in
		lines := strings.Split(mainContent, "\n")
		for i, line := range lines {
			lines[i] = pad + line
		}
		mainContent = strings.Join(lines, "\n")
	}

	// Inspector
	inspectorContent := ""
	if m.showInspector {
		inspectorContent = renderInspectorContent(
			s,
			m.descriptor,
			m.preview,
			m.stageLabel(),
			clampInt(m.sectionIndex+1, 1, maxInt(1, lenSection(m.descriptor))),
			maxInt(1, lenSection(m.descriptor)),
			m.progressPanel,
			&m.anim,
		)
	}

	// Layout
	body := layoutThreePanes(s, railContent, mainContent, inspectorContent, m.width, m.height)

	// Full help overlay replaces the body
	if m.overlay == overlayHelp {
		body = m.helpOverlay.FullView(m.keys.FullHelp())
	}

	// Confetti overlay composited on top
	confettiView := ""
	if m.overlay == overlayConfetti {
		confettiView = m.confetti.View()
	}

	view := lipgloss.JoinVertical(lipgloss.Left,
		headerView,
		"",
		body,
		"",
		footerView,
	)

	// Composite confetti on top if active
	if confettiView != "" {
		// The confetti is rendered as a full-screen layer; for simplicity
		// we append it below the main view in the terminal buffer.
		view = view + "\n" + confettiView
	}

	return view
}

// ---- helpers ----

func lenSection(descriptor *WorkflowDescriptor) int {
	if descriptor == nil {
		return 0
	}
	return len(descriptor.Sections)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// catalogToListItems converts catalog entries to WorkflowItems for the list component.
func catalogToListItems(catalog []WorkflowCatalogItem) []components.WorkflowItem {
	items := make([]components.WorkflowItem, len(catalog))
	for i, c := range catalog {
		items[i] = components.WorkflowItem{
			ID:      c.ID,
			Domain:  c.Domain,
			Title:   c.Title,
			Summary: c.Summary,
			Status:  c.Status,
			Tags:    c.Tags,
		}
	}
	return items
}
