import type { FilingStatus } from "../types.js";

export interface TaxBracket {
  upperBound?: number;
  rate: number;
}

export interface EitcParameters {
  qualifyingChildren: 0 | 1 | 2 | 3;
  phaseInRate: number;
  phaseOutRate: number;
  earnedIncomeAmount: number;
  maximumCredit: number;
  thresholdPhaseoutAmountMfJ: number;
  thresholdPhaseoutAmountOther: number;
  completedPhaseoutAmountMfJ: number;
  completedPhaseoutAmountOther: number;
}

export const TAX_YEAR_2025 = 2025;

export const TAX_CONSTANTS_2025_SOURCES = {
  taxBrackets: "https://www.irs.gov/filing/federal-income-tax-rates-and-brackets",
  standardDeduction:
    "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
  revProc2024_40: "https://www.irs.gov/irb/2024-45_IRB",
  childTaxCredit: "https://www.irs.gov/instructions/i1040s8",
  scheduleSe: "https://www.irs.gov/instructions/i1040sse",
  eitcTables:
    "https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/earned-income-and-earned-income-tax-credit-eitc-tables",
} as const;

export const STANDARD_DEDUCTION_2025: Record<FilingStatus, number> = {
  single: 15750,
  married_filing_jointly: 31500,
  married_filing_separately: 15750,
  head_of_household: 23625,
  qualifying_surviving_spouse: 31500,
};

export const FEDERAL_TAX_BRACKETS_2025: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { upperBound: 11925, rate: 0.1 },
    { upperBound: 48475, rate: 0.12 },
    { upperBound: 103350, rate: 0.22 },
    { upperBound: 197300, rate: 0.24 },
    { upperBound: 250525, rate: 0.32 },
    { upperBound: 626350, rate: 0.35 },
    { rate: 0.37 },
  ],
  married_filing_jointly: [
    { upperBound: 23850, rate: 0.1 },
    { upperBound: 96950, rate: 0.12 },
    { upperBound: 206700, rate: 0.22 },
    { upperBound: 394600, rate: 0.24 },
    { upperBound: 501050, rate: 0.32 },
    { upperBound: 751600, rate: 0.35 },
    { rate: 0.37 },
  ],
  married_filing_separately: [
    { upperBound: 11925, rate: 0.1 },
    { upperBound: 48475, rate: 0.12 },
    { upperBound: 103350, rate: 0.22 },
    { upperBound: 197300, rate: 0.24 },
    { upperBound: 250525, rate: 0.32 },
    { upperBound: 375800, rate: 0.35 },
    { rate: 0.37 },
  ],
  head_of_household: [
    { upperBound: 17000, rate: 0.1 },
    { upperBound: 64850, rate: 0.12 },
    { upperBound: 103350, rate: 0.22 },
    { upperBound: 197300, rate: 0.24 },
    { upperBound: 250500, rate: 0.32 },
    { upperBound: 626350, rate: 0.35 },
    { rate: 0.37 },
  ],
  qualifying_surviving_spouse: [
    { upperBound: 23850, rate: 0.1 },
    { upperBound: 96950, rate: 0.12 },
    { upperBound: 206700, rate: 0.22 },
    { upperBound: 394600, rate: 0.24 },
    { upperBound: 501050, rate: 0.32 },
    { upperBound: 751600, rate: 0.35 },
    { rate: 0.37 },
  ],
};

export const SELF_EMPLOYMENT_TAX_2025 = {
  netEarningsFactor: 0.9235,
  socialSecurityRate: 0.124,
  medicareRate: 0.029,
  socialSecurityWageBase: 176100,
  additionalMedicareRate: 0.009,
  additionalMedicareThresholds: {
    single: 200000,
    married_filing_jointly: 250000,
    married_filing_separately: 125000,
    head_of_household: 200000,
    qualifying_surviving_spouse: 200000,
  } satisfies Record<FilingStatus, number>,
} as const;

export const CHILD_TAX_CREDIT_2025 = {
  maximumPerChild: 2200,
  refundableMaximumPerChild: 1700,
  phaseoutThresholds: {
    married_filing_jointly: 400000,
    single: 200000,
    married_filing_separately: 200000,
    head_of_household: 200000,
    qualifying_surviving_spouse: 200000,
  } satisfies Record<FilingStatus, number>,
  phaseoutReductionPerThousand: 50,
  actcEarnedIncomeThreshold: 2500,
  actcEarnedIncomeRate: 0.15,
} as const;

export const EITC_PARAMETERS_2025: Record<0 | 1 | 2 | 3, EitcParameters> = {
  0: {
    qualifyingChildren: 0,
    phaseInRate: 0.0765,
    phaseOutRate: 0.0765,
    earnedIncomeAmount: 8490,
    maximumCredit: 649,
    thresholdPhaseoutAmountMfJ: 17730,
    thresholdPhaseoutAmountOther: 10620,
    completedPhaseoutAmountMfJ: 26214,
    completedPhaseoutAmountOther: 19104,
  },
  1: {
    qualifyingChildren: 1,
    phaseInRate: 0.34,
    phaseOutRate: 0.1598,
    earnedIncomeAmount: 12730,
    maximumCredit: 4328,
    thresholdPhaseoutAmountMfJ: 30470,
    thresholdPhaseoutAmountOther: 23350,
    completedPhaseoutAmountMfJ: 57554,
    completedPhaseoutAmountOther: 50434,
  },
  2: {
    qualifyingChildren: 2,
    phaseInRate: 0.4,
    phaseOutRate: 0.2106,
    earnedIncomeAmount: 17880,
    maximumCredit: 7152,
    thresholdPhaseoutAmountMfJ: 30470,
    thresholdPhaseoutAmountOther: 23350,
    completedPhaseoutAmountMfJ: 64430,
    completedPhaseoutAmountOther: 57310,
  },
  3: {
    qualifyingChildren: 3,
    phaseInRate: 0.45,
    phaseOutRate: 0.2106,
    earnedIncomeAmount: 17880,
    maximumCredit: 8046,
    thresholdPhaseoutAmountMfJ: 30470,
    thresholdPhaseoutAmountOther: 23350,
    completedPhaseoutAmountMfJ: 68675,
    completedPhaseoutAmountOther: 61555,
  },
};
