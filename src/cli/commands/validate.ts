import { readFile } from "node:fs/promises";

import type { Command } from "commander";

import { renderValidation } from "../display/validation.js";
import { emitJson, setExitCodeFromFlags } from "../support.js";
import { loadWorkflowBundle } from "../../workflows/io.js";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate <file>")
    .description("Validate a previously filled workflow JSON bundle")
    .option("--json", "Print JSON output")
    .action(async (file, options) => {
      const parsed =
        (await loadWorkflowBundle(file)) ??
        (JSON.parse(await readFile(file, "utf8")) as {
          validation: { checks: Array<{ passed: boolean }>; flaggedFields: [] };
        });
      if (options.json) {
        emitJson(parsed.validation);
      } else {
        console.log(renderValidation(parsed.validation as never));
      }
      setExitCodeFromFlags(parsed.validation.flaggedFields);
    });
}
