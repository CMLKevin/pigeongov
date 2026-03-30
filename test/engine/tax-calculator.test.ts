import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  calculateFederalTax,
  type TaxCalculationInput,
} from "../../src/engine/tax-calculator.js";

interface ScenarioFixture {
  filingStatus: TaxCalculationInput["filingStatus"];
  wages: number;
  taxableInterest: number;
  ordinaryDividends: number;
  scheduleCNet: number;
  otherIncome: number;
  adjustments: TaxCalculationInput["adjustments"];
  useItemizedDeductions: boolean;
  itemizedDeductions: number;
  dependents: TaxCalculationInput["dependents"];
  federalWithheld: number;
  estimatedPayments: number;
  expected: {
    grossIncome: number;
    adjustedGrossIncome: number;
    deduction: number;
    taxableIncome: number;
    federalTax: number;
    selfEmploymentTax?: number;
    childTaxCredit?: number;
    earnedIncomeCredit?: number;
    totalCredits: number;
    totalTax: number;
    totalPayments: number;
    refund: number;
    amountOwed: number;
    marginalRate: number;
  };
}

async function loadScenario(name: string): Promise<ScenarioFixture> {
  const filePath = path.join(process.cwd(), "test/fixtures/scenarios", name);
  return JSON.parse(await readFile(filePath, "utf8")) as ScenarioFixture;
}

describe("calculateFederalTax", () => {
  test("matches the 2025 single filer $50k wage scenario", async () => {
    const scenario = await loadScenario("single-50k.json");

    const result = calculateFederalTax(scenario);

    expect(result.grossIncome).toBeCloseTo(scenario.expected.grossIncome, 2);
    expect(result.adjustedGrossIncome).toBeCloseTo(
      scenario.expected.adjustedGrossIncome,
      2,
    );
    expect(result.deduction).toBeCloseTo(scenario.expected.deduction, 2);
    expect(result.taxableIncome).toBeCloseTo(scenario.expected.taxableIncome, 2);
    expect(result.federalTax).toBeCloseTo(scenario.expected.federalTax, 2);
    expect(result.totalTax).toBeCloseTo(scenario.expected.totalTax, 2);
    expect(result.totalPayments).toBeCloseTo(scenario.expected.totalPayments, 2);
    expect(result.refund).toBeCloseTo(scenario.expected.refund, 2);
    expect(result.amountOwed).toBeCloseTo(scenario.expected.amountOwed, 2);
    expect(result.marginalRate).toBeCloseTo(scenario.expected.marginalRate, 5);
  });

  test("matches the 2025 MFJ $120k and two-child scenario", async () => {
    const scenario = await loadScenario("mfj-120k-2kids.json");

    const result = calculateFederalTax(scenario);

    expect(result.grossIncome).toBeCloseTo(scenario.expected.grossIncome, 2);
    expect(result.adjustedGrossIncome).toBeCloseTo(
      scenario.expected.adjustedGrossIncome,
      2,
    );
    expect(result.deduction).toBeCloseTo(scenario.expected.deduction, 2);
    expect(result.taxableIncome).toBeCloseTo(scenario.expected.taxableIncome, 2);
    expect(result.federalTax).toBeCloseTo(scenario.expected.federalTax, 2);
    expect(result.childTaxCredit).toBeCloseTo(
      scenario.expected.childTaxCredit!,
      2,
    );
    expect(result.earnedIncomeCredit).toBeCloseTo(
      scenario.expected.earnedIncomeCredit!,
      2,
    );
    expect(result.totalCredits).toBeCloseTo(scenario.expected.totalCredits, 2);
    expect(result.totalTax).toBeCloseTo(scenario.expected.totalTax, 2);
    expect(result.totalPayments).toBeCloseTo(scenario.expected.totalPayments, 2);
    expect(result.refund).toBeCloseTo(scenario.expected.refund, 2);
    expect(result.amountOwed).toBeCloseTo(scenario.expected.amountOwed, 2);
    expect(result.marginalRate).toBeCloseTo(scenario.expected.marginalRate, 5);
  });

  test("matches the 2025 self-employed scenario including SE tax", async () => {
    const scenario = await loadScenario("self-employed-80k.json");

    const result = calculateFederalTax(scenario);

    expect(result.grossIncome).toBeCloseTo(scenario.expected.grossIncome, 2);
    expect(result.adjustedGrossIncome).toBeCloseTo(
      scenario.expected.adjustedGrossIncome,
      2,
    );
    expect(result.deduction).toBeCloseTo(scenario.expected.deduction, 2);
    expect(result.taxableIncome).toBeCloseTo(scenario.expected.taxableIncome, 2);
    expect(result.federalTax).toBeCloseTo(scenario.expected.federalTax, 2);
    expect(result.selfEmploymentTax).toBeCloseTo(
      scenario.expected.selfEmploymentTax!,
      2,
    );
    expect(result.totalTax).toBeCloseTo(scenario.expected.totalTax, 2);
    expect(result.totalPayments).toBeCloseTo(scenario.expected.totalPayments, 2);
    expect(result.refund).toBeCloseTo(scenario.expected.refund, 2);
    expect(result.amountOwed).toBeCloseTo(scenario.expected.amountOwed, 2);
    expect(result.marginalRate).toBeCloseTo(scenario.expected.marginalRate, 5);
  });
});
