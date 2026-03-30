import chalk from "chalk";

import type { ValidationResult } from "../../engine/validator.js";

export function renderValidation(validation: ValidationResult): string {
  const passed = validation.checks.filter((check) => check.passed).length;
  const total = validation.checks.length;
  const header =
    validation.flaggedFields.length === 0
      ? chalk.green(`✓ All validation checks passed (${passed}/${total})`)
      : chalk.yellow(`⚠ Validation checks passed with review flags (${passed}/${total})`);

  const flags =
    validation.flaggedFields.length === 0
      ? "⚠ Flagged for review: (none)"
      : [
          "⚠ Flagged for review:",
          ...validation.flaggedFields.map(
            (flag) => `- ${flag.field}: ${flag.message}`,
          ),
        ].join("\n");

  return `${header}\n${flags}`;
}
