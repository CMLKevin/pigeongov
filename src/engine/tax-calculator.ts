import type { FilingStatus, TaxBracketBreakdown } from "../types.js";
import {
  calculateCapitalGains,
  type CapitalGainsInput,
  type CapitalGainsResult,
} from "./capital-gains.js";
export type { CapitalGainsInput, CapitalGainsResult } from "./capital-gains.js";
import {
  CHILD_TAX_CREDIT_2025,
  EITC_PARAMETERS_2025,
  FEDERAL_TAX_BRACKETS_2025,
  OBBB_ABOVE_LINE_DEDUCTIONS_2025,
  SALT_CAP_2025,
  SELF_EMPLOYMENT_TAX_2025,
  SENIOR_STANDARD_DEDUCTION_2025,
  STANDARD_DEDUCTION_2025,
} from "./tax-constants-2025.js";
import {
  calculateStateTax,
  type StateTaxIntegrationResult,
} from "./state-tax-integration.js";

export interface TaxCalculationInput {
  filingStatus: FilingStatus;
  wages: number;
  taxableInterest: number;
  ordinaryDividends: number;
  scheduleCNet: number;
  otherIncome: number;
  adjustments: {
    educatorExpenses: number;
    hsaDeduction: number;
    selfEmploymentTaxDeduction: number;
    iraDeduction: number;
    studentLoanInterest: number;
  };
  useItemizedDeductions: boolean;
  itemizedDeductions: number;
  dependents: {
    name: string;
    ssn: string;
    relationship: string;
    childTaxCreditEligible: boolean;
    eitcEligible?: boolean | undefined;
  }[];
  federalWithheld: number;
  estimatedPayments: number;

  // Capital gains (from Capital Gains agent)
  capitalGains?: CapitalGainsInput | undefined;

  // OBBB Act fields — all optional with 0 defaults for backward compatibility
  /** W-2 reported tip income eligible for above-the-line deduction */
  tipIncome?: number | undefined;
  /** W-2 overtime pay eligible for above-the-line deduction */
  overtimePay?: number | undefined;
  /** Interest paid on auto loan for US-manufactured vehicle */
  autoLoanInterest?: number | undefined;
  /** Taxpayer age (for senior standard deduction; 0 if N/A) */
  taxpayerAge?: number | undefined;
  /** Spouse age for MFJ senior standard deduction */
  spouseAge?: number | undefined;
  /** State and local tax deduction amount (will be capped at SALT cap) */
  saltDeduction?: number | undefined;

  // State tax fields (from State Tax agent)
  /** Two-letter state code for state tax calculation (optional) */
  stateCode?: string | undefined;
  /** State income tax withheld from W-2 (optional) */
  stateWithheld?: number | undefined;
  /** State estimated tax payments (optional) */
  stateEstimatedPayments?: number | undefined;
}

export interface TaxCalculationResult {
  grossIncome: number;
  adjustedGrossIncome: number;
  deduction: number;
  taxableIncome: number;
  federalTax: number;
  selfEmploymentTax: number;
  capitalGainsTax: number;
  niitTax: number;
  totalTax: number;
  totalCredits: number;
  childTaxCredit: number;
  earnedIncomeCredit: number;
  additionalChildTaxCredit: number;
  totalPayments: number;
  amountOwed: number;
  refund: number;
  effectiveRate: number;
  marginalRate: number;
  breakdown: TaxBracketBreakdown[];
  capitalGainsDetail?: CapitalGainsResult | undefined;

  // OBBB Act deduction details
  tipIncomeDeduction: number;
  overtimePayDeduction: number;
  autoLoanInterestDeduction: number;
  seniorStandardDeduction: number;
  saltDeductionApplied: number;

  /** State tax result — present when stateCode was provided */
  stateTax?: StateTaxIntegrationResult | undefined;
}

