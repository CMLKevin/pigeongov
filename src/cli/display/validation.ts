import chalk from "chalk";

import type { ValidationResult } from "../../engine/validator.js";

export function renderValidation(validation: ValidationResult): string {
  const passed = validation.checks.filter((check) => check.passed).length;
  const total = validation.checks.length;
  const allPassed = validation.flaggedFields.length === 0;

  const lines: string[] = [];

  // Header with pass/fail summary
  if (allPassed) {
    lines.push(chalk.green.bold(`\u2713 All validation checks passed (${passed}/${total})`));
  } else {
    lines.push(chalk.yellow.bold(`\u26a0 Validation: ${passed}/${total} checks passed`));
  }

  // Show individual checks
  for (const check of validation.checks) {
    const icon = check.passed
      ? chalk.green("\u2713")
      : check.severity === "error"
        ? chalk.red("\u2717")
        : chalk.yellow("\u25cb");

    lines.push(`  ${icon} ${check.passed ? chalk.dim(check.label) : chalk.white(check.label)}`);

    if (!check.passed) {
      lines.push(`    ${chalk.dim(check.message)}`);
    }
  }

  // Flagged fields
  if (validation.flaggedFields.length > 0) {
    lines.push("");
    lines.push(chalk.yellow("\u26a0 Flagged for review:"));
    for (const flag of validation.flaggedFields) {
      const severityIcon =
        flag.severity === "error"
          ? chalk.red("\u2717")
          : chalk.yellow("\u25cb");
      lines.push(`  ${severityIcon} ${chalk.bold(flag.field)}: ${flag.message}`);
    }
  }

  return lines.join("\n");
}
