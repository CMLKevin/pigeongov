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

// ---------------------------------------------------------------------------
// OBBB Act (One Big Beautiful Bill Act) — new provisions for tax year 2025
// ---------------------------------------------------------------------------

function makeBaseInput(
  overrides: Partial<TaxCalculationInput> = {},
): TaxCalculationInput {
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

describe("OBBB Act — Child Tax Credit at $2,200", () => {
  test("CTC of $2,200 per qualifying child for MFJ under phase-out", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "married_filing_jointly",
        wages: 120000,
        federalWithheld: 14000,
        dependents: [
          { name: "Child A", ssn: "111-22-3333", relationship: "child", childTaxCreditEligible: true },
          { name: "Child B", ssn: "444-55-6666", relationship: "child", childTaxCreditEligible: true },
        ],
      }),
    );

    // 2 children × $2,200 = $4,400 total CTC
    expect(result.childTaxCredit).toBe(4400);
  });

  test("single filer with 1 child gets $2,200 CTC", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 80000,
        federalWithheld: 10000,
        dependents: [
          { name: "Child A", ssn: "111-22-3333", relationship: "child", childTaxCreditEligible: true },
        ],
      }),
    );

    expect(result.childTaxCredit).toBe(2200);
  });

  test("refundable portion (ACTC) caps at $1,900 per child", () => {
    // Low-income filer whose tax liability is less than the CTC
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 20000,
        federalWithheld: 0,
        dependents: [
          { name: "Child A", ssn: "111-22-3333", relationship: "child", childTaxCreditEligible: true },
        ],
      }),
    );

    // With $20K wages - $15,750 std deduction = $4,250 taxable income
    // Federal tax on $4,250 = $425 (10% bracket)
    // Non-refundable CTC = min($2,200, $425) = $425
    // Remaining = $2,200 - $425 = $1,775
    // ACTC earned income component = ($20,000 - $2,500) * 0.15 = $2,625
    // Refundable limit = 1 * $1,900 = $1,900
    // ACTC = min($1,900, $1,775, $2,625) = $1,775
    expect(result.additionalChildTaxCredit).toBe(1775);
    expect(result.childTaxCredit).toBe(2200);
  });
});

describe("OBBB Act — SALT cap at $40K MFJ / $20K MFS", () => {
  test("SALT capped at $40,000 for MFJ", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "married_filing_jointly",
        wages: 300000,
        federalWithheld: 50000,
        useItemizedDeductions: true,
        itemizedDeductions: 60000, // includes $50K SALT
        saltDeduction: 50000,
      }),
    );

    // $60,000 total itemized - $50,000 SALT + $40,000 (capped) = $50,000
    expect(result.saltDeductionApplied).toBe(40000);
    expect(result.deduction).toBe(50000);
  });

  test("SALT capped at $20,000 for MFS", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "married_filing_separately",
        wages: 200000,
        federalWithheld: 30000,
        useItemizedDeductions: true,
        itemizedDeductions: 35000, // includes $30K SALT
        saltDeduction: 30000,
      }),
    );

    // $35,000 - $30,000 + $20,000 = $25,000
    expect(result.saltDeductionApplied).toBe(20000);
    expect(result.deduction).toBe(25000);
  });

  test("SALT under cap passes through unchanged", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 100000,
        federalWithheld: 15000,
        useItemizedDeductions: true,
        itemizedDeductions: 25000, // includes $8K SALT
        saltDeduction: 8000,
      }),
    );

    expect(result.saltDeductionApplied).toBe(8000);
    expect(result.deduction).toBe(25000); // unchanged
  });
});

describe("OBBB Act — tip income deduction with AGI phase-out", () => {
  test("full tip deduction for AGI under $160K", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        wages: 50000,
        tipIncome: 15000,
      }),
    );

    expect(result.tipIncomeDeduction).toBe(15000);
    // Reduces AGI: $50K - $15K = $35K AGI
    expect(result.adjustedGrossIncome).toBe(35000);
  });

  test("tip deduction capped at $25,000", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        wages: 80000,
        tipIncome: 30000, // exceeds $25K cap
      }),
    );

    expect(result.tipIncomeDeduction).toBe(25000);
    expect(result.adjustedGrossIncome).toBe(55000); // 80K - 25K
  });

  test("tip deduction zeroed when AGI >= $160K", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        wages: 170000,
        tipIncome: 10000,
      }),
    );

    // Preliminary AGI = $170K >= $160K threshold → no tip deduction
    expect(result.tipIncomeDeduction).toBe(0);
    expect(result.adjustedGrossIncome).toBe(170000);
  });
});

