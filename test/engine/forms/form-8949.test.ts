import { describe, expect, test } from "vitest";

import {
  form8949Plugin,
  type Form8949Result,
} from "../../../src/engine/forms/form-8949.js";
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

describe("form-8949 plugin", () => {
  test("does not trigger when capitalGains is absent", () => {
    expect(form8949Plugin.triggerCondition(makeInput())).toBe(false);
  });

  test("does not trigger when capitalGains.transactions is empty", () => {
    expect(
      form8949Plugin.triggerCondition(
        makeInput({ capitalGains: { transactions: [] } }),
      ),
    ).toBe(false);
  });

  test("triggers when there are capital gains transactions", () => {
    const input = makeInput({
      capitalGains: {
        transactions: [
          {
            description: "AAPL",
            dateAcquired: "2024-01-15",
            dateSold: "2025-03-01",
            proceeds: 15000,
            costBasis: 10000,
            shortTerm: false,
          },
        ],
      },
    });
    expect(form8949Plugin.triggerCondition(input)).toBe(true);
  });

  test("separates short-term and long-term transactions", () => {
    const input = makeInput({
      capitalGains: {
        transactions: [
          {
            description: "AAPL",
            dateAcquired: "2024-01-15",
            dateSold: "2025-03-01",
            proceeds: 15000,
            costBasis: 10000,
            shortTerm: false,
          },
          {
            description: "TSLA",
            dateAcquired: "2025-01-01",
            dateSold: "2025-03-15",
            proceeds: 8000,
            costBasis: 9000,
            shortTerm: true,
          },
          {
            description: "MSFT",
            dateAcquired: "2023-06-01",
            dateSold: "2025-02-20",
            proceeds: 20000,
            costBasis: 12000,
            shortTerm: false,
          },
        ],
      },
    });

    const result = form8949Plugin.calculate(input, new Map()) as Form8949Result;

    expect(result.shortTermTransactions).toHaveLength(1);
    expect(result.longTermTransactions).toHaveLength(2);
  });

  test("computes per-transaction gain/loss correctly", () => {
    const input = makeInput({
      capitalGains: {
        transactions: [
          {
            description: "AAPL",
            dateAcquired: "2024-01-15",
            dateSold: "2025-03-01",
            proceeds: 15000,
            costBasis: 10000,
            shortTerm: false,
          },
          {
            description: "TSLA",
            dateAcquired: "2025-01-01",
            dateSold: "2025-03-15",
            proceeds: 8000,
            costBasis: 9000,
            shortTerm: true,
          },
        ],
      },
    });

    const result = form8949Plugin.calculate(input, new Map()) as Form8949Result;

    expect(result.longTermTransactions[0]!.gainOrLoss).toBe(5000);
    expect(result.shortTermTransactions[0]!.gainOrLoss).toBe(-1000);
  });

  test("computes aggregate totals correctly", () => {
    const input = makeInput({
      capitalGains: {
        transactions: [
          {
            description: "A",
            dateAcquired: "2024-01-01",
            dateSold: "2025-01-01",
            proceeds: 10000,
            costBasis: 6000,
            shortTerm: false,
          },
          {
            description: "B",
            dateAcquired: "2024-06-01",
            dateSold: "2025-01-01",
            proceeds: 5000,
            costBasis: 7000,
            shortTerm: false,
          },
          {
            description: "C",
            dateAcquired: "2025-01-01",
            dateSold: "2025-02-01",
            proceeds: 3000,
            costBasis: 2000,
            shortTerm: true,
          },
        ],
      },
    });

    const result = form8949Plugin.calculate(input, new Map()) as Form8949Result;

    expect(result.totalLongTermProceeds).toBe(15000);
    expect(result.totalLongTermCostBasis).toBe(13000);
    expect(result.totalLongTermGainOrLoss).toBe(2000);
    expect(result.totalShortTermProceeds).toBe(3000);
    expect(result.totalShortTermCostBasis).toBe(2000);
    expect(result.totalShortTermGainOrLoss).toBe(1000);
  });

  test("validate passes for consistent results", () => {
    const input = makeInput({
      capitalGains: {
        transactions: [
          {
            description: "A",
            dateAcquired: "2024-01-01",
            dateSold: "2025-01-01",
            proceeds: 10000,
            costBasis: 8000,
            shortTerm: true,
          },
        ],
      },
    });
    const result = form8949Plugin.calculate(input, new Map());
    const checks = form8949Plugin.validate(result, input);

    expect(checks.every((c) => c.passed)).toBe(true);
  });

  test("mapToFormLines includes part1 and part2 keys", () => {
    const input = makeInput({
      capitalGains: {
        transactions: [
          {
            description: "A",
            dateAcquired: "2024-01-01",
            dateSold: "2025-01-01",
            proceeds: 10000,
            costBasis: 8000,
            shortTerm: true,
          },
        ],
      },
    });
    const result = form8949Plugin.calculate(input, new Map());
    const lines = form8949Plugin.mapToFormLines(result);

    expect(lines).toHaveProperty("form-8949.part1.totalGainOrLoss");
    expect(lines).toHaveProperty("form-8949.part2.totalGainOrLoss");
  });
});
