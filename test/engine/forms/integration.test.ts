import { describe, expect, test } from "vitest";

import { TaxOrchestrator } from "../../../src/engine/orchestrator.js";
import { core1040Plugin } from "../../../src/engine/forms/core-1040.js";
import { scheduleBPlugin } from "../../../src/engine/forms/schedule-b.js";
import { form8949Plugin } from "../../../src/engine/forms/form-8949.js";
import { scheduleDPlugin } from "../../../src/engine/forms/schedule-d.js";
import type { TaxOrchestratorInput } from "../../../src/engine/types.js";
import type { TaxCalculationResult } from "../../../src/engine/tax-calculator.js";
import type { ScheduleDResult } from "../../../src/engine/forms/schedule-d.js";

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

function freshOrchestrator(): TaxOrchestrator {
  const orch = new TaxOrchestrator();
  orch.register(core1040Plugin);
  orch.register(scheduleBPlugin);
  orch.register(form8949Plugin);
  orch.register(scheduleDPlugin);
  return orch;
}

describe("orchestrator integration", () => {
  test("simple wage earner — only core-1040 triggers", () => {
    const orch = freshOrchestrator();
    const result = orch.execute(makeInput());

    expect(result.triggeredForms).toEqual(["core-1040"]);
    const core = result.coreResult as TaxCalculationResult;
    expect(core.grossIncome).toBe(50000);
    expect(core.adjustedGrossIncome).toBe(50000);
  });

  test("high-interest filer triggers Schedule B", () => {
    const orch = freshOrchestrator();
    const result = orch.execute(
      makeInput({ taxableInterest: 3000 }),
    );

    expect(result.triggeredForms).toContain("core-1040");
    expect(result.triggeredForms).toContain("schedule-b");
    expect(result.triggeredForms).not.toContain("form-8949");
    expect(result.triggeredForms).not.toContain("schedule-d");
    expect(result.formLinesMerged["schedule-b.part1.total"]).toBe(3000);
  });

  test("capital gains filer triggers Form 8949 and Schedule D", () => {
    const orch = freshOrchestrator();
    const result = orch.execute(
      makeInput({
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
              dateSold: "2025-02-15",
              proceeds: 5000,
              costBasis: 6000,
              shortTerm: true,
            },
          ],
        },
      }),
    );

    expect(result.triggeredForms).toContain("form-8949");
    expect(result.triggeredForms).toContain("schedule-d");

    // form-8949 must execute before schedule-d
    const f8949Idx = result.triggeredForms.indexOf("form-8949");
    const schDIdx = result.triggeredForms.indexOf("schedule-d");
    expect(f8949Idx).toBeLessThan(schDIdx);

    // Schedule D should aggregate correctly
    const schedD = result.formResults.get("schedule-d") as ScheduleDResult;
    expect(schedD.longTermGainOrLoss).toBe(5000);
    expect(schedD.shortTermGainOrLoss).toBe(-1000);
    expect(schedD.netCapitalGainOrLoss).toBe(4000);
    expect(schedD.taxableCapitalGain).toBe(4000);
    expect(schedD.capitalLossCarryover).toBe(0);
  });

  test("kitchen sink — interest + dividends + capital gains all trigger", () => {
    const orch = freshOrchestrator();
    const result = orch.execute(
      makeInput({
        taxableInterest: 2000,
        ordinaryDividends: 1800,
        capitalGains: {
          transactions: [
            {
              description: "BTC sell",
              dateAcquired: "2023-01-01",
              dateSold: "2025-01-15",
              proceeds: 50000,
              costBasis: 30000,
              shortTerm: false,
            },
          ],
        },
      }),
    );

    expect(result.triggeredForms).toContain("core-1040");
    expect(result.triggeredForms).toContain("schedule-b");
    expect(result.triggeredForms).toContain("form-8949");
    expect(result.triggeredForms).toContain("schedule-d");
    expect(result.triggeredForms).toHaveLength(4);

    // All validation checks should pass.
    const failures = result.allValidationChecks.filter((c) => !c.passed);
    expect(failures).toEqual([]);
  });

  test("backward compatibility: calculateFederalTax still works directly", async () => {
    // This import must NOT fail — the existing function is untouched.
    const { calculateFederalTax } = await import(
      "../../../src/engine/tax-calculator.js"
    );

    const directResult = calculateFederalTax({
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
    });

    expect(directResult.grossIncome).toBe(50000);
    expect(directResult.federalTax).toBeGreaterThan(0);

    // The orchestrator should produce the same core result.
    const orch = freshOrchestrator();
    const orchResult = orch.execute(makeInput());
    const coreResult = orchResult.coreResult as TaxCalculationResult;

    expect(coreResult.grossIncome).toBe(directResult.grossIncome);
    expect(coreResult.adjustedGrossIncome).toBe(directResult.adjustedGrossIncome);
    expect(coreResult.taxableIncome).toBe(directResult.taxableIncome);
    expect(coreResult.federalTax).toBe(directResult.federalTax);
    expect(coreResult.totalTax).toBe(directResult.totalTax);
    expect(coreResult.refund).toBe(directResult.refund);
    expect(coreResult.amountOwed).toBe(directResult.amountOwed);
  });
});
