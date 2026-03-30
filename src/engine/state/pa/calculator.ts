import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateFlatTax, buildStateTaxResult, standardStateValidation } from "../common.js";

export const PA_CONSTANTS: StateTaxConstants = {
  stateCode: "PA",
  displayName: "Pennsylvania",
  taxType: "flat",
  standardDeduction: {
    // PA has no standard deduction
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  personalExemption: {
    // PA has no personal exemption against income tax
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  brackets: {
    single: [{ rate: 0.0307 }],
    married_filing_jointly: [{ rate: 0.0307 }],
    married_filing_separately: [{ rate: 0.0307 }],
    head_of_household: [{ rate: 0.0307 }],
  },
  specialRules: [
    "PA uses eight classes of income, each taxed at the flat rate",
    "Retirement income (distributions from qualifying plans) is generally exempt",
    "No standard deduction or personal exemption against taxable income",
    "PA does not follow federal taxable income — uses its own income definition",
  ],
};

const FLAT_RATE = 0.0307;

export const pennsylvaniaTaxPlugin: StateTaxPlugin = {
  stateCode: "PA",
  displayName: "Pennsylvania",
  taxType: "flat",

  calculate(input: StateTaxInput) {
    // PA generally follows federal AGI but with its own modifications.
    // Retirement income is exempt — approximate by using federal AGI as-is
    // since we don't have a retirement income breakout in the input.
    const stateAgi = input.federalAgi;
    const stateDeduction = 0; // No standard deduction or personal exemption
    const stateTaxableIncome = Math.max(0, stateAgi - stateDeduction);
    const { tax, breakdown } = calculateFlatTax(stateTaxableIncome, FLAT_RATE);

    return buildStateTaxResult(PA_CONSTANTS, input, {
      stateAgi,
      stateDeduction,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0,
      localTax: 0,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
