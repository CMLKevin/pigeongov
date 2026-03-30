import { calculateFederalTax } from "../tax-calculator.js";
import type { TaxCalculationResult } from "../tax-calculator.js";
import type { FilingStatus } from "../../types.js";

export interface FilingStatusComparison {
  statuses: FilingStatusResult[];
  recommended: FilingStatus;
  savings: number;
  explanation: string;
}

export interface FilingStatusResult {
  filingStatus: FilingStatus;
  totalTax: number;
  effectiveRate: number;
  refund: number;
  amountOwed: number;
  creditLimitations: string[];
}

const FILING_STATUS_DISPLAY: Record<FilingStatus, string> = {
  single: "Single",
  married_filing_jointly: "Married Filing Jointly",
  married_filing_separately: "Married Filing Separately",
  head_of_household: "Head of Household",
  qualifying_surviving_spouse: "Qualifying Surviving Spouse",
};

/**
 * Compare MFJ vs MFS for married taxpayers.
 * Shows the actual dollar difference and credits lost under MFS.
 */
export function compareFilingStatuses(
  baseInput: Record<string, unknown>,
  statusesToCompare?: FilingStatus[],
): FilingStatusComparison {
  const statuses = statusesToCompare ?? [
    "married_filing_jointly",
    "married_filing_separately",
  ];

  const results: FilingStatusResult[] = [];

  for (const status of statuses) {
    const modifiedInput = { ...baseInput, filingStatus: status };
    const result = calculateFederalTax(modifiedInput as unknown as Parameters<typeof calculateFederalTax>[0]);

    const creditLimitations: string[] = [];
    if (status === "married_filing_separately") {
      creditLimitations.push("EITC not available when filing separately");
      creditLimitations.push("Education credits may be reduced or eliminated");
      creditLimitations.push("Child and Dependent Care Credit may be limited");
      creditLimitations.push("Student loan interest deduction not available");
      creditLimitations.push("Standard deduction is half of MFJ amount");
    }

    results.push({
      filingStatus: status,
      totalTax: result.totalTax,
      effectiveRate: result.effectiveRate,
      refund: result.refund,
      amountOwed: result.amountOwed,
      creditLimitations,
    });
  }

  // Find the best (lowest tax) option
  const sorted = [...results].sort((a, b) => a.totalTax - b.totalTax);
  const best = sorted[0]!;
  const worst = sorted[sorted.length - 1]!;
  const savings = Number((worst.totalTax - best.totalTax).toFixed(2));

  const explanation = savings > 0
    ? `${FILING_STATUS_DISPLAY[best.filingStatus]} saves $${savings.toLocaleString()} compared to ${FILING_STATUS_DISPLAY[worst.filingStatus]}.`
    : `Both filing statuses result in the same tax liability.`;

  return {
    statuses: results,
    recommended: best.filingStatus,
    savings,
    explanation,
  };
}

/**
 * Quick check: should a married couple file jointly or separately?
 * Returns a simple recommendation with reasoning.
 */
export function recommendFilingStatus(
  baseInput: Record<string, unknown>,
): { recommendation: FilingStatus; reason: string; savings: number } {
  const comparison = compareFilingStatuses(baseInput);
  return {
    recommendation: comparison.recommended,
    reason: comparison.explanation,
    savings: comparison.savings,
  };
}
