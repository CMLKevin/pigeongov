import type { ValidationCheck } from "../../types.js";
import type { Form8949Result } from "./form-8949.js";
import { defaultOrchestrator } from "../orchestrator.js";
import type { FormPlugin, TaxOrchestratorInput } from "../types.js";

// ---------------------------------------------------------------------------
// Schedule D Plugin — Capital Gains and Losses
//
// Aggregates Form 8949 results into the Schedule D summary. Computes net
// short-term and long-term gain/loss, the overall net capital gain/loss,
// and applies the $3,000 capital loss limitation.
// ---------------------------------------------------------------------------

export interface ScheduleDResult {
  shortTermGainOrLoss: number;
  longTermGainOrLoss: number;
  netCapitalGainOrLoss: number;
  capitalLossCarryover: number;
  taxableCapitalGain: number;
}

const CAPITAL_LOSS_LIMIT = 3000;

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export const scheduleDPlugin: FormPlugin = {
  formId: "schedule-d",
  displayName: "Schedule D (Capital Gains and Losses)",

  triggerCondition(input: TaxOrchestratorInput): boolean {
    return (input.capitalGains?.transactions.length ?? 0) > 0;
  },

  dependencies: ["form-8949"],

  calculate(
    _input: TaxOrchestratorInput,
    intermediateResults: Map<string, unknown>,
  ): ScheduleDResult {
    const form8949 = intermediateResults.get("form-8949") as
      | Form8949Result
      | undefined;

    const shortTermGainOrLoss = roundCurrency(
      form8949?.totalShortTermGainOrLoss ?? 0,
    );
    const longTermGainOrLoss = roundCurrency(
      form8949?.totalLongTermGainOrLoss ?? 0,
    );
    const netCapitalGainOrLoss = roundCurrency(
      shortTermGainOrLoss + longTermGainOrLoss,
    );

    // If net capital loss, only $3,000 ($1,500 MFS) can be deducted this year.
    // The remainder carries forward. We use $3,000 here; MFS adjustment
    // would be handled by the core-1040 plugin if needed.
    let taxableCapitalGain: number;
    let capitalLossCarryover: number;

    if (netCapitalGainOrLoss >= 0) {
      taxableCapitalGain = netCapitalGainOrLoss;
      capitalLossCarryover = 0;
    } else {
      const deductibleLoss = Math.min(
        Math.abs(netCapitalGainOrLoss),
        CAPITAL_LOSS_LIMIT,
      );
      taxableCapitalGain = roundCurrency(-deductibleLoss);
      capitalLossCarryover = roundCurrency(
        Math.abs(netCapitalGainOrLoss) - deductibleLoss,
      );
    }

    return {
      shortTermGainOrLoss,
      longTermGainOrLoss,
      netCapitalGainOrLoss,
      capitalLossCarryover,
      taxableCapitalGain,
    };
  },

  validate(result: unknown, _input: TaxOrchestratorInput): ValidationCheck[] {
    const r = result as ScheduleDResult;
    const checks: ValidationCheck[] = [];

    // Net should equal short + long.
    const netConsistent =
      Math.abs(
        r.netCapitalGainOrLoss -
          (r.shortTermGainOrLoss + r.longTermGainOrLoss),
      ) < 0.01;
    checks.push({
      id: "schedule-d-net-total",
      label: "Schedule D net capital gain/loss consistency",
      passed: netConsistent,
      severity: "error",
      message: netConsistent
        ? "Net capital gain/loss equals short-term plus long-term."
        : `Net (${r.netCapitalGainOrLoss.toFixed(2)}) does not match short (${r.shortTermGainOrLoss.toFixed(2)}) + long (${r.longTermGainOrLoss.toFixed(2)}).`,
    });

    // Capital loss carryover should only exist when there is a net loss exceeding the limit.
    const carryoverValid =
      r.capitalLossCarryover >= 0 &&
      (r.netCapitalGainOrLoss >= 0
        ? r.capitalLossCarryover === 0
        : true);
    checks.push({
      id: "schedule-d-carryover",
      label: "Schedule D capital loss carryover validity",
      passed: carryoverValid,
      severity: "warning",
      message: carryoverValid
        ? "Capital loss carryover is valid."
        : "Capital loss carryover is inconsistent with net capital gain/loss.",
    });

    return checks;
  },

  mapToFormLines(result: unknown): Record<string, unknown> {
    const r = result as ScheduleDResult;
    return {
      "schedule-d.line7": r.shortTermGainOrLoss,
      "schedule-d.line15": r.longTermGainOrLoss,
      "schedule-d.line16": r.netCapitalGainOrLoss,
      "schedule-d.line21": r.taxableCapitalGain,
      "schedule-d.capitalLossCarryover": r.capitalLossCarryover,
      // This flows to Form 1040 line 7.
      "1040.line7": r.taxableCapitalGain,
    };
  },
};

// Auto-register.
defaultOrchestrator.register(scheduleDPlugin);
