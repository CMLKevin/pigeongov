import { readFile } from "node:fs/promises";

import type { Command } from "commander";

import { renderReview } from "../display/review.js";
import { emitJson, setExitCodeFromFlags } from "../support.js";
import { loadWorkflowBundle } from "../../workflows/io.js";

export function registerReviewCommand(program: Command): void {
  program
    .command("review <file>")
    .description("Print a human-readable review of a filled workflow bundle")
    .option("--json", "Print JSON output")
    .action(async (file, options) => {
      const parsed = (await loadWorkflowBundle(file)) ?? (JSON.parse(await readFile(file, "utf8")) as { review: never; validation?: { flaggedFields?: [] } });
      if (options.json) {
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
