import { readFile } from "node:fs/promises";

import type { Command } from "commander";

import { renderReview } from "../display/review.js";
import { PigeonGovError, CLI_EXIT_CODES, setExitCodeFromFlags } from "../support.js";
import { isJsonMode, emit, emitError } from "../output.js";
import { loadWorkflowBundle } from "../../workflows/io.js";
import { isWorkflowBundle } from "../../workflows/registry.js";

export function registerReviewCommand(program: Command): void {
  program
    .command("review <file>")
    .description(
      `Print a review summary of a filled workflow bundle.

  Reads a bundle produced by 'pigeongov fill' and displays the review:
  headline (e.g., refund amount or amount owed), key notes, and any
  flagged fields. In --json mode, returns { workflowId, review,
  flaggedFields }.

  Exit codes: 0 = clean, 2 = warnings, 3 = errors

  Examples:
    $ pigeongov review ./tax-1040-2025.json
    $ pigeongov review ./bundle.json --json`,
    )
    .action(async (file) => {
      try {
        const parsed = (await loadWorkflowBundle(file)) ?? (JSON.parse(await readFile(file, "utf8")) as { review: never; validation?: { flaggedFields?: [] } });
        if (!isWorkflowBundle(parsed)) {
          emitError(
            new PigeonGovError({
              code: "invalid_input",
              message: "File is not a PigeonGov workflow bundle. Use 'pigeongov fill' to create a bundle first.",
              exitCode: CLI_EXIT_CODES.invalidInput,
            }),
          );
          return;
        }
        if (isJsonMode()) {
          emit({
            workflowId: parsed.workflowId,
            review: parsed.review,
            flaggedFields: parsed.validation?.flaggedFields ?? [],
          });
        } else {
          console.log(renderReview(parsed.review));
        }
        setExitCodeFromFlags(parsed.validation?.flaggedFields ?? []);
      } catch (err: unknown) {
        if (err instanceof SyntaxError) {
          emitError(
            new PigeonGovError({
              code: "invalid_input",
              message: "File is not valid JSON.",
              exitCode: CLI_EXIT_CODES.invalidInput,
            }),
          );
        } else if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
          emitError(
            new PigeonGovError({
              code: "not_found",
              message: `File not found: ${file}`,
              exitCode: CLI_EXIT_CODES.notFound,
            }),
          );
        } else {
          throw err;
        }
      }
    });
}
