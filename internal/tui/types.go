package tui

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

type WorkflowCatalogItem struct {
	ID      string   `json:"id"`
	Domain  string   `json:"domain"`
	Title   string   `json:"title"`
	Summary string   `json:"summary"`
	Status  string   `json:"status"`
	Tags    []string `json:"tags"`
}

type WorkflowOption struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type WorkflowField struct {
	Key         string           `json:"key"`
	Label       string           `json:"label"`
	Type        string           `json:"type"`
	HelpText    string           `json:"helpText,omitempty"`
	Placeholder string           `json:"placeholder,omitempty"`
	Options     []WorkflowOption `json:"options,omitempty"`
}

type WorkflowSection struct {
	ID          string          `json:"id"`
	Title       string          `json:"title"`
	Description string          `json:"description,omitempty"`
	Fields      []WorkflowField `json:"fields"`
}

type WorkflowDescriptor struct {
	ID          string                 `json:"id"`
	Domain      string                 `json:"domain"`
	Title       string                 `json:"title"`
	Summary     string                 `json:"summary"`
	Status      string                 `json:"status"`
	Tags        []string               `json:"tags"`
	Sections    []WorkflowSection      `json:"sections"`
	StarterData map[string]any         `json:"starterData"`
	InputSchema []map[string]any       `json:"inputSchema"`
}

type Draft struct {
	WorkflowID string
	Data       map[string]any
	OutputDir  string
	Format     string
}

type LegacyFlag struct {
	Field    string `json:"field"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type LegacyPreview struct {
	WorkflowID  string                 `json:"workflowId"`
	Title       string                 `json:"title"`
	Review      struct {
		Headline string   `json:"headline"`
		Notes    []string `json:"notes"`
	} `json:"review"`
	Validation struct {
		Checks       []map[string]any `json:"checks"`
		FlaggedFields []LegacyFlag    `json:"flaggedFields"`
	} `json:"validation"`
	Derived map[string]any `json:"derived"`
}

type SectionState struct {
	TextValues   map[string]*string
	BoolValues   map[string]*bool
	SelectValues map[string]*string
}

func normalizeWorkflowID(value string) string {
	if value == "" {
		return ""
	}
	switch value {
	case "1040":
		return "tax/1040"
	default:
		return value
	}
}

func splitPath(path string) []string {
	parts := strings.Split(path, ".")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func getPath(data map[string]any, path string) any {
	var current any = data
	for _, part := range splitPath(path) {
		next, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = next[part]
	}
	return current
}

func setPath(data map[string]any, path string, value any) {
	parts := splitPath(path)
	current := data
	for _, part := range parts[:len(parts)-1] {
		next, ok := current[part].(map[string]any)
		if !ok {
			next = map[string]any{}
			current[part] = next
		}
		current = next
	}
	if len(parts) > 0 {
		current[parts[len(parts)-1]] = value
	}
}

func stringifyValue(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case float64:
		if typed == float64(int64(typed)) {
			return strconv.FormatInt(int64(typed), 10)
		}
		return strconv.FormatFloat(typed, 'f', 2, 64)
	case int:
		return strconv.Itoa(typed)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	default:
		return fmt.Sprint(typed)
	}
}

func boolValue(value any) bool {
	typed, ok := value.(bool)
	return ok && typed
}

func commitSectionState(draft *Draft, section WorkflowSection, state SectionState) {
	for _, field := range section.Fields {
		switch field.Type {
		case "confirm":
			if ptr, ok := state.BoolValues[field.Key]; ok && ptr != nil {
				setPath(draft.Data, field.Key, *ptr)
			}
		case "currency", "number":
			if ptr, ok := state.TextValues[field.Key]; ok && ptr != nil {
				trimmed := strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(*ptr, "$", ""), ",", ""))
				if trimmed == "" {
					setPath(draft.Data, field.Key, float64(0))
					continue
				}
				parsed, err := strconv.ParseFloat(trimmed, 64)
				if err != nil {
					setPath(draft.Data, field.Key, float64(0))
					continue
				}
				setPath(draft.Data, field.Key, parsed)
			}
		case "select":
			if ptr, ok := state.SelectValues[field.Key]; ok && ptr != nil {
				setPath(draft.Data, field.Key, *ptr)
			}
		default:
			if ptr, ok := state.TextValues[field.Key]; ok && ptr != nil {
				setPath(draft.Data, field.Key, *ptr)
			}
		}
	}
}

func cloneMap(value map[string]any) map[string]any {
	bytes, _ := json.Marshal(value)
	out := map[string]any{}
	_ = json.Unmarshal(bytes, &out)
	return out
}
