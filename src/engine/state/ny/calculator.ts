import type { StateTaxPlugin, StateTaxInput, StateTaxConstants } from "../types.js";
import { calculateProgressiveTax, buildStateTaxResult, getStateDeduction, standardStateValidation } from "../common.js";

export const NY_CONSTANTS: StateTaxConstants = {
  stateCode: "NY",
  displayName: "New York",
  taxType: "progressive",
  standardDeduction: {
    single: 8_000,
    married_filing_jointly: 16_050,
    married_filing_separately: 8_000,
    head_of_household: 11_200,
  },
  personalExemption: {
    single: 0,
    married_filing_jointly: 0,
    married_filing_separately: 0,
    head_of_household: 0,
  },
  brackets: {
    single: [
      { upperBound: 8_500, rate: 0.04 },
      { upperBound: 11_700, rate: 0.045 },
      { upperBound: 13_900, rate: 0.0525 },
      { upperBound: 80_650, rate: 0.0585 },
      { upperBound: 215_400, rate: 0.0625 },
      { upperBound: 1_077_550, rate: 0.0685 },
      { upperBound: 5_000_000, rate: 0.0965 },
      { upperBound: 25_000_000, rate: 0.103 },
      { rate: 0.109 },
    ],
    married_filing_jointly: [
      { upperBound: 17_150, rate: 0.04 },
      { upperBound: 23_600, rate: 0.045 },
      { upperBound: 27_900, rate: 0.0525 },
      { upperBound: 161_550, rate: 0.0585 },
      { upperBound: 323_200, rate: 0.0625 },
      { upperBound: 2_155_350, rate: 0.0685 },
      { upperBound: 5_000_000, rate: 0.0965 },
      { upperBound: 25_000_000, rate: 0.103 },
      { rate: 0.109 },
    ],
    married_filing_separately: [
      { upperBound: 8_500, rate: 0.04 },
      { upperBound: 11_700, rate: 0.045 },
      { upperBound: 13_900, rate: 0.0525 },
      { upperBound: 80_650, rate: 0.0585 },
      { upperBound: 215_400, rate: 0.0625 },
      { upperBound: 1_077_550, rate: 0.0685 },
      { upperBound: 5_000_000, rate: 0.0965 },
      { upperBound: 25_000_000, rate: 0.103 },
      { rate: 0.109 },
    ],
    head_of_household: [
      { upperBound: 12_800, rate: 0.04 },
      { upperBound: 17_650, rate: 0.045 },
      { upperBound: 20_900, rate: 0.0525 },
      { upperBound: 107_650, rate: 0.0585 },
      { upperBound: 269_300, rate: 0.0625 },
      { upperBound: 1_616_450, rate: 0.0685 },
      { upperBound: 5_000_000, rate: 0.0965 },
      { upperBound: 25_000_000, rate: 0.103 },
      { rate: 0.109 },
    ],
  },
  specialRules: [
    "NYC residents pay additional city income tax (3.078-3.876%)",
    "Yonkers residents pay 16.75% surcharge on NY state tax",
    "Metropolitan Commuter Transportation Mobility Tax for self-employed in MTA district",
    "NY does not allow deduction for state/local income taxes paid",
  ],
};

// NYC income tax brackets (resident only)
const NYC_BRACKETS = [
  { upperBound: 12_000, rate: 0.03078 },
  { upperBound: 25_000, rate: 0.03762 },
  { upperBound: 50_000, rate: 0.03819 },
  { rate: 0.03876 },
];

export const newYorkTaxPlugin: StateTaxPlugin = {
  stateCode: "NY",
  displayName: "New York",
  taxType: "progressive",

  calculate(input: StateTaxInput) {
    const stateAgi = input.federalAgi;
    const standardDeduction = getStateDeduction(NY_CONSTANTS.standardDeduction, input.filingStatus);
    const stateTaxableIncome = Math.max(0, stateAgi - standardDeduction);

    const brackets = NY_CONSTANTS.brackets[input.filingStatus] ?? NY_CONSTANTS.brackets["single"]!;
    const { tax: stateTax, breakdown } = calculateProgressiveTax(stateTaxableIncome, brackets);

    // NYC tax would be added here if we knew the taxpayer was a NYC resident
    // For now, we don't have that info — add as localTax: 0 with a note
    const localTax = 0;

    return buildStateTaxResult(NY_CONSTANTS, input, {
      stateAgi,
      stateDeduction: standardDeduction,
      stateTaxableIncome,
      stateTax,
      stateCredits: 0,
      localTax,
      breakdown,
    });
  },

  validate: standardStateValidation,
};
