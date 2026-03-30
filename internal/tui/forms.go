package tui

import (
	"fmt"

	"github.com/charmbracelet/huh"
)

func newWorkflowSelectionForm(catalog []WorkflowCatalogItem, selected *string, accessible bool) *huh.Form {
	options := make([]huh.Option[string], 0, len(catalog))
	for _, item := range catalog {
		options = append(options, huh.NewOption(fmt.Sprintf("%s · %s", item.Domain, item.Title), item.ID))
	}

	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Choose a workflow").
				Options(options...).
				Value(selected),
		),
	)
	form.WithAccessible(accessible)
	return form
}

func newSectionState(section WorkflowSection, draft Draft) SectionState {
	state := SectionState{
		TextValues:   map[string]*string{},
		BoolValues:   map[string]*bool{},
		SelectValues: map[string]*string{},
	}

	for _, field := range section.Fields {
		switch field.Type {
		case "confirm":
			value := boolValue(getPath(draft.Data, field.Key))
			state.BoolValues[field.Key] = &value
		case "select":
			value := stringifyValue(getPath(draft.Data, field.Key))
			if value == "" && len(field.Options) > 0 {
				value = field.Options[0].Value
			}
			state.SelectValues[field.Key] = &value
		default:
			value := stringifyValue(getPath(draft.Data, field.Key))
			state.TextValues[field.Key] = &value
		}
	}

	return state
}

func newSectionForm(section WorkflowSection, state *SectionState, accessible bool) *huh.Form {
	fields := make([]huh.Field, 0, len(section.Fields))

	for _, field := range section.Fields {
		switch field.Type {
		case "confirm":
			fields = append(fields,
				huh.NewConfirm().
					Title(field.Label).
					Value(state.BoolValues[field.Key]),
			)
		case "select":
			options := make([]huh.Option[string], 0, len(field.Options))
			for _, option := range field.Options {
				options = append(options, huh.NewOption(option.Label, option.Value))
			}
			fields = append(fields,
				huh.NewSelect[string]().
					Title(field.Label).
					Options(options...).
					Value(state.SelectValues[field.Key]),
			)
		default:
			input := huh.NewInput().
				Title(field.Label).
				Value(state.TextValues[field.Key])
			if field.Placeholder != "" {
				input.Placeholder(field.Placeholder)
			}
			fields = append(fields, input)
		}
	}

	form := huh.NewForm(huh.NewGroup(fields...))
	form.WithAccessible(accessible)
	return form
}

func newSaveForm(draft *Draft, accessible bool) *huh.Form {
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Save format").
				Options(
					huh.NewOption("JSON", "json"),
					huh.NewOption("PDF", "pdf"),
					huh.NewOption("Both", "both"),
				).
				Value(&draft.Format),
			huh.NewInput().
				Title("Output directory").
				Value(&draft.OutputDir),
		),
	)
	form.WithAccessible(accessible)
	return form
}
