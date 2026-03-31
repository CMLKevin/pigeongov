import { readFile } from "node:fs/promises";

import type { Command } from "commander";

import { renderValidation } from "../display/validation.js";
import { PigeonGovError, CLI_EXIT_CODES, setExitCodeFromFlags } from "../support.js";
import { isJsonMode, emit, emitError } from "../output.js";
import { loadWorkflowBundle } from "../../workflows/io.js";
import { isWorkflowBundle } from "../../workflows/registry.js";

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
      try {
        const parsed =
          (await loadWorkflowBundle(file)) ??
          (JSON.parse(await readFile(file, "utf8")) as {
            validation: { checks: Array<{ passed: boolean }>; flaggedFields: [] };
          });
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
          emit(parsed.validation);
        } else {
          console.log(renderValidation(parsed.validation as never));
        }
        setExitCodeFromFlags(parsed.validation.flaggedFields);
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
