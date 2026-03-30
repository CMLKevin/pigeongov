import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateProgressiveTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const CA_CONSTANTS: StateTaxConstants = {
  stateCode: "CA",
  displayName: "California",
  taxType: "progressive",
  standardDeduction: {
    single: 5_540,
    married_filing_jointly: 11_080,
    married_filing_separately: 5_540,
    head_of_household: 11_080,
  },
  personalExemption: {
    single: 144,
    married_filing_jointly: 288,
    married_filing_separately: 144,
    head_of_household: 144,
  },
  brackets: {
    single: [
      { upperBound: 10_756, rate: 0.01 },
      { upperBound: 25_499, rate: 0.02 },
      { upperBound: 40_245, rate: 0.04 },
      { upperBound: 55_866, rate: 0.06 },
      { upperBound: 70_606, rate: 0.08 },
      { upperBound: 360_659, rate: 0.093 },
      { upperBound: 432_787, rate: 0.103 },
      { upperBound: 721_314, rate: 0.113 },
      { upperBound: 1_000_000, rate: 0.123 },
      { rate: 0.133 }, // Mental Health Services Tax above $1M
    ],
    married_filing_jointly: [
      { upperBound: 21_512, rate: 0.01 },
      { upperBound: 50_998, rate: 0.02 },
      { upperBound: 80_490, rate: 0.04 },
      { upperBound: 111_732, rate: 0.06 },
      { upperBound: 141_212, rate: 0.08 },
      { upperBound: 721_318, rate: 0.093 },
      { upperBound: 865_574, rate: 0.103 },
      { upperBound: 1_442_628, rate: 0.113 },
      { upperBound: 2_000_000, rate: 0.123 },
      { rate: 0.133 },
    ],
    married_filing_separately: [
      { upperBound: 10_756, rate: 0.01 },
      { upperBound: 25_499, rate: 0.02 },
      { upperBound: 40_245, rate: 0.04 },
      { upperBound: 55_866, rate: 0.06 },
      { upperBound: 70_606, rate: 0.08 },
      { upperBound: 360_659, rate: 0.093 },
      { upperBound: 432_787, rate: 0.103 },
      { upperBound: 721_314, rate: 0.113 },
      { upperBound: 1_000_000, rate: 0.123 },
      { rate: 0.133 },
    ],
    head_of_household: [
      { upperBound: 21_527, rate: 0.01 },
      { upperBound: 51_000, rate: 0.02 },
      { upperBound: 65_744, rate: 0.04 },
      { upperBound: 81_364, rate: 0.06 },
      { upperBound: 96_107, rate: 0.08 },
      { upperBound: 490_493, rate: 0.093 },
      { upperBound: 588_593, rate: 0.103 },
      { upperBound: 980_987, rate: 0.113 },
      { upperBound: 1_000_000, rate: 0.123 },
      { rate: 0.133 },
    ],
  },
  specialRules: [
    "Mental Health Services Tax: additional 1% on income over $1M",
    "SDI (State Disability Insurance): 1.1% on first $153,164 of wages (employee-paid)",
    "No deduction for state income tax paid (circular)",
    "California does not conform to all federal tax provisions",
  ],
};

// CA SDI rate and wage base for 2025
const SDI_RATE = 0.011;
const SDI_WAGE_BASE = 153_164;

export const californiaTaxPlugin: StateTaxPlugin = {
  stateCode: "CA",
  displayName: "California",
  taxType: "progressive",

  calculate(input: StateTaxInput) {
    // CA starts from federal AGI with California-specific modifications
    const stateAgi = input.federalAgi;
    const standardDeduction = getStateDeduction(CA_CONSTANTS.standardDeduction, input.filingStatus);
    const personalExemption = getStateDeduction(CA_CONSTANTS.personalExemption, input.filingStatus);
    const totalDeduction = standardDeduction + personalExemption;
    const stateTaxableIncome = Math.max(0, stateAgi - totalDeduction);

    const brackets = CA_CONSTANTS.brackets[input.filingStatus] ?? CA_CONSTANTS.brackets["single"]!;
    const { tax, breakdown } = calculateProgressiveTax(stateTaxableIncome, brackets);

    // SDI is separate from income tax but relevant for total state tax burden
    // SDI is on wages only, not self-employment income
    const sdiableWages = Math.min(input.wages, SDI_WAGE_BASE);
    const sdiTax = Number((sdiableWages * SDI_RATE).toFixed(2));

    return buildStateTaxResult(CA_CONSTANTS, input, {
      stateAgi,
      stateDeduction: totalDeduction,
      stateTaxableIncome,
      stateTax: tax,
      stateCredits: 0, // CA has many credits, placeholder for now
      localTax: sdiTax, // Report SDI in the local tax field
      breakdown,
    });
  },

  validate: standardStateValidation,
};
