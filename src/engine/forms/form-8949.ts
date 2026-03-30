import type { ValidationCheck } from "../../types.js";
import { defaultOrchestrator } from "../orchestrator.js";
import type { FormPlugin, TaxOrchestratorInput } from "../types.js";

// ---------------------------------------------------------------------------
// Form 8949 Plugin — Sales and Other Dispositions of Capital Assets
//
// Triggers when the taxpayer has capital-gains transactions. Classifies
// each transaction as short-term or long-term, computes per-transaction
// gain/loss, and produces aggregated totals for Schedule D.
// ---------------------------------------------------------------------------

export interface Form8949Transaction {
  description: string;
  dateAcquired: string;
  dateSold: string;
  proceeds: number;
  costBasis: number;
  gainOrLoss: number;
  shortTerm: boolean;
}

export interface Form8949Result {
  shortTermTransactions: Form8949Transaction[];
  longTermTransactions: Form8949Transaction[];
  totalShortTermProceeds: number;
  totalShortTermCostBasis: number;
  totalShortTermGainOrLoss: number;
  totalLongTermProceeds: number;
  totalLongTermCostBasis: number;
  totalLongTermGainOrLoss: number;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export const form8949Plugin: FormPlugin = {
  formId: "form-8949",
  displayName: "Form 8949 (Sales and Other Dispositions of Capital Assets)",

  triggerCondition(input: TaxOrchestratorInput): boolean {
    return (input.capitalGains?.transactions.length ?? 0) > 0;
  },

  dependencies: ["core-1040"],

  calculate(
    input: TaxOrchestratorInput,
    _intermediateResults: Map<string, unknown>,
  ): Form8949Result {
    const transactions = input.capitalGains?.transactions ?? [];

    const shortTermTransactions: Form8949Transaction[] = [];
    const longTermTransactions: Form8949Transaction[] = [];

    for (const tx of transactions) {
      const gainOrLoss = roundCurrency(tx.proceeds - tx.costBasis);
      const entry: Form8949Transaction = {
        description: tx.description,
        dateAcquired: tx.dateAcquired,
        dateSold: tx.dateSold,
        proceeds: roundCurrency(tx.proceeds),
        costBasis: roundCurrency(tx.costBasis),
        gainOrLoss,
        shortTerm: tx.shortTerm,
      };

      if (tx.shortTerm) {
        shortTermTransactions.push(entry);
      } else {
        longTermTransactions.push(entry);
      }
    }

    const totalShortTermProceeds = roundCurrency(
      shortTermTransactions.reduce((sum, t) => sum + t.proceeds, 0),
    );
    const totalShortTermCostBasis = roundCurrency(
      shortTermTransactions.reduce((sum, t) => sum + t.costBasis, 0),
    );
    const totalShortTermGainOrLoss = roundCurrency(
      shortTermTransactions.reduce((sum, t) => sum + t.gainOrLoss, 0),
    );
    const totalLongTermProceeds = roundCurrency(
      longTermTransactions.reduce((sum, t) => sum + t.proceeds, 0),
    );
    const totalLongTermCostBasis = roundCurrency(
      longTermTransactions.reduce((sum, t) => sum + t.costBasis, 0),
    );
    const totalLongTermGainOrLoss = roundCurrency(
      longTermTransactions.reduce((sum, t) => sum + t.gainOrLoss, 0),
    );

    return {
      shortTermTransactions,
      longTermTransactions,
      totalShortTermProceeds,
      totalShortTermCostBasis,
      totalShortTermGainOrLoss,
      totalLongTermProceeds,
      totalLongTermCostBasis,
      totalLongTermGainOrLoss,
    };
  },

  validate(result: unknown, _input: TaxOrchestratorInput): ValidationCheck[] {
    const r = result as Form8949Result;
    const checks: ValidationCheck[] = [];

    // Verify short-term totals are internally consistent.
    const expectedSTGain = roundCurrency(
      r.totalShortTermProceeds - r.totalShortTermCostBasis,
    );
    const stConsistent =
      Math.abs(r.totalShortTermGainOrLoss - expectedSTGain) < 0.01;
    checks.push({
      id: "form-8949-st-totals",
      label: "Form 8949 short-term totals consistency",
      passed: stConsistent,
      severity: "error",
      message: stConsistent
        ? "Short-term proceeds minus cost basis equals gain/loss total."
        : `Short-term gain/loss (${r.totalShortTermGainOrLoss.toFixed(2)}) does not match proceeds minus basis (${expectedSTGain.toFixed(2)}).`,
    });

    // Verify long-term totals are internally consistent.
    const expectedLTGain = roundCurrency(
      r.totalLongTermProceeds - r.totalLongTermCostBasis,
    );
    const ltConsistent =
      Math.abs(r.totalLongTermGainOrLoss - expectedLTGain) < 0.01;
    checks.push({
      id: "form-8949-lt-totals",
      label: "Form 8949 long-term totals consistency",
      passed: ltConsistent,
      severity: "error",
      message: ltConsistent
        ? "Long-term proceeds minus cost basis equals gain/loss total."
        : `Long-term gain/loss (${r.totalLongTermGainOrLoss.toFixed(2)}) does not match proceeds minus basis (${expectedLTGain.toFixed(2)}).`,
    });

    return checks;
  },

  mapToFormLines(result: unknown): Record<string, unknown> {
    const r = result as Form8949Result;
    return {
      "form-8949.part1.transactions": r.shortTermTransactions,
      "form-8949.part1.totalProceeds": r.totalShortTermProceeds,
      "form-8949.part1.totalCostBasis": r.totalShortTermCostBasis,
      "form-8949.part1.totalGainOrLoss": r.totalShortTermGainOrLoss,
      "form-8949.part2.transactions": r.longTermTransactions,
      "form-8949.part2.totalProceeds": r.totalLongTermProceeds,
      "form-8949.part2.totalCostBasis": r.totalLongTermCostBasis,
      "form-8949.part2.totalGainOrLoss": r.totalLongTermGainOrLoss,
    };
  },
};

// Auto-register.
defaultOrchestrator.register(form8949Plugin);
