import { describe, expect, test } from "vitest";

import {
  scheduleDPlugin,
  type ScheduleDResult,
} from "../../../src/engine/forms/schedule-d.js";
import type { Form8949Result } from "../../../src/engine/forms/form-8949.js";
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

function make8949Result(overrides: Partial<Form8949Result> = {}): Form8949Result {
  return {
    shortTermTransactions: [],
    longTermTransactions: [],
    totalShortTermProceeds: 0,
    totalShortTermCostBasis: 0,
    totalShortTermGainOrLoss: 0,
    totalLongTermProceeds: 0,
    totalLongTermCostBasis: 0,
    totalLongTermGainOrLoss: 0,
    ...overrides,
  };
}

describe("schedule-d plugin", () => {
  test("triggers when capitalGains transactions exist", () => {
    const input = makeInput({
      capitalGains: {
        transactions: [
          {
            description: "A",
            dateAcquired: "2024-01-01",
            dateSold: "2025-01-01",
            proceeds: 10000,
            costBasis: 8000,
            shortTerm: false,
          },
        ],
      },
    });
    expect(scheduleDPlugin.triggerCondition(input)).toBe(true);
  });

  test("does not trigger without capitalGains", () => {
    expect(scheduleDPlugin.triggerCondition(makeInput())).toBe(false);
  });

  test("depends on form-8949", () => {
    expect(scheduleDPlugin.dependencies).toContain("form-8949");
  });

  test("aggregates a net capital gain from form-8949 results", () => {
    const intermediateResults = new Map<string, unknown>();
    intermediateResults.set(
      "form-8949",
      make8949Result({
        totalShortTermGainOrLoss: 2000,
        totalLongTermGainOrLoss: 5000,
      }),
    );

    const result = scheduleDPlugin.calculate(
      makeInput({ capitalGains: { transactions: [] } }),
      intermediateResults,
    ) as ScheduleDResult;

    expect(result.shortTermGainOrLoss).toBe(2000);
    expect(result.longTermGainOrLoss).toBe(5000);
    expect(result.netCapitalGainOrLoss).toBe(7000);
    expect(result.taxableCapitalGain).toBe(7000);
    expect(result.capitalLossCarryover).toBe(0);
  });

  test("applies $3,000 capital loss limitation", () => {
    const intermediateResults = new Map<string, unknown>();
    intermediateResults.set(
      "form-8949",
      make8949Result({
        totalShortTermGainOrLoss: -1000,
        totalLongTermGainOrLoss: -5000,
      }),
    );

    const result = scheduleDPlugin.calculate(
      makeInput({ capitalGains: { transactions: [] } }),
      intermediateResults,
    ) as ScheduleDResult;

    expect(result.netCapitalGainOrLoss).toBe(-6000);
    expect(result.taxableCapitalGain).toBe(-3000); // only $3k deductible
    expect(result.capitalLossCarryover).toBe(3000); // remainder carries over
  });

  test("capital loss exactly $3,000 — no carryover", () => {
    const intermediateResults = new Map<string, unknown>();
    intermediateResults.set(
      "form-8949",
      make8949Result({
        totalShortTermGainOrLoss: -3000,
        totalLongTermGainOrLoss: 0,
      }),
    );

    const result = scheduleDPlugin.calculate(
      makeInput({ capitalGains: { transactions: [] } }),
      intermediateResults,
    ) as ScheduleDResult;

    expect(result.taxableCapitalGain).toBe(-3000);
    expect(result.capitalLossCarryover).toBe(0);
  });

  test("handles no form-8949 result gracefully (zeros)", () => {
    const result = scheduleDPlugin.calculate(
      makeInput({ capitalGains: { transactions: [] } }),
      new Map(),
    ) as ScheduleDResult;

    expect(result.shortTermGainOrLoss).toBe(0);
    expect(result.longTermGainOrLoss).toBe(0);
    expect(result.netCapitalGainOrLoss).toBe(0);
    expect(result.taxableCapitalGain).toBe(0);
    expect(result.capitalLossCarryover).toBe(0);
  });

  test("validate passes for consistent results", () => {
    const intermediateResults = new Map<string, unknown>();
    intermediateResults.set(
      "form-8949",
      make8949Result({
        totalShortTermGainOrLoss: 1500,
        totalLongTermGainOrLoss: -500,
      }),
    );

    const input = makeInput({ capitalGains: { transactions: [] } });
    const result = scheduleDPlugin.calculate(input, intermediateResults);
    const checks = scheduleDPlugin.validate(result, input);

    expect(checks.every((c) => c.passed)).toBe(true);
  });

  test("mapToFormLines includes schedule-d keys and 1040 line 7", () => {
    const intermediateResults = new Map<string, unknown>();
    intermediateResults.set(
      "form-8949",
      make8949Result({
        totalShortTermGainOrLoss: 2000,
        totalLongTermGainOrLoss: 3000,
      }),
    );

    const result = scheduleDPlugin.calculate(
      makeInput({ capitalGains: { transactions: [] } }),
      intermediateResults,
    );
    const lines = scheduleDPlugin.mapToFormLines(result);

    expect(lines).toHaveProperty("schedule-d.line7");
    expect(lines).toHaveProperty("schedule-d.line15");
    expect(lines).toHaveProperty("schedule-d.line16");
    expect(lines).toHaveProperty("schedule-d.line21");
    expect(lines).toHaveProperty("1040.line7");
    expect(lines["1040.line7"]).toBe(5000);
  });
});