describe("OBBB Act — senior standard deduction addition", () => {
  test("single filer age 65+ gets $2,000 additional standard deduction", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 40000,
        taxpayerAge: 67,
      }),
    );

    // Standard deduction: $15,750 + $2,000 = $17,750
    expect(result.deduction).toBe(17750);
    expect(result.seniorStandardDeduction).toBe(2000);
  });

  test("MFJ both spouses 65+ gets $3,200 additional ($1,600 each)", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "married_filing_jointly",
        wages: 80000,
        taxpayerAge: 68,
        spouseAge: 66,
      }),
    );

    // Standard deduction: $31,500 + $1,600 + $1,600 = $34,700
    expect(result.deduction).toBe(34700);
    expect(result.seniorStandardDeduction).toBe(3200);
  });

  test("MFJ one spouse 65+ gets $1,600 additional", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "married_filing_jointly",
        wages: 80000,
        taxpayerAge: 70,
        spouseAge: 60,
      }),
    );

    expect(result.deduction).toBe(33100); // $31,500 + $1,600
    expect(result.seniorStandardDeduction).toBe(1600);
  });

  test("senior deduction does NOT apply when itemizing", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 60000,
        taxpayerAge: 67,
        useItemizedDeductions: true,
        itemizedDeductions: 20000,
      }),
    );

    expect(result.deduction).toBe(20000);
    expect(result.seniorStandardDeduction).toBe(0);
  });

  test("under-65 taxpayer gets no senior deduction", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 40000,
        taxpayerAge: 64,
      }),
    );

    expect(result.deduction).toBe(15750);
    expect(result.seniorStandardDeduction).toBe(0);
  });
});

describe("OBBB Act — combined scenario with all new deductions", () => {
  test("MFJ filer with tips, overtime, auto loan, senior deduction, and SALT", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "married_filing_jointly",
        wages: 100000,
        federalWithheld: 12000,
        tipIncome: 8000,
        overtimePay: 5000,
        autoLoanInterest: 3000,
        taxpayerAge: 66,
        spouseAge: 67,
        dependents: [
          { name: "Child A", ssn: "111-22-3333", relationship: "child", childTaxCreditEligible: true },
        ],
      }),
    );

    // Above-the-line deductions reduce AGI
    expect(result.tipIncomeDeduction).toBe(8000);
    expect(result.overtimePayDeduction).toBe(5000);
    expect(result.autoLoanInterestDeduction).toBe(3000);

    // Gross income is still $100K
    expect(result.grossIncome).toBe(100000);
    // AGI = $100K - ($8K + $5K + $3K) = $84K
    expect(result.adjustedGrossIncome).toBe(84000);

    // Standard deduction: $31,500 + $1,600 + $1,600 = $34,700
    expect(result.seniorStandardDeduction).toBe(3200);
    expect(result.deduction).toBe(34700);

    // Taxable income = $84K - $34.7K = $49,300
    expect(result.taxableIncome).toBe(49300);

    // CTC: 1 child × $2,200 = $2,200
    expect(result.childTaxCredit).toBe(2200);
  });

  test("overtime and auto loan deductions respect their caps", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 80000,
        overtimePay: 15000,       // cap at $10K
        autoLoanInterest: 12000,  // cap at $10K
      }),
    );

    expect(result.overtimePayDeduction).toBe(10000);
    expect(result.autoLoanInterestDeduction).toBe(10000);
    // AGI = $80K - $10K - $10K = $60K
    expect(result.adjustedGrossIncome).toBe(60000);
  });

  test("auto loan interest deduction phases out at $100K for single", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "single",
        wages: 110000,
        autoLoanInterest: 5000,
      }),
    );

    // Preliminary AGI = $110K >= $100K → no auto loan deduction for single
    expect(result.autoLoanInterestDeduction).toBe(0);
  });

  test("auto loan interest deduction allowed at $150K for MFJ (threshold $200K)", () => {
    const result = calculateFederalTax(
      makeBaseInput({
        filingStatus: "married_filing_jointly",
        wages: 150000,
        autoLoanInterest: 5000,
      }),
    );

    // Preliminary AGI = $150K < $200K threshold → allowed
    expect(result.autoLoanInterestDeduction).toBe(5000);
  });

  test("backward compatibility: inputs without OBBB fields work identically", () => {
    // A call with no OBBB fields should produce the same result as before
    const resultWithoutObbb = calculateFederalTax({
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

    expect(resultWithoutObbb.grossIncome).toBe(50000);
    expect(resultWithoutObbb.adjustedGrossIncome).toBe(50000);
    expect(resultWithoutObbb.deduction).toBe(15750);
    expect(resultWithoutObbb.taxableIncome).toBe(34250);
    expect(resultWithoutObbb.tipIncomeDeduction).toBe(0);
    expect(resultWithoutObbb.overtimePayDeduction).toBe(0);
    expect(resultWithoutObbb.autoLoanInterestDeduction).toBe(0);
    expect(resultWithoutObbb.seniorStandardDeduction).toBe(0);
    expect(resultWithoutObbb.saltDeductionApplied).toBe(0);
  });
});
