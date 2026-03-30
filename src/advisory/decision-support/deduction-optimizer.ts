export interface DeductionComparison {
  standardDeduction: number;
  itemizedTotal: number;
  recommended: "standard" | "itemized";
  savings: number;
  itemizedBreakdown: ItemizedComponent[];
  notes: string[];
}

export interface ItemizedComponent {
  label: string;
  amount: number;
  limit?: number | undefined;
  cappedAmount: number;
  notes?: string | undefined;
}

const SALT_CAP = 10_000; // State and local tax deduction cap

interface DeductionInput {
  filingStatus: string;
  standardDeduction: number;
  mortgageInterest: number;
  stateAndLocalTaxes: number;
  charitableContributions: number;
  medicalExpenses: number;
  agi: number;
  otherItemized: number;
}

/**
 * Compare standard deduction vs. itemized, showing dollar difference
 * and which components contribute to the itemized total.
 */
export function compareDeductions(input: DeductionInput): DeductionComparison {
  const components: ItemizedComponent[] = [];
  const notes: string[] = [];

  // Mortgage interest
  if (input.mortgageInterest > 0) {
    components.push({
      label: "Mortgage interest",
      amount: input.mortgageInterest,
      cappedAmount: input.mortgageInterest,
      notes: "Deductible on up to $750K of acquisition debt",
    });
  }

  // SALT (state and local taxes) — capped at $10,000
  if (input.stateAndLocalTaxes > 0) {
    const capped = Math.min(input.stateAndLocalTaxes, SALT_CAP);
    components.push({
      label: "State and local taxes (SALT)",
      amount: input.stateAndLocalTaxes,
      limit: SALT_CAP,
      cappedAmount: capped,
      notes: input.stateAndLocalTaxes > SALT_CAP
        ? `Capped at $${SALT_CAP.toLocaleString()} (you paid $${input.stateAndLocalTaxes.toLocaleString()})`
        : undefined,
    });
    if (input.stateAndLocalTaxes > SALT_CAP) {
      notes.push(`$${(input.stateAndLocalTaxes - SALT_CAP).toLocaleString()} in SALT deduction lost to the $10,000 cap`);
    }
  }

  // Charitable contributions
  if (input.charitableContributions > 0) {
    const agiLimit = input.agi * 0.6;
    const capped = Math.min(input.charitableContributions, agiLimit);
    components.push({
      label: "Charitable contributions",
      amount: input.charitableContributions,
      limit: agiLimit,
      cappedAmount: capped,
      notes: input.charitableContributions > agiLimit
        ? `Limited to 60% of AGI ($${agiLimit.toLocaleString()}). Excess carries forward 5 years.`
        : undefined,
    });
  }

  // Medical expenses (only amount exceeding 7.5% of AGI)
  if (input.medicalExpenses > 0) {
    const threshold = input.agi * 0.075;
    const deductible = Math.max(0, input.medicalExpenses - threshold);
    components.push({
      label: "Medical expenses",
      amount: input.medicalExpenses,
      limit: threshold,
      cappedAmount: deductible,
      notes: deductible > 0
        ? `Only amounts exceeding 7.5% of AGI ($${threshold.toLocaleString()}) are deductible`
        : `Below 7.5% AGI threshold — no deduction`,
    });
  }

  // Other itemized
  if (input.otherItemized > 0) {
    components.push({
      label: "Other itemized deductions",
      amount: input.otherItemized,
      cappedAmount: input.otherItemized,
    });
  }

  const itemizedTotal = roundCurrency(components.reduce((sum, c) => sum + c.cappedAmount, 0));
  const recommended = itemizedTotal > input.standardDeduction ? "itemized" : "standard";
  const savings = roundCurrency(Math.abs(itemizedTotal - input.standardDeduction));

  if (recommended === "standard") {
    notes.unshift(
      `Standard deduction ($${input.standardDeduction.toLocaleString()}) exceeds your itemized total ($${itemizedTotal.toLocaleString()}) by $${savings.toLocaleString()}.`,
    );
  } else {
    notes.unshift(
      `Itemizing saves $${savings.toLocaleString()} compared to the standard deduction.`,
    );
  }

  // Check if close to breakpoint
  const gap = Math.abs(itemizedTotal - input.standardDeduction);
  if (gap < input.standardDeduction * 0.1) {
    notes.push("Your itemized total is close to the standard deduction — small changes in deductible expenses could flip the recommendation.");
  }

  return {
    standardDeduction: input.standardDeduction,
    itemizedTotal,
    recommended,
    savings,
    itemizedBreakdown: components,
    notes,
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
