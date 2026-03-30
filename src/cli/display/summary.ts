import chalk from "chalk";

import type { TaxCalculationResult } from "../../engine/tax-calculator.js";
import { formatCurrency } from "../prompts/common.js";

export function renderCalculationSummary(calculation: TaxCalculationResult): string {
  const W = 44;
  const top = chalk.dim(`\u250c${"─".repeat(W)}\u2510`);
  const bottom = chalk.dim(`\u2514${"─".repeat(W)}\u2518`);
  const divider = chalk.dim(`\u251c${"─".repeat(W)}\u2524`);
  const doubleDivider = chalk.dim(`\u255e${"═".repeat(W)}\u2561`);

  function row(label: string, value: string, prefix = " "): string {
    // Strip ANSI for padding
    const strippedLabel = label.replace(/\u001b\[[0-9;]*m/g, "");
    const strippedValue = value.replace(/\u001b\[[0-9;]*m/g, "");
    const innerWidth = W - 2; // 2 for the space padding
    const gap = Math.max(1, innerWidth - strippedLabel.length - strippedValue.length - 1);
    return `${chalk.dim("\u2502")}${prefix}${label}${" ".repeat(gap)}${value} ${chalk.dim("\u2502")}`;
  }

  const lines = [
    "",
    top,
    row(chalk.bold("Tax Calculation Summary"), "", " "),
    divider,
    row("Gross income", formatCurrency(calculation.grossIncome)),
    row("Adjustments", chalk.dim(`-${formatCurrency(calculation.deduction)}`)),
    row("Taxable income", formatCurrency(calculation.taxableIncome)),
    divider,
    row("Federal tax", formatCurrency(calculation.federalTax)),
    row("Self-employment tax", formatCurrency(calculation.selfEmploymentTax)),
  ];

  if (calculation.totalCredits > 0) {
    lines.push(row("Credits", chalk.green(`-${formatCurrency(calculation.totalCredits)}`)));
  }
  if (calculation.childTaxCredit > 0) {
    lines.push(row(chalk.dim("  Child tax credit"), chalk.green(formatCurrency(calculation.childTaxCredit))));
  }
  if (calculation.earnedIncomeCredit > 0) {
    lines.push(row(chalk.dim("  Earned income credit"), chalk.green(formatCurrency(calculation.earnedIncomeCredit))));
  }

  lines.push(divider);
  lines.push(row("Total payments", formatCurrency(calculation.totalPayments)));
  lines.push(doubleDivider);

  if (calculation.refund > 0) {
    lines.push(
      row(
        chalk.green.bold("REFUND"),
        chalk.green.bold(formatCurrency(calculation.refund)),
      ),
    );
  } else {
    lines.push(
      row(
        chalk.red.bold("AMOUNT OWED"),
        chalk.red.bold(formatCurrency(calculation.amountOwed)),
      ),
    );
  }

  lines.push(bottom);

  // Effective/marginal rate footer
  lines.push(
    chalk.dim(
      `  Effective rate: ${(calculation.effectiveRate * 100).toFixed(1)}%` +
        `  \u2502  Marginal rate: ${(calculation.marginalRate * 100).toFixed(1)}%`,
    ),
  );

  return lines.join("\n");
}
