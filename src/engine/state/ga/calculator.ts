import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateProgressiveTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const GA_CONSTANTS: StateTaxConstants = {
  stateCode: "GA",
  displayName: "Georgia",
  taxType: "progressive",
  standardDeduction: {
    single: 5_400,
    married_filing_jointly: 7_100,
    married_filing_separately: 3_550,
    head_of_household: 5_400,
  },
  personalExemption: {
    single: 2_700,
    married_filing_jointly: 5_400, // $2,700 per spouse
    married_filing_separately: 2_700,
    head_of_household: 2_700,
  },
  brackets: {
    single: [
      { upperBound: 750, rate: 0.01 },
      { upperBound: 2_250, rate: 0.02 },
      { upperBound: 3_750, rate: 0.03 },
      { upperBound: 5_250, rate: 0.04 },
      { upperBound: 7_000, rate: 0.05 },
      { rate: 0.0539 },
    ],
    married_filing_jointly: [
      { upperBound: 1_000, rate: 0.01 },
      { upperBound: 3_000, rate: 0.02 },
      { upperBound: 5_000, rate: 0.03 },
      { upperBound: 7_000, rate: 0.04 },
      { upperBound: 10_000, rate: 0.05 },
      { rate: 0.0539 },
    ],
    married_filing_separately: [
      { upperBound: 750, rate: 0.01 },
      { upperBound: 2_250, rate: 0.02 },
      { upperBound: 3_750, rate: 0.03 },
      { upperBound: 5_250, rate: 0.04 },
      { upperBound: 7_000, rate: 0.05 },
      { rate: 0.0539 },
    ],
    head_of_household: [
      { upperBound: 1_000, rate: 0.01 },
      { upperBound: 3_000, rate: 0.02 },
      { upperBound: 5_000, rate: 0.03 },
      { upperBound: 7_000, rate: 0.04 },
      { upperBound: 10_000, rate: 0.05 },
      { rate: 0.0539 },
    ],
  },
  specialRules: [
    "GA starts from federal AGI with Georgia-specific adjustments",
    "Standard deduction and personal exemption are separate deductions",
    "Top marginal rate of 5.39% applies to income above $7,000 (single)",
  ],
};

export const georgiaTaxPlugin: StateTaxPlugin = {
  stateCode: "GA",
  displayName: "Georgia",
  taxType: "progressive",

  calculate(input: StateTaxInput) {
    const stateAgi = input.federalAgi;
    const standardDeduction = getStateDeduction(GA_CONSTANTS.standardDeduction, input.filingStatus);
    const personalExemption = getStateDeduction(GA_CONSTANTS.personalExemption, input.filingStatus);
    const totalDeduction = standardDeduction + personalExemption;
    const stateTaxableIncome = Math.max(0, stateAgi - totalDeduction);

    const brackets = GA_CONSTANTS.brackets[input.filingStatus] ?? GA_CONSTANTS.brackets["single"]!;
    const { tax, breakdown } = calculateProgressiveTax(stateTaxableIncome, brackets);

    return buildStateTaxResult(GA_CONSTANTS, input, {
      stateAgi,
      stateDeduction: totalDeduction,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0,
      localTax: 0,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
