import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateProgressiveTax, buildStateTaxResult, standardStateValidation } from "../common.js";

export const OH_CONSTANTS: StateTaxConstants = {
  stateCode: "OH",
  displayName: "Ohio",
  taxType: "progressive",
  standardDeduction: {
    // OH has no standard deduction
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  personalExemption: {
    // OH has no personal exemption — first $26,050 is taxed at 0%
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  brackets: {
    // Same brackets for all filing statuses
    // The 0% bracket on the first $26,050 effectively acts as an exemption
    single: [
      { upperBound: 26_050, rate: 0.0 },
      { upperBound: 100_000, rate: 0.0275 },
      { rate: 0.035 },
    ],
    married_filing_jointly: [
      { upperBound: 26_050, rate: 0.0 },
      { upperBound: 100_000, rate: 0.0275 },
      { rate: 0.035 },
    ],
    married_filing_separately: [
      { upperBound: 26_050, rate: 0.0 },
      { upperBound: 100_000, rate: 0.0275 },
      { rate: 0.035 },
    ],
    head_of_household: [
      { upperBound: 26_050, rate: 0.0 },
      { upperBound: 100_000, rate: 0.0275 },
      { rate: 0.035 },
    ],
  },
  specialRules: [
    "First $26,050 of income is exempt (0% bracket)",
    "No standard deduction or personal exemption — the 0% bracket serves this role",
    "OH uses the same brackets for all filing statuses",
    "Many OH cities levy additional municipal income tax (typically 1-3%)",
    "OH starts from federal AGI with Ohio-specific adjustments",
  ],
};

export const ohioTaxPlugin: StateTaxPlugin = {
  stateCode: "OH",
  displayName: "Ohio",
  taxType: "progressive",

  calculate(input: StateTaxInput) {
    // OH starts from federal AGI with Ohio modifications
    const stateAgi = input.federalAgi;
    // No standard deduction or personal exemption — the 0% bracket handles it
    const stateDeduction = 0;
    const stateTaxableIncome = Math.max(0, stateAgi - stateDeduction);

    const brackets = OH_CONSTANTS.brackets[input.filingStatus] ?? OH_CONSTANTS.brackets["single"]!;
    const { tax, breakdown } = calculateProgressiveTax(stateTaxableIncome, brackets);

    // Note: municipal income tax (e.g. Columbus, Cleveland, Cincinnati)
    // would be calculated here if we had city residency info.
    const localTax = 0;

    return buildStateTaxResult(OH_CONSTANTS, input, {
      stateAgi,
      stateDeduction,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0,
      localTax,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