interface IncomeTaxComputation {
  tax: number;
  marginalRate: number;
  breakdown: TaxBracketBreakdown[];
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function maxZero(value: number): number {
  return value < 0 ? 0 : value;
}

function determineQualifyingChildCount(
  dependents: TaxCalculationInput["dependents"],
  key: "childTaxCreditEligible" | "eitcEligible",
): 0 | 1 | 2 | 3 {
  const total = dependents.filter((dependent) => Boolean(dependent[key])).length;
  return Math.min(total, 3) as 0 | 1 | 2 | 3;
}

export function calculateSelfEmploymentTax(scheduleCNet: number): number {
  if (scheduleCNet <= 0) {
    return 0;
  }

  const netEarnings =
    scheduleCNet * SELF_EMPLOYMENT_TAX_2025.netEarningsFactor;
  const socialSecurityTax =
    Math.min(netEarnings, SELF_EMPLOYMENT_TAX_2025.socialSecurityWageBase) *
    SELF_EMPLOYMENT_TAX_2025.socialSecurityRate;
  const medicareTax =
    netEarnings * SELF_EMPLOYMENT_TAX_2025.medicareRate;

  return roundCurrency(socialSecurityTax + medicareTax);
}

export function calculateIncomeTax(
  filingStatus: FilingStatus,
  taxableIncome: number,
): IncomeTaxComputation {
  const brackets = FEDERAL_TAX_BRACKETS_2025[filingStatus];
  const roundedTaxableIncome = maxZero(taxableIncome);
  const breakdown: TaxBracketBreakdown[] = [];
  let previousUpperBound = 0;
  let tax = 0;
  let marginalRate = 0;

  for (const bracket of brackets) {
    const currentUpperBound = bracket.upperBound ?? roundedTaxableIncome;
    const taxableAmount =
      Math.min(roundedTaxableIncome, currentUpperBound) - previousUpperBound;

    if (taxableAmount > 0) {
      const taxAmount = taxableAmount * bracket.rate;
      const breakdownEntry: TaxBracketBreakdown = {
        rate: bracket.rate,
        lowerBound: previousUpperBound,
        taxableAmount: roundCurrency(taxableAmount),
        taxAmount: roundCurrency(taxAmount),
      };
      if (bracket.upperBound !== undefined) {
        breakdownEntry.upperBound = bracket.upperBound;
      }
      breakdown.push(breakdownEntry);
      tax += taxAmount;
      marginalRate = bracket.rate;
    }

    previousUpperBound = currentUpperBound;

    if (bracket.upperBound === undefined || roundedTaxableIncome <= currentUpperBound) {
      break;
    }
  }

  return {
    tax: roundCurrency(tax),
    marginalRate,
    breakdown,
  };
}

function calculateChildTaxCredit(
  input: TaxCalculationInput,
  adjustedGrossIncome: number,
  federalTax: number,
): {
  totalChildTaxCredit: number;
  nonRefundableChildTaxCredit: number;
  additionalChildTaxCredit: number;
} {
  const qualifyingChildren = input.dependents.filter(
    (dependent) => dependent.childTaxCreditEligible,
  ).length;

  if (qualifyingChildren === 0) {
    return {
      totalChildTaxCredit: 0,
      nonRefundableChildTaxCredit: 0,
      additionalChildTaxCredit: 0,
    };
  }

  const threshold =
    CHILD_TAX_CREDIT_2025.phaseoutThresholds[input.filingStatus];
  const phaseoutReduction =
    adjustedGrossIncome > threshold
      ? Math.ceil((adjustedGrossIncome - threshold) / 1000) *
        CHILD_TAX_CREDIT_2025.phaseoutReductionPerThousand
      : 0;

  const maximumCredit =
    qualifyingChildren * CHILD_TAX_CREDIT_2025.maximumPerChild;
  const availableCredit = maxZero(maximumCredit - phaseoutReduction);
  const nonRefundableChildTaxCredit = Math.min(availableCredit, federalTax);

  const earnedIncome = input.wages + maxZero(input.scheduleCNet);
  const refundableLimit =
    qualifyingChildren * CHILD_TAX_CREDIT_2025.refundableMaximumPerChild;
  const refundableEarnedIncomeComponent =
    maxZero(
      earnedIncome - CHILD_TAX_CREDIT_2025.actcEarnedIncomeThreshold,
    ) * CHILD_TAX_CREDIT_2025.actcEarnedIncomeRate;
  const additionalChildTaxCredit = Math.min(
    refundableLimit,
    maxZero(availableCredit - nonRefundableChildTaxCredit),
    refundableEarnedIncomeComponent,
  );

  return {
    totalChildTaxCredit: roundCurrency(
      nonRefundableChildTaxCredit + additionalChildTaxCredit,
    ),
    nonRefundableChildTaxCredit: roundCurrency(nonRefundableChildTaxCredit),
    additionalChildTaxCredit: roundCurrency(additionalChildTaxCredit),
  };
}

function calculateEarnedIncomeCredit(
  input: TaxCalculationInput,
  adjustedGrossIncome: number,
): number {
  if (input.filingStatus === "married_filing_separately") {
    return 0;
  }

  const qualifyingChildren = determineQualifyingChildCount(
    input.dependents,
    "eitcEligible",
  );
  const params = EITC_PARAMETERS_2025[qualifyingChildren];
  const earnedIncome = input.wages + maxZero(input.scheduleCNet);

  if (earnedIncome <= 0) {
    return 0;
  }

  const phaseInCredit = Math.min(
    params.maximumCredit,
    earnedIncome * params.phaseInRate,
  );
  const threshold =
    input.filingStatus === "married_filing_jointly"
      ? params.thresholdPhaseoutAmountMfJ
      : params.thresholdPhaseoutAmountOther;
  const phaseoutBase = Math.max(earnedIncome, adjustedGrossIncome);
  const phaseoutAmount = maxZero(phaseoutBase - threshold) * params.phaseOutRate;

  return roundCurrency(maxZero(phaseInCredit - phaseoutAmount));
}

/**
 * Calculate OBBB Act above-the-line deductions.
 *
 * These reduce AGI. The trick: the AGI threshold is checked against
 * "preliminary AGI" (gross income minus traditional adjustments, *before*
 * the OBBB deductions themselves). This prevents circular dependency.
 */
function calculateObbbDeductions(
  input: TaxCalculationInput,
  preliminaryAgi: number,
): {
  tipIncomeDeduction: number;
  overtimePayDeduction: number;
  autoLoanInterestDeduction: number;
} {
  const tipIncome = input.tipIncome ?? 0;
  const overtimePay = input.overtimePay ?? 0;
  const autoLoanInterest = input.autoLoanInterest ?? 0;

  const tipCfg = OBBB_ABOVE_LINE_DEDUCTIONS_2025.tipIncome;
  const tipIncomeDeduction =
    preliminaryAgi < tipCfg.agiThreshold
      ? Math.min(tipIncome, tipCfg.maxDeduction)
      : 0;

  const otCfg = OBBB_ABOVE_LINE_DEDUCTIONS_2025.overtimePay;
  const overtimePayDeduction =
    preliminaryAgi < otCfg.agiThreshold
      ? Math.min(overtimePay, otCfg.maxDeduction)
      : 0;

  const autoCfg = OBBB_ABOVE_LINE_DEDUCTIONS_2025.autoLoanInterest;
  const autoThreshold = autoCfg.agiThresholds[input.filingStatus];
  const autoLoanInterestDeduction =
    preliminaryAgi < autoThreshold
      ? Math.min(autoLoanInterest, autoCfg.maxDeduction)
      : 0;

  return {
    tipIncomeDeduction: roundCurrency(tipIncomeDeduction),
    overtimePayDeduction: roundCurrency(overtimePayDeduction),
    autoLoanInterestDeduction: roundCurrency(autoLoanInterestDeduction),
  };
}

/**
 * Calculate the additional standard deduction for seniors (age 65+).
 */
function calculateSeniorDeduction(input: TaxCalculationInput): number {
  const taxpayerAge = input.taxpayerAge ?? 0;
  const spouseAge = input.spouseAge ?? 0;
  const isMfj =
    input.filingStatus === "married_filing_jointly" ||
    input.filingStatus === "married_filing_separately" ||
    input.filingStatus === "qualifying_surviving_spouse";

  let seniorAmount = 0;

  if (isMfj) {
    if (taxpayerAge >= 65) {
      seniorAmount += SENIOR_STANDARD_DEDUCTION_2025.marriedPerPerson;
    }
    if (spouseAge >= 65) {
      seniorAmount += SENIOR_STANDARD_DEDUCTION_2025.marriedPerPerson;
    }
  } else {
    if (taxpayerAge >= 65) {
      seniorAmount += SENIOR_STANDARD_DEDUCTION_2025.singleOrHoH;
    }
  }

  return seniorAmount;
}

export function calculateFederalTax(
  input: TaxCalculationInput,
): TaxCalculationResult {
  // ── Step 1: Self-employment tax ──
  const selfEmploymentTax = calculateSelfEmploymentTax(input.scheduleCNet);
  const selfEmploymentTaxDeduction =
    input.adjustments.selfEmploymentTaxDeduction > 0
      ? input.adjustments.selfEmploymentTaxDeduction
      : roundCurrency(selfEmploymentTax / 2);

  // ── Step 2: OBBB above-the-line deductions ──
  // Traditional (pre-OBBB) adjustments
  const traditionalAdjustments = roundCurrency(
    input.adjustments.educatorExpenses +
      input.adjustments.hsaDeduction +
      selfEmploymentTaxDeduction +
      input.adjustments.iraDeduction +
      input.adjustments.studentLoanInterest,
  );

  // ── Step 3: Gross income (including capital gains) ──
  const cg = input.capitalGains;
  const hasCapitalGains =
    cg !== undefined &&
    (cg.shortTermGains !== 0 ||
      cg.shortTermLosses !== 0 ||
      cg.longTermGains !== 0 ||
      cg.longTermLosses !== 0 ||
      cg.qualifiedDividends !== 0 ||
      cg.carryforwardLoss !== 0);

  // Pre-compute net gain/loss for gross income
  let capitalGainForGrossIncome = 0;
  let capitalLossDeduction = 0;
  let capitalGainsDetail: CapitalGainsResult | undefined;

  if (hasCapitalGains && cg) {
    const prelimNetting = calculateCapitalGains(
      cg,
      input.filingStatus,
      0,
      0,
    );
    if (prelimNetting.totalNetGain > 0) {
      capitalGainForGrossIncome = prelimNetting.totalNetGain;
    } else {
      capitalLossDeduction = prelimNetting.capitalLossDeduction;
    }
  }

  const grossIncome = roundCurrency(
    input.wages +
      input.taxableInterest +
      input.ordinaryDividends +
      input.scheduleCNet +
      input.otherIncome +
      capitalGainForGrossIncome,
  );

  // ── Step 4: AGI (with OBBB deductions) ──
  // Preliminary AGI (before OBBB deductions) for phase-out testing
  const preliminaryAgi = roundCurrency(grossIncome - traditionalAdjustments - capitalLossDeduction);

  // OBBB above-the-line deductions
  const obbb = calculateObbbDeductions(input, preliminaryAgi);
  const totalObbbDeductions = roundCurrency(
    obbb.tipIncomeDeduction +
      obbb.overtimePayDeduction +
      obbb.autoLoanInterestDeduction,
  );

  const totalAdjustments = roundCurrency(
    traditionalAdjustments + totalObbbDeductions,
  );
  const adjustedGrossIncome = roundCurrency(grossIncome - totalAdjustments - capitalLossDeduction);

  // ── Step 5: Deductions (with SALT cap + senior) ──
  // Senior standard deduction addition (only applies to standard deduction)
  const seniorStandardDeduction = input.useItemizedDeductions
    ? 0
    : calculateSeniorDeduction(input);

  // SALT cap for itemized deductions
  const saltInput = input.saltDeduction ?? 0;
  const saltCap = SALT_CAP_2025[input.filingStatus];
  const saltDeductionApplied = Math.min(saltInput, saltCap);

  const effectiveItemizedDeductions =
    saltInput > 0
      ? roundCurrency(input.itemizedDeductions - saltInput + saltDeductionApplied)
      : input.itemizedDeductions;

  const deduction = roundCurrency(
    input.useItemizedDeductions
      ? effectiveItemizedDeductions
      : STANDARD_DEDUCTION_2025[input.filingStatus] + seniorStandardDeduction,
  );

  // ── Step 6: Taxable income ──
  const taxableIncome = roundCurrency(
    maxZero(adjustedGrossIncome - deduction),
  );

  // ── Step 7: Income tax (split ordinary vs preferential for capital gains) ──
  let ordinaryTaxableIncome = taxableIncome;
  let capitalGainsTax = 0;
  let niitTax = 0;

  if (hasCapitalGains && cg) {
    const cgResult = calculateCapitalGains(
      cg,
      input.filingStatus,
      0,
      adjustedGrossIncome,
      input.taxableInterest,
      input.ordinaryDividends,
    );
    capitalGainsDetail = cgResult;

    const preferentialIncome = maxZero(cgResult.netLongTerm) + cg.qualifiedDividends;
    ordinaryTaxableIncome = roundCurrency(maxZero(taxableIncome - preferentialIncome));

    // Re-run LTCG tax with the correct ordinary taxable income base
    const ltcgTax = calculateCapitalGains(
      cg,
      input.filingStatus,
      ordinaryTaxableIncome,
      adjustedGrossIncome,
      input.taxableInterest,
      input.ordinaryDividends,
    );
    capitalGainsDetail = ltcgTax;

    capitalGainsTax = roundCurrency(
      ltcgTax.longTermCapitalGainsTax + ltcgTax.qualifiedDividendsTax,
    );
    niitTax = ltcgTax.netInvestmentIncomeTax;
  }

  const incomeTax = calculateIncomeTax(input.filingStatus, ordinaryTaxableIncome);

  // ── Step 8: Credits ──
  const childTaxCredit = calculateChildTaxCredit(
    input,
    adjustedGrossIncome,
    incomeTax.tax + capitalGainsTax,
  );
  const earnedIncomeCredit = calculateEarnedIncomeCredit(
    input,
    adjustedGrossIncome,
  );

  // ── Step 9: Total tax ──
  const totalCredits = roundCurrency(
    childTaxCredit.totalChildTaxCredit + earnedIncomeCredit,
  );
  const totalTax = roundCurrency(
    maxZero(
      incomeTax.tax + capitalGainsTax - childTaxCredit.nonRefundableChildTaxCredit,
    ) +
      selfEmploymentTax +
      niitTax,
  );
  const totalPayments = roundCurrency(
    input.federalWithheld +
      input.estimatedPayments +
      earnedIncomeCredit +
      childTaxCredit.additionalChildTaxCredit,
  );
  const refund = roundCurrency(maxZero(totalPayments - totalTax));
  const amountOwed = roundCurrency(maxZero(totalTax - totalPayments));
  const effectiveRate =
    grossIncome === 0 ? 0 : roundCurrency(totalTax / grossIncome);

  // ── Step 10: State tax ──
  let stateResult: StateTaxIntegrationResult | undefined;
  if (input.stateCode) {
    stateResult = calculateStateTax({
      state: input.stateCode,
      federalAGI: adjustedGrossIncome,
      federalTaxableIncome: taxableIncome,
      wages: input.wages,
      filingStatus: input.filingStatus,
      dependents: input.dependents.length,
      itemizedDeductions: input.itemizedDeductions,
      stateWithheld: input.stateWithheld ?? 0,
      stateEstimatedPayments: input.stateEstimatedPayments ?? 0,
      propertyTaxPaid: 0,
      mortgageInterest: 0,
      charitableContributions: 0,
    });
  }

  const result: TaxCalculationResult = {
    grossIncome,
    adjustedGrossIncome,
    deduction,
    taxableIncome,
    federalTax: incomeTax.tax,
    selfEmploymentTax,
    capitalGainsTax,
    niitTax,
    totalTax,
    totalCredits,
    childTaxCredit: childTaxCredit.totalChildTaxCredit,
    earnedIncomeCredit,
    additionalChildTaxCredit: childTaxCredit.additionalChildTaxCredit,
    totalPayments,
    amountOwed,
    refund,
    effectiveRate,
    marginalRate: incomeTax.marginalRate,
    breakdown: incomeTax.breakdown,
    capitalGainsDetail,
    tipIncomeDeduction: obbb.tipIncomeDeduction,
    overtimePayDeduction: obbb.overtimePayDeduction,
    autoLoanInterestDeduction: obbb.autoLoanInterestDeduction,
    seniorStandardDeduction,
    saltDeductionApplied,
  };

  if (stateResult) {
    result.stateTax = stateResult;
  }

  return result;
}
