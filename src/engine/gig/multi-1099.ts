import type { Form1099NecDocument } from "../../types.js";

export interface ScheduleCAggregate {
  totalGrossReceipts: number;
  totalExpenses: number;
  netProfit: number;
  sourceCount: number;
  sources: Array<{
    payerName: string;
    compensation: number;
    federalWithheld: number;
  }>;
  totalFederalWithheld: number;
}

/**
 * Aggregate multiple 1099-NEC documents into a single Schedule C summary.
 * Self-employed individuals receiving multiple 1099-NECs report all on one Schedule C
 * (unless they have truly separate businesses, which is rare for gig workers).
 */
export function aggregateScheduleC(
  documents: Form1099NecDocument[],
  expenses?: number,
): ScheduleCAggregate {
  const sources = documents.map((doc) => ({
    payerName: doc.payerName,
    compensation: doc.nonemployeeCompensation,
    federalWithheld: doc.federalWithheld ?? 0,
  }));

  const totalGrossReceipts = roundCurrency(
    sources.reduce((sum, s) => sum + s.compensation, 0),
  );
  const totalFederalWithheld = roundCurrency(
    sources.reduce((sum, s) => sum + s.federalWithheld, 0),
  );
  const totalExpenses = roundCurrency(expenses ?? 0);
  const netProfit = roundCurrency(totalGrossReceipts - totalExpenses);

  return {
    totalGrossReceipts,
    totalExpenses,
    netProfit,
    sourceCount: sources.length,
    sources,
    totalFederalWithheld,
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
