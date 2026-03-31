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
  obbbAct:
    "https://www.congress.gov/bill/119th-congress/house-bill/1",
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
  refundableMaximumPerChild: 1900,
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

/**
 * OBBB Act — SALT cap raised from $10,000 flat to $40,000 MFJ/$20,000 MFS.
 * Signed into law July 4 2025, effective tax year 2025.
 */
export const SALT_CAP_2025: Record<FilingStatus, number> = {
  single: 40000,
  married_filing_jointly: 40000,
  married_filing_separately: 20000,
  head_of_household: 40000,
  qualifying_surviving_spouse: 40000,
};

/**
 * OBBB Act — additional standard deduction for taxpayers age 65+.
 * $2,000 for single/HoH, $1,600 per qualifying spouse for MFJ/MFS/QSS.
 */
export const SENIOR_STANDARD_DEDUCTION_2025 = {
  singleOrHoH: 2000,
  marriedPerPerson: 1600,
} as const;

/**
 * OBBB Act — new above-the-line deductions that reduce AGI.
 * All have AGI phase-out thresholds: the deduction is allowed only when AGI
 * (computed *before* these deductions) is below the threshold.
 */
export const OBBB_ABOVE_LINE_DEDUCTIONS_2025 = {
  tipIncome: {
    maxDeduction: 25000,
    agiThreshold: 160000,
  },
  overtimePay: {
    maxDeduction: 10000,
    agiThreshold: 160000,
  },
  autoLoanInterest: {
    maxDeduction: 10000,
    agiThresholds: {
      single: 100000,
      married_filing_jointly: 200000,
      married_filing_separately: 100000,
      head_of_household: 100000,
      qualifying_surviving_spouse: 200000,
    } satisfies Record<FilingStatus, number>,
  },
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

// --- Capital Gains Rate Thresholds (2025) ---

export interface LtcgBracket {
  rate: number;
  upperBound?: number;
}

/**
 * Long-term capital gains and qualified dividends rate thresholds for 2025.
 *
 * Source: Rev. Proc. 2024-40, Section 3.01
 * These thresholds apply to taxable income (including the LTCG/QD themselves).
 */
export const LTCG_RATE_THRESHOLDS_2025: Record<FilingStatus, LtcgBracket[]> = {
  single: [
    { rate: 0, upperBound: 48350 },
    { rate: 0.15, upperBound: 533400 },
    { rate: 0.2 },
  ],
  married_filing_jointly: [
    { rate: 0, upperBound: 96700 },
    { rate: 0.15, upperBound: 600050 },
    { rate: 0.2 },
  ],
  married_filing_separately: [
    { rate: 0, upperBound: 48350 },
    { rate: 0.15, upperBound: 300025 },
    { rate: 0.2 },
  ],
  head_of_household: [
    { rate: 0, upperBound: 64750 },
    { rate: 0.15, upperBound: 566700 },
    { rate: 0.2 },
  ],
  qualifying_surviving_spouse: [
    { rate: 0, upperBound: 96700 },
    { rate: 0.15, upperBound: 600050 },
    { rate: 0.2 },
  ],
};

/**
 * Net Investment Income Tax (NIIT) — IRC § 1411
 * 3.8% on the lesser of net investment income or excess of MAGI over threshold.
 */
export const NIIT_2025 = {
  rate: 0.038,
  thresholds: {
    single: 200000,
    married_filing_jointly: 250000,
    married_filing_separately: 125000,
    head_of_household: 200000,
    qualifying_surviving_spouse: 250000,
  } satisfies Record<FilingStatus, number>,
} as const;

/**
 * Capital loss deduction limit against ordinary income.
 * $3,000 per year ($1,500 for married filing separately).
 */
export const CAPITAL_LOSS_LIMIT_2025: Record<FilingStatus, number> = {
  single: 3000,
  married_filing_jointly: 3000,
  married_filing_separately: 1500,
  head_of_household: 3000,
  qualifying_surviving_spouse: 3000,
};
