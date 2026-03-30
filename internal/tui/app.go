package tui

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/huh"
)

type stage int

const (
	stageWorkflowSelect stage = iota
	stageWorkflowSection
	stagePreviewLoading
	stagePreview
	stageSaving
	stageDone
)

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

type Model struct {
	rootPath       string
	accessible     bool
	stage          stage
	width          int
	height         int
	catalog        []WorkflowCatalogItem
	selectedID     string
	descriptor     *WorkflowDescriptor
	sectionIndex   int
	sectionState   SectionState
	draft          Draft
	form           *huh.Form
	preview        *LegacyPreview
	saved          []string
	err            error
	preselectedID  string
}

func newModel(rootPath string, accessible bool, draft Draft, preselectedID string) Model {
	return Model{
		rootPath:      rootPath,
		accessible:    accessible,
		stage:         stageWorkflowSelect,
		draft:         draft,
		preselectedID: normalizeWorkflowID(preselectedID),
	}
}

func Run(args []string) error {
	fs := flag.NewFlagSet("pigeongov", flag.ContinueOnError)
	formID := fs.String("form", "", "Workflow to open")
	outputDir := fs.String("output", ".", "Default output directory")
	format := fs.String("format", "json", "Default output format")
	accessible := fs.Bool("accessible", false, "Enable screen-reader friendly prompts")
	noAltScreen := fs.Bool("no-alt-screen", false, "Disable full-screen mode")
	cwd := fs.String("cwd", "", "Working directory for the Node backend")
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

	program := tea.NewProgram(newModel(root, *accessible, draft, *formID), tea.WithAltScreen())
	if *noAltScreen {
		program = tea.NewProgram(newModel(root, *accessible, draft, *formID))
	}

	finalModel, err := program.Run()
	if err != nil {
		return err
	}

	if model, ok := finalModel.(Model); ok && model.err != nil {
		return model.err
	}
	return nil
}

func (m Model) Init() tea.Cmd {
	return m.loadCatalogCmd()
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

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "esc":
			return m, tea.Quit
		}
	case catalogMsg:
		m.catalog = msg.catalog
		if len(m.catalog) == 0 {
			m.err = fmt.Errorf("no workflows available")
			return m, tea.Quit
		}
		if m.preselectedID != "" {
			m.selectedID = m.preselectedID
			return m, m.loadDescriptorCmd(m.selectedID)
		}
		m.selectedID = m.catalog[0].ID
		m.form = newWorkflowSelectionForm(m.catalog, &m.selectedID, m.accessible)
		return m, m.form.Init()
	case descriptorMsg:
		descriptor := msg.descriptor
		m.descriptor = &descriptor
		m.draft.WorkflowID = descriptor.ID
		m.draft.Data = cloneMap(descriptor.StarterData)
		m.sectionIndex = 0
		m.stage = stageWorkflowSection
		m.preview = nil
		return m.prepareSection()
	case previewMsg:
		m.preview = &msg.preview
		m.stage = stagePreview
		m.form = newSaveForm(&m.draft, m.accessible)
		return m, m.form.Init()
	case savedMsg:
		m.saved = msg.paths
		m.preview = &msg.preview
		m.stage = stageDone
		return m, tea.Quit
	case errMsg:
		m.err = msg.err
		m.stage = stageDone
		return m, tea.Quit
	}

	if m.form != nil {
		updated, cmd := m.form.Update(msg)
		if form, ok := updated.(*huh.Form); ok {
			m.form = form
		}

		if m.form.State == huh.StateCompleted {
			return m.advance()
		}

		return m, cmd
	}

	return m, nil
}

func (m Model) prepareSection() (tea.Model, tea.Cmd) {
	if m.descriptor == nil {
		return m, nil
	}
	if m.sectionIndex >= len(m.descriptor.Sections) {
		m.stage = stagePreviewLoading
		return m, m.loadPreviewCmd()
	}

	section := m.descriptor.Sections[m.sectionIndex]
	m.sectionState = newSectionState(section, m.draft)
	m.form = newSectionForm(section, &m.sectionState, m.accessible)
	return m, m.form.Init()
}

func (m Model) advance() (tea.Model, tea.Cmd) {
	switch m.stage {
	case stageWorkflowSelect:
		return m, m.loadDescriptorCmd(m.selectedID)
	case stageWorkflowSection:
		if m.descriptor != nil && m.sectionIndex < len(m.descriptor.Sections) {
			commitSectionState(&m.draft, m.descriptor.Sections[m.sectionIndex], m.sectionState)
		}
		m.sectionIndex++
		return m.prepareSection()
	case stagePreview:
		m.stage = stageSaving
		m.form = nil
		return m, m.saveCmd()
	}
	return m, nil
}

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

func (m Model) mainPane() string {
	switch m.stage {
	case stageWorkflowSelect:
		if m.form != nil {
			return mainStyle.Render(m.form.View())
		}
	case stageWorkflowSection:
		if m.form != nil && m.descriptor != nil && m.sectionIndex < len(m.descriptor.Sections) {
			section := m.descriptor.Sections[m.sectionIndex]
			body := []string{
				accentStyle.Render(section.Title),
			}
			if section.Description != "" {
				body = append(body, section.Description, "")
			}
			body = append(body, m.form.View())
			return mainStyle.Render(strings.Join(body, "\n"))
		}
	case stagePreviewLoading:
		return mainStyle.Render(statusStyle.Render("Generating a workflow preview..."))
	case stagePreview:
		parts := []string{}
		if m.preview != nil {
			parts = append(parts, renderPreview(*m.preview))
		}
		if m.form != nil {
			parts = append(parts, mainStyle.Render(m.form.View()))
		}
		return strings.Join(parts, "\n\n")
	case stageSaving:
		return mainStyle.Render(statusStyle.Render("Saving workflow bundle..."))
	case stageDone:
		if m.err != nil {
			return renderError(m.err)
		}
		return renderSaved(m.saved)
	}
	return ""
}

func (m Model) View() string {
	help := "Enter to continue, Ctrl+C to quit"
	if m.stage == stageWorkflowSection {
		help = "Enter to save this section, Ctrl+C to quit"
	}
	if m.stage == stagePreview {
		help = "Enter to save the packet bundle, Ctrl+C to quit"
	}

	return strings.Join([]string{
		header(),
		"",
		joinLayout(
			renderWorkflowRail(m.catalog, m.selectedID),
			m.mainPane(),
			renderInspector(
				m.descriptor,
				m.preview,
				m.stageLabel(),
				min(m.sectionIndex+1, max(1, lenSection(m.descriptor))),
				max(1, lenSection(m.descriptor)),
			),
		),
		"",
		footer(help),
	}, "\n")
}

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
