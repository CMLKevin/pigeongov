import { readFile } from "node:fs/promises";

import type { Command } from "commander";

import { renderReview } from "../display/review.js";
import { emitJson, setExitCodeFromFlags } from "../support.js";
import { isJsonMode } from "../output.js";
import { loadWorkflowBundle } from "../../workflows/io.js";

export function registerReviewCommand(program: Command): void {
  program
    .command("review <file>")
    .description("Print a human-readable review of a filled workflow bundle")
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
