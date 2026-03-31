import type { ValidationCheck, ValidationFlag } from "../types.js";
import type { ReturnBundle } from "./field-mapper.js";

export interface ValidationResult {
  checks: ValidationCheck[];
  flaggedFields: ValidationFlag[];
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function nearlyEqual(left: number | undefined, right: number, epsilon = 0.01): boolean {
  return Math.abs((left ?? 0) - right) <= epsilon;
}

function createCheck(
  id: string,
  label: string,
  passed: boolean,
  field: string,
  expected: number,
  actual: number | undefined,
  severity: "warning" | "error" = "error",
): { check: ValidationCheck; flag?: ValidationFlag } {
  const message = passed
    ? `${label} matches.`
    : `${label} should be ${expected.toFixed(2)} but was ${(actual ?? 0).toFixed(2)}.`;

  const result: { check: ValidationCheck; flag?: ValidationFlag } = {
    check: {
      id,
      label,
      passed,
      severity,
      message,
    },
  };
  if (!passed) {
    result.flag = {
      field,
      severity,
      message,
      source: "validator",
    };
  }

  return result;
}

export function validateReturnBundle(bundle: ReturnBundle): ValidationResult {
  const checks: ValidationCheck[] = [];
  const flaggedFields: ValidationFlag[] = [];

  const totalIncomeExpected = roundCurrency(
    (bundle.form1040.lines.line1a ?? 0) +
      (bundle.form1040.lines.line2b ?? 0) +
      (bundle.form1040.lines.line3b ?? 0) +
      (bundle.form1040.lines.line7 ?? 0) +
      (bundle.form1040.lines.line8 ?? 0),
  );
  const totalIncomeCheck = createCheck(
    "income-total",
    "Form 1040 line 9 total income",
    nearlyEqual(bundle.form1040.lines.line9, totalIncomeExpected),
    "form1040.lines.line9",
    totalIncomeExpected,
    bundle.form1040.lines.line9,
  );
  checks.push(totalIncomeCheck.check);
  if (totalIncomeCheck.flag) flaggedFields.push(totalIncomeCheck.flag);

  const agiExpected = roundCurrency(
    (bundle.form1040.lines.line9 ?? 0) - (bundle.form1040.lines.line10 ?? 0),
  );
  const agiCheck = createCheck(
    "agi",
    "Form 1040 line 11 adjusted gross income",
    nearlyEqual(bundle.form1040.lines.line11, agiExpected),
    "form1040.lines.line11",
    agiExpected,
    bundle.form1040.lines.line11,
  );
  checks.push(agiCheck.check);
  if (agiCheck.flag) flaggedFields.push(agiCheck.flag);

  const deductionExpected = roundCurrency(
    (bundle.form1040.lines.line12a ?? 0) + (bundle.form1040.lines.line12b ?? 0),
  );
  const deductionCheck = createCheck(
    "deduction-total",
    "Form 1040 line 12z deduction",
    nearlyEqual(bundle.form1040.lines.line12z, deductionExpected),
    "form1040.lines.line12z",
    deductionExpected,
    bundle.form1040.lines.line12z,
  );
  checks.push(deductionCheck.check);
  if (deductionCheck.flag) flaggedFields.push(deductionCheck.flag);

  const taxableIncomeExpected = roundCurrency(
    Math.max(0, (bundle.form1040.lines.line11 ?? 0) - (bundle.form1040.lines.line12z ?? 0)),
  );
  const taxableCheck = createCheck(
    "taxable-income",
    "Form 1040 line 13 taxable income",
    nearlyEqual(bundle.form1040.lines.line13, taxableIncomeExpected),
    "form1040.lines.line13",
    taxableIncomeExpected,
    bundle.form1040.lines.line13,
  );
  checks.push(taxableCheck.check);
  if (taxableCheck.flag) flaggedFields.push(taxableCheck.flag);

  const totalTaxExpected = roundCurrency(
    Math.max(0, (bundle.form1040.lines.line16 ?? 0) - (bundle.form1040.lines.line21 ?? 0)) +
      (bundle.form1040.lines.line17 ?? 0) +
      (bundle.calculation.niitTax ?? 0),
  );
  const totalTaxCheck = createCheck(
    "total-tax",
    "Form 1040 line 24 total tax",
    nearlyEqual(bundle.form1040.lines.line24, totalTaxExpected),
    "form1040.lines.line24",
    totalTaxExpected,
    bundle.form1040.lines.line24,
  );
  checks.push(totalTaxCheck.check);
  if (totalTaxCheck.flag) flaggedFields.push(totalTaxCheck.flag);

  const paymentsExpected = roundCurrency(
    (bundle.form1040.lines.line25a ?? 0) +
      (bundle.form1040.lines.line25b ?? 0) +
      (bundle.form1040.lines.line26 ?? 0) +
      (bundle.form1040.lines.line27 ?? 0) +
      (bundle.form1040.lines.line28 ?? 0) +
      (bundle.form1040.lines.line31 ?? 0),
  );
  const paymentsCheck = createCheck(
    "payments-total",
    "Form 1040 line 33 total payments",
    nearlyEqual(bundle.form1040.lines.line33, paymentsExpected),
    "form1040.lines.line33",
    paymentsExpected,
    bundle.form1040.lines.line33,
  );
  checks.push(paymentsCheck.check);
  if (paymentsCheck.flag) flaggedFields.push(paymentsCheck.flag);

  const refundVsOwedPassed =
    (bundle.form1040.lines.line34 ?? 0) === 0 || (bundle.form1040.lines.line37 ?? 0) === 0;
  const refundVsOwedMessage = refundVsOwedPassed
    ? "Refund and amount owed are mutually exclusive."
    : "A return cannot show both a refund and an amount owed.";
  checks.push({
    id: "refund-exclusive",
    label: "Refund and amount owed exclusivity",
    passed: refundVsOwedPassed,
    severity: "error",
    message: refundVsOwedMessage,
  });
  if (!refundVsOwedPassed) {
    flaggedFields.push({
      field: "form1040.lines.line34",
      severity: "error",
      message: refundVsOwedMessage,
      source: "validator",
    });
    flaggedFields.push({
      field: "form1040.lines.line37",
      severity: "error",
      message: refundVsOwedMessage,
      source: "validator",
    });
  }

  if (bundle.scheduleC) {
    const scheduleConsistency = createCheck(
      "schedule-c-net",
      "Schedule C net profit consistency",
      nearlyEqual(
        bundle.schedule1.additionalIncome.line3BusinessIncomeOrLoss,
        bundle.scheduleC.netProfitOrLoss ?? 0,
      ),
      "schedule1.additionalIncome.line3BusinessIncomeOrLoss",
      bundle.scheduleC.netProfitOrLoss ?? 0,
      bundle.schedule1.additionalIncome.line3BusinessIncomeOrLoss,
      "warning",
    );
    checks.push(scheduleConsistency.check);
    if (scheduleConsistency.flag) flaggedFields.push(scheduleConsistency.flag);
  }

  return {
    checks,
    flaggedFields,
  };
}
