import type { ValidationCheck } from "../../types.js";
import { defaultOrchestrator } from "../orchestrator.js";
import {
  calculateFederalTax,
  type TaxCalculationInput,
  type TaxCalculationResult,
} from "../tax-calculator.js";
import type { FormPlugin, TaxOrchestratorInput } from "../types.js";

// ---------------------------------------------------------------------------
// Core 1040 Plugin
//
// Wraps the existing calculateFederalTax function as a FormPlugin. This is
// the root of every federal return — it always triggers, has no dependencies,
// and every other plugin can depend on it.
// ---------------------------------------------------------------------------

function orchestratorInputToCalcInput(
  input: TaxOrchestratorInput,
): TaxCalculationInput {
  return {
    filingStatus: input.filingStatus,
    wages: input.wages,
    taxableInterest: input.taxableInterest,
    ordinaryDividends: input.ordinaryDividends,
    scheduleCNet: input.scheduleCNet,
    otherIncome: input.otherIncome,
    adjustments: {
      educatorExpenses: input.adjustments.educatorExpenses,
      hsaDeduction: input.adjustments.hsaDeduction,
      selfEmploymentTaxDeduction: input.adjustments.selfEmploymentTaxDeduction,
      iraDeduction: input.adjustments.iraDeduction,
      studentLoanInterest: input.adjustments.studentLoanInterest,
    },
    useItemizedDeductions: input.useItemizedDeductions,
    itemizedDeductions: input.itemizedDeductions,
    dependents: input.dependents,
    federalWithheld: input.federalWithheld,
    estimatedPayments: input.estimatedPayments,
  };
}

function validateCoreResult(
  result: TaxCalculationResult,
  _input: TaxOrchestratorInput,
): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // Gross income should be non-negative for most returns.
  if (result.grossIncome < 0) {
    checks.push({
      id: "core-1040-negative-gross",
      label: "Gross income is negative",
      passed: false,
      severity: "warning",
      message: `Gross income is ${result.grossIncome.toFixed(2)}, which is unusual. Verify income entries.`,
    });
  } else {
    checks.push({
      id: "core-1040-negative-gross",
      label: "Gross income is non-negative",
      passed: true,
      severity: "warning",
      message: "Gross income is non-negative.",
    });
  }

  // Effective rate sanity — should not exceed marginal rate.
  if (result.effectiveRate > result.marginalRate && result.marginalRate > 0) {
    checks.push({
      id: "core-1040-rate-sanity",
      label: "Effective rate exceeds marginal rate",
      passed: false,
      severity: "error",
      message: `Effective rate (${result.effectiveRate}) exceeds marginal rate (${result.marginalRate}).`,
    });
  } else {
    checks.push({
      id: "core-1040-rate-sanity",
      label: "Effective rate within bounds",
      passed: true,
      severity: "error",
      message: "Effective rate is within expected bounds.",
    });
  }

  // Refund and amount owed should be mutually exclusive.
  const mutuallyExclusive = result.refund === 0 || result.amountOwed === 0;
  checks.push({
    id: "core-1040-refund-owed-exclusive",
    label: "Refund and amount owed exclusivity",
    passed: mutuallyExclusive,
    severity: "error",
    message: mutuallyExclusive
      ? "Refund and amount owed are mutually exclusive."
      : "Both refund and amount owed are non-zero, which is inconsistent.",
  });

  return checks;
}

function mapCoreResultToFormLines(
  result: TaxCalculationResult,
): Record<string, unknown> {
  return {
    "1040.line1a": result.grossIncome - result.adjustedGrossIncome > 0
      ? undefined
      : undefined, // wages mapped separately by field-mapper
    "1040.line9": result.grossIncome,
    "1040.line11": result.adjustedGrossIncome,
    "1040.line12z": result.deduction,
    "1040.line13": result.taxableIncome,
    "1040.line14": result.federalTax,
    "1040.line16": result.federalTax,
    "1040.line17": result.selfEmploymentTax || undefined,
    "1040.line21": result.totalCredits || undefined,
    "1040.line24": result.totalTax,
    "1040.line27": result.earnedIncomeCredit || undefined,
    "1040.line28": result.additionalChildTaxCredit || undefined,
    "1040.line33": result.totalPayments,
    "1040.line34": result.refund || undefined,
    "1040.line37": result.amountOwed || undefined,
  };
}

export const core1040Plugin: FormPlugin = {
  formId: "core-1040",
  displayName: "Form 1040 (U.S. Individual Income Tax Return)",
  triggerCondition: () => true,
  dependencies: [],

  calculate(
    input: TaxOrchestratorInput,
    _intermediateResults: Map<string, unknown>,
  ): TaxCalculationResult {
    const calcInput = orchestratorInputToCalcInput(input);
    return calculateFederalTax(calcInput);
  },

  validate(
    result: unknown,
    input: TaxOrchestratorInput,
  ): ValidationCheck[] {
    return validateCoreResult(result as TaxCalculationResult, input);
  },

  mapToFormLines(result: unknown): Record<string, unknown> {
    return mapCoreResultToFormLines(result as TaxCalculationResult);
  },
};

// Auto-register with the default orchestrator.
defaultOrchestrator.register(core1040Plugin);
