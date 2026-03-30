import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateFlatTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const NC_CONSTANTS: StateTaxConstants = {
  stateCode: "NC",
  displayName: "North Carolina",
  taxType: "flat",
  standardDeduction: {
    single: 12_750,
    married_filing_jointly: 25_500,
    married_filing_separately: 12_750,
    head_of_household: 19_125,
  },
  personalExemption: {
    // NC folds its exemption into the standard deduction
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  brackets: {
    single: [{ rate: 0.045 }],
    married_filing_jointly: [{ rate: 0.045 }],
    married_filing_separately: [{ rate: 0.045 }],
    head_of_household: [{ rate: 0.045 }],
  },
  specialRules: [
    "NC tax base starts from federal AGI with NC-specific modifications",
    "Flat rate of 4.5% for 2025 tax year",
    "NC standard deduction is separate from federal standard deduction",
  ],
};

const FLAT_RATE = 0.045;

export const northCarolinaTaxPlugin: StateTaxPlugin = {
  stateCode: "NC",
  displayName: "North Carolina",
  taxType: "flat",

  calculate(input: StateTaxInput) {
    // NC starts from federal AGI with NC modifications
    const stateAgi = input.federalAgi;
    const standardDeduction = getStateDeduction(NC_CONSTANTS.standardDeduction, input.filingStatus);
    const stateTaxableIncome = Math.max(0, stateAgi - standardDeduction);
    const { tax, breakdown } = calculateFlatTax(stateTaxableIncome, FLAT_RATE);

    return buildStateTaxResult(NC_CONSTANTS, input, {
      stateAgi,
      stateDeduction: standardDeduction,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0,
      localTax: 0,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
