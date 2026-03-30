import type { FilingStatus, TaxBracketBreakdown } from "../types.js";
import {
  CHILD_TAX_CREDIT_2025,
  EITC_PARAMETERS_2025,
  FEDERAL_TAX_BRACKETS_2025,
  SELF_EMPLOYMENT_TAX_2025,
  STANDARD_DEDUCTION_2025,
} from "./tax-constants-2025.js";

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
}

export interface TaxCalculationResult {
  grossIncome: number;
  adjustedGrossIncome: number;
  deduction: number;
  taxableIncome: number;
  federalTax: number;
  selfEmploymentTax: number;
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

export function calculateFederalTax(
  input: TaxCalculationInput,
): TaxCalculationResult {
  const selfEmploymentTax = calculateSelfEmploymentTax(input.scheduleCNet);
  const selfEmploymentTaxDeduction =
    input.adjustments.selfEmploymentTaxDeduction > 0
      ? input.adjustments.selfEmploymentTaxDeduction
      : roundCurrency(selfEmploymentTax / 2);
  const totalAdjustments = roundCurrency(
    input.adjustments.educatorExpenses +
      input.adjustments.hsaDeduction +
      selfEmploymentTaxDeduction +
      input.adjustments.iraDeduction +
      input.adjustments.studentLoanInterest,
  );

  const grossIncome = roundCurrency(
    input.wages +
      input.taxableInterest +
      input.ordinaryDividends +
      input.scheduleCNet +
      input.otherIncome,
  );
  const adjustedGrossIncome = roundCurrency(grossIncome - totalAdjustments);
  const deduction = roundCurrency(
    input.useItemizedDeductions
      ? input.itemizedDeductions
      : STANDARD_DEDUCTION_2025[input.filingStatus],
  );
  const taxableIncome = roundCurrency(
    maxZero(adjustedGrossIncome - deduction),
  );
  const incomeTax = calculateIncomeTax(input.filingStatus, taxableIncome);
  const childTaxCredit = calculateChildTaxCredit(
    input,
    adjustedGrossIncome,
    incomeTax.tax,
  );
  const earnedIncomeCredit = calculateEarnedIncomeCredit(
    input,
    adjustedGrossIncome,
  );

  const totalCredits = roundCurrency(
    childTaxCredit.totalChildTaxCredit + earnedIncomeCredit,
  );
  const totalTax = roundCurrency(
    maxZero(incomeTax.tax - childTaxCredit.nonRefundableChildTaxCredit) +
      selfEmploymentTax,
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

  return {
    grossIncome,
    adjustedGrossIncome,
    deduction,
    taxableIncome,
    federalTax: incomeTax.tax,
    selfEmploymentTax,
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
  };
}
