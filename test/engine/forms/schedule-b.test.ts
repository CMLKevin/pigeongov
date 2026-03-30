import { describe, expect, test } from "vitest";

import { scheduleBPlugin, type ScheduleBResult } from "../../../src/engine/forms/schedule-b.js";
import type { TaxOrchestratorInput } from "../../../src/engine/types.js";

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

describe("schedule-b plugin", () => {
  test("triggers when taxable interest exceeds $1,500", () => {
    expect(scheduleBPlugin.triggerCondition(makeInput({ taxableInterest: 1501 }))).toBe(true);
    expect(scheduleBPlugin.triggerCondition(makeInput({ taxableInterest: 1500 }))).toBe(false);
  });

  test("triggers when ordinary dividends exceed $1,500", () => {
    expect(scheduleBPlugin.triggerCondition(makeInput({ ordinaryDividends: 2000 }))).toBe(true);
    expect(scheduleBPlugin.triggerCondition(makeInput({ ordinaryDividends: 1500 }))).toBe(false);
  });

  test("does not trigger when both are at or below $1,500", () => {
    expect(
      scheduleBPlugin.triggerCondition(
        makeInput({ taxableInterest: 1500, ordinaryDividends: 1500 }),
      ),
    ).toBe(false);
  });

  test("triggers when both exceed $1,500", () => {
    expect(
      scheduleBPlugin.triggerCondition(
        makeInput({ taxableInterest: 2000, ordinaryDividends: 3000 }),
      ),
    ).toBe(true);
  });

  test("depends on core-1040", () => {
    expect(scheduleBPlugin.dependencies).toContain("core-1040");
  });

  test("calculate produces correct totals for interest-only scenario", () => {
    const input = makeInput({ taxableInterest: 5000 });
    const result = scheduleBPlugin.calculate(input, new Map()) as ScheduleBResult;

    expect(result.totalInterest).toBe(5000);
    expect(result.totalOrdinaryDividends).toBe(0);
    expect(result.interestSources).toHaveLength(1);
    expect(result.interestSources[0]!.amount).toBe(5000);
    expect(result.dividendSources).toHaveLength(0);
    expect(result.hasForeignAccountOrTrust).toBe(false);
  });

  test("calculate produces correct totals for mixed scenario", () => {
    const input = makeInput({ taxableInterest: 3000, ordinaryDividends: 4500 });
    const result = scheduleBPlugin.calculate(input, new Map()) as ScheduleBResult;

    expect(result.totalInterest).toBe(3000);
    expect(result.totalOrdinaryDividends).toBe(4500);
    expect(result.interestSources).toHaveLength(1);
    expect(result.dividendSources).toHaveLength(1);
  });

  test("validate passes when totals match input", () => {
    const input = makeInput({ taxableInterest: 3000, ordinaryDividends: 2000 });
    const result = scheduleBPlugin.calculate(input, new Map());
    const checks = scheduleBPlugin.validate(result, input);

    expect(checks.every((c) => c.passed)).toBe(true);
  });

  test("mapToFormLines includes Part I and Part II keys", () => {
    const input = makeInput({ taxableInterest: 2000, ordinaryDividends: 1800 });
    const result = scheduleBPlugin.calculate(input, new Map());
    const lines = scheduleBPlugin.mapToFormLines(result);

    expect(lines).toHaveProperty("schedule-b.part1.total");
    expect(lines).toHaveProperty("schedule-b.part2.total");
    expect(lines).toHaveProperty("schedule-b.part3.foreignAccounts");
  });
});
