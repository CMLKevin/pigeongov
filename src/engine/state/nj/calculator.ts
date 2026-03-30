import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateProgressiveTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const NJ_CONSTANTS: StateTaxConstants = {
  stateCode: "NJ",
  displayName: "New Jersey",
  taxType: "progressive",
  standardDeduction: {
    // NJ has no standard deduction
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  personalExemption: {
    single: 1_000,
    married_filing_jointly: 2_000, // $1,000 per spouse
    married_filing_separately: 1_000,
    head_of_household: 1_000,
  },
  brackets: {
    single: [
      { upperBound: 20_000, rate: 0.014 },
      { upperBound: 35_000, rate: 0.0175 },
      { upperBound: 40_000, rate: 0.035 },
      { upperBound: 75_000, rate: 0.05525 },
      { upperBound: 500_000, rate: 0.0637 },
      { upperBound: 1_000_000, rate: 0.0897 },
      { rate: 0.1075 },
    ],
    married_filing_jointly: [
      { upperBound: 20_000, rate: 0.014 },
      { upperBound: 50_000, rate: 0.0175 },
      { upperBound: 70_000, rate: 0.035 },
      { upperBound: 80_000, rate: 0.05525 },
      { upperBound: 150_000, rate: 0.0637 },
      { upperBound: 500_000, rate: 0.0897 },
      { upperBound: 1_000_000, rate: 0.1075 },
      { rate: 0.1075 },
    ],
    married_filing_separately: [
      { upperBound: 20_000, rate: 0.014 },
      { upperBound: 35_000, rate: 0.0175 },
      { upperBound: 40_000, rate: 0.035 },
      { upperBound: 75_000, rate: 0.05525 },
      { upperBound: 500_000, rate: 0.0637 },
      { upperBound: 1_000_000, rate: 0.0897 },
      { rate: 0.1075 },
    ],
    head_of_household: [
      { upperBound: 20_000, rate: 0.014 },
      { upperBound: 50_000, rate: 0.0175 },
      { upperBound: 70_000, rate: 0.035 },
      { upperBound: 80_000, rate: 0.05525 },
      { upperBound: 150_000, rate: 0.0637 },
      { upperBound: 500_000, rate: 0.0897 },
      { upperBound: 1_000_000, rate: 0.1075 },
      { rate: 0.1075 },
    ],
  },
  specialRules: [
    "NJ has no standard deduction — uses personal exemptions only",
    "Personal exemption: $1,000 per person",
    "NJ has its own gross income definition (does not start from federal AGI)",
    "Bracket thresholds differ between single and joint filers",
    "Top rate of 10.75% applies to income over $1M",
  ],
};

export const newJerseyTaxPlugin: StateTaxPlugin = {
  stateCode: "NJ",
  displayName: "New Jersey",
  taxType: "progressive",

  calculate(input: StateTaxInput) {
    // NJ uses its own gross income definition, but we approximate from federal AGI
    const stateAgi = input.federalAgi;
    const personalExemption = getStateDeduction(NJ_CONSTANTS.personalExemption, input.filingStatus);
    const stateTaxableIncome = Math.max(0, stateAgi - personalExemption);

    const brackets = NJ_CONSTANTS.brackets[input.filingStatus] ?? NJ_CONSTANTS.brackets["single"]!;
    const { tax, breakdown } = calculateProgressiveTax(stateTaxableIncome, brackets);

    return buildStateTaxResult(NJ_CONSTANTS, input, {
      stateAgi,
      stateDeduction: personalExemption,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0,
      localTax: 0,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
