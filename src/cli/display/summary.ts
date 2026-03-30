import chalk from "chalk";

import type { TaxCalculationResult } from "../../engine/tax-calculator.js";
import { formatCurrency } from "../prompts/common.js";

export function renderCalculationSummary(calculation: TaxCalculationResult): string {
  const lines = [
    chalk.bold("═══ Calculating ═══"),
    `Gross income:        ${formatCurrency(calculation.grossIncome)}`,
    `Deduction:           -${formatCurrency(calculation.deduction)}`,
    `Taxable income:      ${formatCurrency(calculation.taxableIncome)}`,
    `Federal tax:         ${formatCurrency(calculation.federalTax)}`,
    `Self-employment tax: ${formatCurrency(calculation.selfEmploymentTax)}`,
    `Total payments:      ${formatCurrency(calculation.totalPayments)}`,
    "──────────────────────────────",
    calculation.refund > 0
      ? `${chalk.green("REFUND:")}              ${formatCurrency(calculation.refund)}`
      : `${chalk.yellow("AMOUNT OWED:")}        ${formatCurrency(calculation.amountOwed)}`,
  ];

  return lines.join("\n");
}
