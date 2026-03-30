import { calculateFederalTax } from "../tax-calculator.js";
import type { TaxCalculationResult } from "../tax-calculator.js";

export interface WhatIfScenario {
  label: string;
  modifications: Record<string, unknown>;
}

export interface WhatIfComparison {
  baseCase: ScenarioResult;
  scenarios: ScenarioResult[];
  bestScenario: string;
  maxSavings: number;
}

export interface ScenarioResult {
  label: string;
  federalTax: number;
  effectiveRate: number;
  refund: number;
  amountOwed: number;
  deltaFromBase: number;
  deltaLabel: string;
}

/**
 * Compare multiple tax scenarios against a base case.
 * Each scenario modifies one or more fields of the base input.
 */
export function compareScenarios(
  baseInput: Record<string, unknown>,
  scenarios: WhatIfScenario[],
): WhatIfComparison {
  const baseResult = calculateFederalTax(baseInput as unknown as Parameters<typeof calculateFederalTax>[0]);
  const baseSummary = summarizeResult("Base case", baseResult, 0);

  const scenarioResults: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const modifiedInput = { ...baseInput, ...scenario.modifications };

    // Deep merge adjustments if present
    if (scenario.modifications.adjustments && baseInput.adjustments) {
      modifiedInput.adjustments = {
        ...(baseInput.adjustments as Record<string, unknown>),
        ...(scenario.modifications.adjustments as Record<string, unknown>),
      };
    }

    const result = calculateFederalTax(modifiedInput as unknown as Parameters<typeof calculateFederalTax>[0]);
    const delta = result.totalTax - baseResult.totalTax;
    scenarioResults.push(summarizeResult(scenario.label, result, delta));
  }

  const bestScenario = scenarioResults.reduce((best, current) =>
    current.deltaFromBase < best.deltaFromBase ? current : best,
  scenarioResults[0]!);

  return {
    baseCase: baseSummary,
    scenarios: scenarioResults,
    bestScenario: bestScenario.label,
    maxSavings: Math.abs(Math.min(0, bestScenario.deltaFromBase)),
  };
}

function summarizeResult(
  label: string,
  result: TaxCalculationResult,
  delta: number,
): ScenarioResult {
  return {
    label,
    federalTax: result.totalTax,
    effectiveRate: result.effectiveRate,
    refund: result.refund,
    amountOwed: result.amountOwed,
    deltaFromBase: Number(delta.toFixed(2)),
    deltaLabel: delta === 0 ? "no change" : delta > 0 ? `+$${delta.toFixed(2)} more tax` : `-$${Math.abs(delta).toFixed(2)} less tax`,
  };
}

/**
 * Quick scenario: "What if I contribute $X more to retirement?"
 */
export function whatIfRetirementContribution(
  baseInput: Record<string, unknown>,
  additionalContribution: number,
): WhatIfComparison {
  return compareScenarios(baseInput, [
    {
      label: `Additional $${additionalContribution.toLocaleString()} retirement contribution`,
      modifications: {
        adjustments: {
          iraDeduction: ((baseInput.adjustments as Record<string, number>)?.iraDeduction ?? 0) + additionalContribution,
        },
      },
    },
  ]);
}

/**
 * Quick scenario: "What if I earn $X more?"
 */
export function whatIfAdditionalIncome(
  baseInput: Record<string, unknown>,
  additionalIncome: number,
): WhatIfComparison {
  return compareScenarios(baseInput, [
    {
      label: `Additional $${additionalIncome.toLocaleString()} income`,
      modifications: {
        wages: ((baseInput as Record<string, number>).wages ?? 0) + additionalIncome,
      },
    },
  ]);
}

export type { TaxCalculationResult };
