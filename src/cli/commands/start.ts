import type { Command } from "commander";

import { emit, emitError } from "../output.js";
import { PigeonGovError, CLI_EXIT_CODES } from "../support.js";
import { describeWorkflow, getWorkflowStarterData, normalizeWorkflowId } from "../../workflows/registry.js";

export function registerStartCommand(program: Command): void {
  program
    .command("start <workflowId>")
    .description(
      `Print the starter data template and metadata for a workflow.

  Use this BEFORE 'fill' to discover the exact JSON shape required.
  The output includes a _guide field describing each field, the workflow
  metadata, and a starterData object you can copy, fill in, and pass
  to 'pigeongov fill <id> --data <file> --json'.

  Examples:
    $ pigeongov start tax/1040 --json          # get 1040 template
    $ pigeongov start immigration/i-130 --json  # get I-130 template
    $ pigeongov start tax/1040 --json > template.json  # save to file`,
    )
    .action((workflowId) => {
      let normalizedId: string;
      try {
        normalizedId = normalizeWorkflowId(String(workflowId));
      } catch {
        emitError(new PigeonGovError({
          code: "not_found",
          message: `Unsupported workflow: ${workflowId}`,
          exitCode: CLI_EXIT_CODES.notFound,
          suggestion: "Run 'pigeongov list' to see available workflows.",
        }));
        return;
      }
      const workflow = describeWorkflow(normalizedId);
      const starterData = getWorkflowStarterData(normalizedId);

      // Build a _guide object that describes each field from the sections
      const guide: Record<string, string> = {
        _usage: `Fill in the starterData fields and pass to: pigeongov fill ${normalizedId} --data <file> --json`,
      };
      for (const section of workflow.sections) {
        for (const field of section.fields) {
          const optionHint =
            "options" in field && Array.isArray(field.options)
              ? ` (values: ${(field.options as Array<{ value: string }>).map((o) => o.value).join(" | ")})`
              : "";
          guide[field.key] = `${field.label}${optionHint}`;
        }
      }

      emit({
        workflow,
        starterData,
        _guide: guide,
      });
    });
}
