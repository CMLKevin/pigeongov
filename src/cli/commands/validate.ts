import { readFile } from "node:fs/promises";

import type { Command } from "commander";

import { renderValidation } from "../display/validation.js";
import { emitJson, setExitCodeFromFlags } from "../support.js";
import { isJsonMode } from "../output.js";
import { loadWorkflowBundle } from "../../workflows/io.js";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate <file>")
    .description(
      `Validate a filled workflow bundle JSON file.

  Reads a bundle produced by 'pigeongov fill' and runs all validation
  checks: required fields, cross-field consistency, IRS/agency rules,
  and mathematical accuracy. Returns flagged fields with severity
  (error or warning) and human-readable messages.

  Exit codes: 0 = all checks pass, 2 = warnings only, 3 = errors found

  Examples:
    $ pigeongov validate ./tax-1040-2025.json
    $ pigeongov validate ./bundle.json --json   # structured output`,
    )
    .action(async (file) => {
      const parsed =
        (await loadWorkflowBundle(file)) ??
        (JSON.parse(await readFile(file, "utf8")) as {
          validation: { checks: Array<{ passed: boolean }>; flaggedFields: [] };
        });
      if (isJsonMode()) {
        emitJson(parsed.validation);
      } else {
        console.log(renderValidation(parsed.validation as never));
      }
      setExitCodeFromFlags(parsed.validation.flaggedFields);
    });
}
