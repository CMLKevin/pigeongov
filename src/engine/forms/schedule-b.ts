import type { ValidationCheck } from "../../types.js";
import { defaultOrchestrator } from "../orchestrator.js";
import type { FormPlugin, TaxOrchestratorInput } from "../types.js";

// ---------------------------------------------------------------------------
// Schedule B Plugin — Interest and Ordinary Dividends
//
// Required when the taxpayer's taxable interest OR ordinary dividends
// exceed $1,500. Lists the individual sources of interest and dividend
// income and aggregates totals.
// ---------------------------------------------------------------------------

export interface ScheduleBResult {
  interestSources: Array<{
    payerName: string;
    amount: number;
  }>;
  totalInterest: number;
  dividendSources: Array<{
    payerName: string;
    amount: number;
  }>;
  totalOrdinaryDividends: number;
  hasForeignAccountOrTrust: boolean;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export const scheduleBPlugin: FormPlugin = {
  formId: "schedule-b",
  displayName: "Schedule B (Interest and Ordinary Dividends)",

  triggerCondition(input: TaxOrchestratorInput): boolean {
    return input.taxableInterest > 1500 || input.ordinaryDividends > 1500;
  },

  dependencies: ["core-1040"],

  calculate(
    input: TaxOrchestratorInput,
    _intermediateResults: Map<string, unknown>,
  ): ScheduleBResult {
    // In the absence of itemised source documents on the orchestrator input,
    // we create a single aggregate entry for each category. When document
    // import provides per-payer detail, this can be expanded.
    const interestSources: ScheduleBResult["interestSources"] = [];
    if (input.taxableInterest > 0) {
      interestSources.push({
        payerName: "Total taxable interest",
        amount: roundCurrency(input.taxableInterest),
      });
    }

    const dividendSources: ScheduleBResult["dividendSources"] = [];
    if (input.ordinaryDividends > 0) {
      dividendSources.push({
        payerName: "Total ordinary dividends",
        amount: roundCurrency(input.ordinaryDividends),
      });
    }

    return {
      interestSources,
      totalInterest: roundCurrency(input.taxableInterest),
      dividendSources,
      totalOrdinaryDividends: roundCurrency(input.ordinaryDividends),
      hasForeignAccountOrTrust: false,
    };
  },

  validate(result: unknown, input: TaxOrchestratorInput): ValidationCheck[] {
    const r = result as ScheduleBResult;
    const checks: ValidationCheck[] = [];

    // Part I total should match 1040 line 2b.
    const interestMatch = Math.abs(r.totalInterest - input.taxableInterest) < 0.01;
    checks.push({
      id: "schedule-b-interest-total",
      label: "Schedule B Part I total interest",
      passed: interestMatch,
      severity: "error",
      message: interestMatch
        ? "Schedule B interest total matches Form 1040 line 2b."
        : `Schedule B interest total (${r.totalInterest.toFixed(2)}) does not match input taxable interest (${input.taxableInterest.toFixed(2)}).`,
    });

    // Part II total should match 1040 line 3b.
    const dividendMatch =
      Math.abs(r.totalOrdinaryDividends - input.ordinaryDividends) < 0.01;
    checks.push({
      id: "schedule-b-dividend-total",
      label: "Schedule B Part II total dividends",
      passed: dividendMatch,
      severity: "error",
      message: dividendMatch
        ? "Schedule B dividend total matches Form 1040 line 3b."
        : `Schedule B dividend total (${r.totalOrdinaryDividends.toFixed(2)}) does not match input ordinary dividends (${input.ordinaryDividends.toFixed(2)}).`,
    });

    return checks;
  },

  mapToFormLines(result: unknown): Record<string, unknown> {
    const r = result as ScheduleBResult;
    return {
      "schedule-b.part1.sources": r.interestSources,
      "schedule-b.part1.total": r.totalInterest,
      "schedule-b.part2.sources": r.dividendSources,
      "schedule-b.part2.total": r.totalOrdinaryDividends,
      "schedule-b.part3.foreignAccounts": r.hasForeignAccountOrTrust,
    };
  },
};

// Auto-register.
defaultOrchestrator.register(scheduleBPlugin);
