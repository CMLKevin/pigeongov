import type { ValidationCheck } from "../../types.js";
import type { StateTaxBracket, StateTaxConstants, StateTaxInput, StateTaxResult } from "./types.js";

/**
 * Calculate progressive state income tax from brackets.
 * Reusable across all progressive-bracket states.
 */
export function calculateProgressiveTax(
  taxableIncome: number,
  brackets: StateTaxBracket[],
): { tax: number; breakdown: StateTaxResult["breakdown"] } {
  let remainingIncome = Math.max(0, taxableIncome);
  let totalTax = 0;
  let previousBound = 0;
  const breakdown: StateTaxResult["breakdown"] = [];

  for (const bracket of brackets) {
    const upperBound = bracket.upperBound ?? Infinity;
    const bracketWidth = upperBound - previousBound;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);

    if (taxableInBracket <= 0) break;

    const taxInBracket = roundCurrency(taxableInBracket * bracket.rate);
    totalTax += taxInBracket;

    const entry: StateTaxResult["breakdown"][number] = {
      rate: bracket.rate,
      lowerBound: previousBound,
      taxableAmount: roundCurrency(taxableInBracket),
      taxAmount: taxInBracket,
    };
    if (bracket.upperBound !== undefined) {
      entry.upperBound = bracket.upperBound;
    }
    breakdown.push(entry);

    remainingIncome -= taxableInBracket;
    previousBound = upperBound;
  }

  return { tax: roundCurrency(totalTax), breakdown };
}

/**
 * Calculate flat state income tax.
 */
export function calculateFlatTax(
  taxableIncome: number,
  rate: number,
): { tax: number; breakdown: StateTaxResult["breakdown"] } {
  const tax = roundCurrency(Math.max(0, taxableIncome) * rate);
  return {
    tax,
    breakdown: [
      {
        rate,
        lowerBound: 0,
        taxableAmount: roundCurrency(Math.max(0, taxableIncome)),
        taxAmount: tax,
      },
    ],
  };
}

/**
 * Build a standard StateTaxResult from common components.
 */
export function buildStateTaxResult(
  constants: StateTaxConstants,
  input: StateTaxInput,
  opts: {
    stateAgi: number;
    stateDeduction: number;
    stateTaxableIncome: number;
    stateTax: number;
    stateCredits: number;
    localTax: number;
    breakdown: StateTaxResult["breakdown"];
  },
): StateTaxResult {
  const totalStateTax = roundCurrency(opts.stateTax - opts.stateCredits + opts.localTax);
  const stateRefund = roundCurrency(Math.max(0, input.stateWithholding - totalStateTax));
  const stateOwed = roundCurrency(Math.max(0, totalStateTax - input.stateWithholding));

  return {
    stateCode: constants.stateCode,
    displayName: constants.displayName,
    stateAgi: roundCurrency(opts.stateAgi),
    stateDeduction: roundCurrency(opts.stateDeduction),
    stateTaxableIncome: roundCurrency(opts.stateTaxableIncome),
    stateTax: roundCurrency(opts.stateTax),
    stateCredits: roundCurrency(opts.stateCredits),
    localTax: roundCurrency(opts.localTax),
    totalStateTax: roundCurrency(totalStateTax),
    stateWithholding: roundCurrency(input.stateWithholding),
    stateRefund,
    stateOwed,
    effectiveRate: opts.stateAgi > 0 ? Number((totalStateTax / opts.stateAgi).toFixed(4)) : 0,
    breakdown: opts.breakdown,
  };
}

/**
 * Standard state tax validation checks.
 */
export function standardStateValidation(result: StateTaxResult): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  checks.push({
    id: `${result.stateCode.toLowerCase()}_taxable_income`,
    label: `${result.displayName} taxable income non-negative`,
    passed: result.stateTaxableIncome >= 0,
    severity: "error",
    message: result.stateTaxableIncome >= 0
      ? "State taxable income is valid"
      : "State taxable income is negative — review state adjustments",
  });

  checks.push({
    id: `${result.stateCode.toLowerCase()}_refund_owed_exclusive`,
    label: `${result.displayName} refund/owed exclusivity`,
    passed: result.stateRefund === 0 || result.stateOwed === 0,
    severity: "error",
    message: result.stateRefund === 0 || result.stateOwed === 0
      ? "State refund and amount owed are mutually exclusive"
      : "Cannot have both a state refund and amount owed",
  });

  return checks;
}

/**
 * Get standard deduction for a filing status, with fallback.
 */
export function getStateDeduction(
  deductions: Record<string, number>,
  filingStatus: string,
): number {
  return deductions[filingStatus] ?? deductions["single"] ?? 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

// No-income-tax states
export const NO_INCOME_TAX_STATES = new Set([
  "AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY",
]);

export function isNoIncomeTaxState(stateCode: string): boolean {
  return NO_INCOME_TAX_STATES.has(stateCode.toUpperCase());
}
