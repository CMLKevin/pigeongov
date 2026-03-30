export interface ContributionScenario {
  vehicleName: string;
  currentContribution: number;
  maxContribution: number;
  additionalRoom: number;
  taxSavingsPerDollar: number;
  estimatedTaxSavings: number;
  notes: string;
}

export interface ContributionOptimization {
  marginalRate: number;
  scenarios: ContributionScenario[];
  totalPotentialSavings: number;
  recommendation: string;
}

// 2025 contribution limits
const LIMITS_2025 = {
  traditional_ira: 7_000,
  traditional_ira_50plus: 8_000,
  roth_ira: 7_000,
  roth_ira_50plus: 8_000,
  hsa_individual: 4_300,
  hsa_family: 8_550,
  hsa_55plus_catchup: 1_000,
  "401k": 23_500,
  "401k_50plus": 31_000,
};

interface ContributionInput {
  marginalRate: number;
  age: number;
  filingStatus: string;
  agi: number;
  has401k: boolean;
  current401k: number;
  hasIra: boolean;
  currentIra: number;
  iraType: "traditional" | "roth";
  hasHsa: boolean;
  currentHsa: number;
  hsaCoverage: "individual" | "family";
  hasEmployerPlan: boolean;
}

/**
 * Analyze retirement contribution optimization opportunities.
 * Shows how much more could be contributed and the estimated tax savings.
 */
export function optimizeContributions(input: ContributionInput): ContributionOptimization {
  const scenarios: ContributionScenario[] = [];

  // 401(k) optimization
  if (input.has401k) {
    const maxLimit = input.age >= 50 ? LIMITS_2025["401k_50plus"] : LIMITS_2025["401k"];
    const room = Math.max(0, maxLimit - input.current401k);
    if (room > 0) {
      scenarios.push({
        vehicleName: "401(k)",
        currentContribution: input.current401k,
        maxContribution: maxLimit,
        additionalRoom: room,
        taxSavingsPerDollar: input.marginalRate,
        estimatedTaxSavings: roundCurrency(room * input.marginalRate),
        notes: `Pre-tax contribution reduces taxable income dollar-for-dollar at your ${(input.marginalRate * 100).toFixed(0)}% marginal rate`,
      });
    }
  }

  // Traditional IRA optimization
  if (input.hasIra && input.iraType === "traditional") {
    const maxLimit = input.age >= 50 ? LIMITS_2025.traditional_ira_50plus : LIMITS_2025.traditional_ira;
    const room = Math.max(0, maxLimit - input.currentIra);
    if (room > 0) {
      // Check if deductible (depends on employer plan + income)
      const deductible = !input.hasEmployerPlan || input.agi < 77_000;
      scenarios.push({
        vehicleName: "Traditional IRA",
        currentContribution: input.currentIra,
        maxContribution: maxLimit,
        additionalRoom: room,
        taxSavingsPerDollar: deductible ? input.marginalRate : 0,
        estimatedTaxSavings: deductible ? roundCurrency(room * input.marginalRate) : 0,
        notes: deductible
          ? "Fully deductible contribution — immediate tax savings"
          : "Non-deductible (have employer plan + income above phase-out). Consider Roth IRA instead.",
      });
    }
  }

  // HSA optimization (triple tax advantage)
  if (input.hasHsa) {
    const baseLimit = input.hsaCoverage === "family" ? LIMITS_2025.hsa_family : LIMITS_2025.hsa_individual;
    const maxLimit = baseLimit + (input.age >= 55 ? LIMITS_2025.hsa_55plus_catchup : 0);
    const room = Math.max(0, maxLimit - input.currentHsa);
    if (room > 0) {
      scenarios.push({
        vehicleName: "HSA",
        currentContribution: input.currentHsa,
        maxContribution: maxLimit,
        additionalRoom: room,
        taxSavingsPerDollar: input.marginalRate,
        estimatedTaxSavings: roundCurrency(room * input.marginalRate),
        notes: "Triple tax benefit: deductible contribution, tax-free growth, tax-free qualified medical withdrawals. Best retirement vehicle available.",
      });
    }
  }

  const totalSavings = roundCurrency(scenarios.reduce((sum, s) => sum + s.estimatedTaxSavings, 0));

  const recommendation = totalSavings > 0
    ? `You could save approximately $${totalSavings.toLocaleString()} in taxes by maximizing your contributions. ${
        scenarios.find((s) => s.vehicleName === "HSA" && s.additionalRoom > 0)
          ? "Start with the HSA — it offers the best tax advantage."
          : "Start with the highest-savings vehicle first."
      }`
    : "Your contributions are already at or near maximum limits.";

  return {
    marginalRate: input.marginalRate,
    scenarios,
    totalPotentialSavings: totalSavings,
    recommendation,
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
