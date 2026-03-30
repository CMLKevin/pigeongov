import { describe, expect, test } from "vitest";

import { core1040Plugin } from "../../../src/engine/forms/core-1040.js";
import type { TaxOrchestratorInput } from "../../../src/engine/types.js";
import type { TaxCalculationResult } from "../../../src/engine/tax-calculator.js";

function makeInput(
  overrides: Partial<TaxOrchestratorInput> = {},
): TaxOrchestratorInput {
  return {
    filingStatus: "single",
    wages: 50000,
    taxableInterest: 0,
    ordinaryDividends: 0,
    scheduleCNet: 0,
    otherIncome: 0,
    adjustments: {
      educatorExpenses: 0,
      hsaDeduction: 0,
      selfEmploymentTaxDeduction: 0,
      iraDeduction: 0,
      studentLoanInterest: 0,
    },
    useItemizedDeductions: false,
    itemizedDeductions: 0,
    dependents: [],
    federalWithheld: 6200,
    estimatedPayments: 0,
    ...overrides,
  };
}

describe("core-1040 plugin", () => {
  test("formId is core-1040", () => {
    expect(core1040Plugin.formId).toBe("core-1040");
  });

  test("triggerCondition always returns true", () => {
    expect(core1040Plugin.triggerCondition(makeInput())).toBe(true);
    expect(
      core1040Plugin.triggerCondition(makeInput({ wages: 0 })),
    ).toBe(true);
  });

  test("has no dependencies", () => {
    expect(core1040Plugin.dependencies).toEqual([]);
  });

  test("calculate produces a TaxCalculationResult matching calculateFederalTax", () => {
    const input = makeInput();
    const result = core1040Plugin.calculate(input, new Map()) as TaxCalculationResult;

    expect(result.grossIncome).toBe(50000);
    expect(result.adjustedGrossIncome).toBe(50000);
    expect(result.deduction).toBe(15750);
    expect(result.taxableIncome).toBe(34250);
    expect(result.federalTax).toBeGreaterThan(0);
    expect(result.refund).toBeGreaterThanOrEqual(0);
    expect(result.amountOwed).toBeGreaterThanOrEqual(0);
  });

  test("calculate with MFJ and dependents produces child tax credits", () => {
    const input = makeInput({
      filingStatus: "married_filing_jointly",
      wages: 120000,
      federalWithheld: 15000,
      dependents: [
        { name: "Child A", ssn: "111-22-3333", relationship: "child", childTaxCreditEligible: true },
        { name: "Child B", ssn: "444-55-6666", relationship: "child", childTaxCreditEligible: true },
      ],
    });

    const result = core1040Plugin.calculate(input, new Map()) as TaxCalculationResult;

    expect(result.childTaxCredit).toBeGreaterThan(0);
    expect(result.totalCredits).toBeGreaterThan(0);
  });

  test("validate returns passing checks for a normal return", () => {
    const input = makeInput();
    const result = core1040Plugin.calculate(input, new Map());
    const checks = core1040Plugin.validate(result, input);

    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  test("validate warns on negative gross income", () => {
    const input = makeInput({
      wages: 0,
      scheduleCNet: -5000,
    });
    const result = core1040Plugin.calculate(input, new Map());
    const checks = core1040Plugin.validate(result, input);

    const negativeCheck = checks.find((c) => c.id === "core-1040-negative-gross");
    expect(negativeCheck).toBeDefined();
    expect(negativeCheck!.passed).toBe(false);
    expect(negativeCheck!.severity).toBe("warning");
  });

  test("mapToFormLines produces expected 1040 line keys", () => {
    const input = makeInput();
    const result = core1040Plugin.calculate(input, new Map());
    const lines = core1040Plugin.mapToFormLines(result);

    expect(lines).toHaveProperty("1040.line9");
    expect(lines).toHaveProperty("1040.line11");
    expect(lines).toHaveProperty("1040.line13");
    expect(lines).toHaveProperty("1040.line24");
    expect(lines).toHaveProperty("1040.line33");
  });
});
