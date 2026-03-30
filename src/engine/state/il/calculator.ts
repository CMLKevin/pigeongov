import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateFlatTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const IL_CONSTANTS: StateTaxConstants = {
  stateCode: "IL",
  displayName: "Illinois",
  taxType: "flat",
  standardDeduction: {
    // IL does not have a standard deduction — uses personal exemption instead
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  personalExemption: {
    single: 2_625,
    married_filing_jointly: 5_250,
    married_filing_separately: 2_625,
    head_of_household: 2_625,
  },
  brackets: {
    single: [{ rate: 0.0495 }],
    married_filing_jointly: [{ rate: 0.0495 }],
    married_filing_separately: [{ rate: 0.0495 }],
    head_of_household: [{ rate: 0.0495 }],
  },
};

const FLAT_RATE = 0.0495;

export const illinoisTaxPlugin: StateTaxPlugin = {
  stateCode: "IL",
  displayName: "Illinois",
  taxType: "flat",

  calculate(input: StateTaxInput) {
    // IL starts from federal AGI with modifications
    const stateAgi = input.federalAgi;
    const exemption = getStateDeduction(IL_CONSTANTS.personalExemption, input.filingStatus);
    const stateTaxableIncome = Math.max(0, stateAgi - exemption);
    const { tax, breakdown } = calculateFlatTax(stateTaxableIncome, FLAT_RATE);

    return buildStateTaxResult(IL_CONSTANTS, input, {
      stateAgi,
      stateDeduction: exemption,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0,
      localTax: 0,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
