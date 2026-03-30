import { readFile } from "node:fs/promises";

import type { Command } from "commander";

import { renderReview } from "../display/review.js";
import { emitJson, setExitCodeFromFlags } from "../support.js";
import { isJsonMode } from "../output.js";
import { loadWorkflowBundle } from "../../workflows/io.js";

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
      const parsed = (await loadWorkflowBundle(file)) ?? (JSON.parse(await readFile(file, "utf8")) as { review: never; validation?: { flaggedFields?: [] } });
      if (isJsonMode()) {
        emitJson({
          workflowId: parsed.workflowId,
          review: parsed.review,
          flaggedFields: parsed.validation?.flaggedFields ?? [],
        });
      } else {
        console.log(renderReview(parsed.review));
      }
      setExitCodeFromFlags(parsed.validation?.flaggedFields ?? []);
    });
}
