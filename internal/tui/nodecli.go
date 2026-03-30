package tui

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func machineNodeScript(root string) string {
	return filepath.Join(root, "dist", "bin", "pigeongov.js")
}

func runMachineCommand(ctx context.Context, root string, args []string) ([]byte, error) {
	script := machineNodeScript(root)
	if _, err := os.Stat(script); err != nil {
		return nil, fmt.Errorf("built CLI not found at %s; run pnpm build:cli before using the TUI", script)
	}

	cmdArgs := append([]string{script, "machine"}, args...)
	cmd := exec.CommandContext(ctx, "node", cmdArgs...)
	cmd.Dir = root
	cmd.Env = append(os.Environ(), "CI=1", "FORCE_COLOR=0")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("%w: %s", err, string(output))
	}

	return output, nil
}

func fetchWorkflowCatalog(ctx context.Context, root string) ([]WorkflowCatalogItem, error) {
	output, err := runMachineCommand(ctx, root, []string{"workflow-catalog"})
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Workflows []WorkflowCatalogItem `json:"workflows"`
	}
	if err := json.Unmarshal(output, &parsed); err != nil {
		return nil, err
	}
	return parsed.Workflows, nil
}

func fetchWorkflowDescriptor(ctx context.Context, root, workflowID string) (WorkflowDescriptor, error) {
	output, err := runMachineCommand(ctx, root, []string{"describe-workflow", "--workflow", workflowID})
	if err != nil {
		return WorkflowDescriptor{}, err
	}

	var parsed WorkflowDescriptor
	if err := json.Unmarshal(output, &parsed); err != nil {
		return WorkflowDescriptor{}, err
	}
	return parsed, nil
}

func writeTempPayload(payload any) (string, func(), error) {
	tempDir, err := os.MkdirTemp("", "pigeongov-tui-")
	if err != nil {
		return "", nil, err
	}

	cleanup := func() {
		_ = os.RemoveAll(tempDir)
	}

	payloadPath := filepath.Join(tempDir, "input.json")
	bytes, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		cleanup()
		return "", nil, err
	}
	if err := os.WriteFile(payloadPath, bytes, 0o600); err != nil {
		cleanup()
		return "", nil, err
	}
	return payloadPath, cleanup, nil
}

func runWorkflowPreview(ctx context.Context, root string, draft Draft) (LegacyPreview, error) {
	payloadPath, cleanup, err := writeTempPayload(draft.Data)
	if err != nil {
		return LegacyPreview{}, err
	}
	defer cleanup()

	output, err := runMachineCommand(ctx, root, []string{
		"render-workflow",
		"--workflow",
		draft.WorkflowID,
		"--data",
		payloadPath,
	})
	if err != nil {
		return LegacyPreview{}, err
	}

	var preview LegacyPreview
	if err := json.Unmarshal(output, &preview); err != nil {
		return LegacyPreview{}, err
	}
	return preview, nil
}

func saveWorkflow(ctx context.Context, root string, draft Draft) ([]string, LegacyPreview, error) {
	payloadPath, cleanup, err := writeTempPayload(draft.Data)
	if err != nil {
		return nil, LegacyPreview{}, err
	}
	defer cleanup()

	output, err := runMachineCommand(ctx, root, []string{
		"save-workflow",
		"--workflow",
		draft.WorkflowID,
		"--data",
		payloadPath,
		"--output",
		draft.OutputDir,
		"--format",
		draft.Format,
	})
	if err != nil {
		return nil, LegacyPreview{}, err
	}

	var parsed struct {
		Saved  []string      `json:"saved"`
		Bundle LegacyPreview `json:"bundle"`
	}
	if err := json.Unmarshal(output, &parsed); err != nil {
		return nil, LegacyPreview{}, err
	}
	return parsed.Saved, parsed.Bundle, nil
}
