import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateFlatTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const MI_CONSTANTS: StateTaxConstants = {
  stateCode: "MI",
  displayName: "Michigan",
  taxType: "flat",
  standardDeduction: {
    // MI does not have a standard deduction — uses personal exemption instead
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  personalExemption: {
    single: 5_600,
    married_filing_jointly: 11_200, // $5,600 per spouse
    married_filing_separately: 5_600,
    head_of_household: 5_600,
  },
  brackets: {
    single: [{ rate: 0.0425 }],
    married_filing_jointly: [{ rate: 0.0425 }],
    married_filing_separately: [{ rate: 0.0425 }],
    head_of_household: [{ rate: 0.0425 }],
  },
  specialRules: [
    "MI uses federal AGI as the starting point with MI modifications",
    "Personal exemption of $5,600 per person (2025)",
    "Detroit residents owe an additional 2.4% city income tax",
    "Some other MI cities levy additional income taxes (typically 1-2%)",
  ],
};

const FLAT_RATE = 0.0425;

// Detroit city income tax rate for residents
const DETROIT_CITY_TAX_RATE = 0.024;

export const michiganTaxPlugin: StateTaxPlugin = {
  stateCode: "MI",
  displayName: "Michigan",
  taxType: "flat",

  calculate(input: StateTaxInput) {
    // MI starts from federal AGI with modifications
    const stateAgi = input.federalAgi;
    const exemption = getStateDeduction(MI_CONSTANTS.personalExemption, input.filingStatus);
    const stateTaxableIncome = Math.max(0, stateAgi - exemption);
    const { tax, breakdown } = calculateFlatTax(stateTaxableIncome, FLAT_RATE);

    // Note: local/city tax (e.g. Detroit 2.4%) would be calculated here
    // if we had city residency info. For now, state-level only.
    const localTax = 0;

    return buildStateTaxResult(MI_CONSTANTS, input, {
      stateAgi,
      stateDeduction: exemption,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0,
      localTax,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
