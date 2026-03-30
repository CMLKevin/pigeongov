import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateProgressiveTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const VA_CONSTANTS: StateTaxConstants = {
  stateCode: "VA",
  displayName: "Virginia",
  taxType: "progressive",
  standardDeduction: {
    single: 8_000,
    married_filing_jointly: 16_000,
    married_filing_separately: 8_000,
    head_of_household: 8_000,
  },
  personalExemption: {
    single: 930,
    married_filing_jointly: 1_860, // $930 per spouse
    married_filing_separately: 930,
    head_of_household: 930,
  },
  brackets: {
    // VA uses the same brackets for all filing statuses
    single: [
      { upperBound: 3_000, rate: 0.02 },
      { upperBound: 5_000, rate: 0.03 },
      { upperBound: 17_000, rate: 0.05 },
      { rate: 0.0575 },
    ],
    married_filing_jointly: [
      { upperBound: 3_000, rate: 0.02 },
      { upperBound: 5_000, rate: 0.03 },
      { upperBound: 17_000, rate: 0.05 },
      { rate: 0.0575 },
    ],
    married_filing_separately: [
      { upperBound: 3_000, rate: 0.02 },
      { upperBound: 5_000, rate: 0.03 },
      { upperBound: 17_000, rate: 0.05 },
      { rate: 0.0575 },
    ],
    head_of_household: [
      { upperBound: 3_000, rate: 0.02 },
      { upperBound: 5_000, rate: 0.03 },
      { upperBound: 17_000, rate: 0.05 },
      { rate: 0.0575 },
    ],
  },
  specialRules: [
    "VA uses the same bracket thresholds for all filing statuses",
    "Standard deduction: $8,000 single, $16,000 MFJ",
    "Personal exemption: $930 per person",
    "VA starts from federal AGI with Virginia-specific adjustments",
  ],
};

export const virginiaTaxPlugin: StateTaxPlugin = {
  stateCode: "VA",
  displayName: "Virginia",
  taxType: "progressive",

  calculate(input: StateTaxInput) {
    const stateAgi = input.federalAgi;
    const standardDeduction = getStateDeduction(VA_CONSTANTS.standardDeduction, input.filingStatus);
    const personalExemption = getStateDeduction(VA_CONSTANTS.personalExemption, input.filingStatus);
    const totalDeduction = standardDeduction + personalExemption;
    const stateTaxableIncome = Math.max(0, stateAgi - totalDeduction);

    const brackets = VA_CONSTANTS.brackets[input.filingStatus] ?? VA_CONSTANTS.brackets["single"]!;
    const { tax, breakdown } = calculateProgressiveTax(stateTaxableIncome, brackets);

    return buildStateTaxResult(VA_CONSTANTS, input, {
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
