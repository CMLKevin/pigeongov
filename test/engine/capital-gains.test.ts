import { describe, expect, test } from "vitest";

import {
  calculateCapitalGains,
  calculateLtcgTax,
  calculateNiit,
  type CapitalGainsInput,
} from "../../src/engine/capital-gains.js";
import {
  calculateFederalTax,
  type TaxCalculationInput,
} from "../../src/engine/tax-calculator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function zeroCapitalGains(): CapitalGainsInput {
  return {
    shortTermGains: 0,
    shortTermLosses: 0,
    longTermGains: 0,
    longTermLosses: 0,
    qualifiedDividends: 0,
    carryforwardLoss: 0,
  };
}

function baseTaxInput(
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
    federalWithheld: 0,
    estimatedPayments: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pure capital-gains calculator tests
// ---------------------------------------------------------------------------

describe("calculateCapitalGains", () => {
  test("zero capital gains produces all-zero result", () => {
    const result = calculateCapitalGains(
      zeroCapitalGains(),
      "single",
      34250, // ordinaryTaxableIncome
      50000, // magi
    );

    expect(result.netShortTerm).toBe(0);
    expect(result.netLongTerm).toBe(0);
    expect(result.totalNetGain).toBe(0);
    expect(result.capitalLossDeduction).toBe(0);
    expect(result.carryforwardToNextYear).toBe(0);
    expect(result.qualifiedDividendsTax).toBe(0);
    expect(result.longTermCapitalGainsTax).toBe(0);
    expect(result.netInvestmentIncomeTax).toBe(0);
  });

  test("short-term gains only (no preferential treatment)", () => {
    const result = calculateCapitalGains(
      { ...zeroCapitalGains(), shortTermGains: 10000 },
      "single",
      34250,
      60000,
    );

    expect(result.netShortTerm).toBe(10000);
    expect(result.netLongTerm).toBe(0);
    expect(result.totalNetGain).toBe(10000);
    // Short-term gains are taxed at ordinary rates, so no LTCG tax
    expect(result.longTermCapitalGainsTax).toBe(0);
    expect(result.qualifiedDividendsTax).toBe(0);
    expect(result.capitalLossDeduction).toBe(0);
    expect(result.carryforwardToNextYear).toBe(0);
  });

  test("long-term gains at 0% rate (single, low income)", () => {
    // Single filer: 0% bracket up to $48,350
    // If ordinary taxable income is $20,000 and LTCG is $10,000,
    // total taxable income = $30,000 which is below $48,350 threshold
    const result = calculateCapitalGains(
      { ...zeroCapitalGains(), longTermGains: 10000 },
      "single",
      20000, // ordinary taxable income
      30000, // magi
    );

    expect(result.netLongTerm).toBe(10000);
    expect(result.longTermCapitalGainsTax).toBe(0);
  });

  test("long-term gains at 15% rate (single)", () => {
    // Single: 0% up to $48,350, 15% up to $533,400
    // Ordinary taxable income $60,000 (already above 0% threshold)
    // LTCG of $50,000 stacks on top -> taxed at 15%
    const result = calculateCapitalGains(
      { ...zeroCapitalGains(), longTermGains: 50000 },
      "single",
      60000, // ordinary taxable income
      110000, // magi
    );

    expect(result.netLongTerm).toBe(50000);
    expect(result.longTermCapitalGainsTax).toBeCloseTo(7500, 2); // 50000 * 0.15
  });

  test("long-term gains at 20% rate (single, high income)", () => {
    // Single: 20% above $533,400
    // Ordinary taxable income $500,000, LTCG $100,000
    // Total = $600,000. First $33,400 of LTCG in 15% bracket, rest in 20%
    const result = calculateCapitalGains(
      { ...zeroCapitalGains(), longTermGains: 100000 },
      "single",
      500000, // ordinary taxable income
      600000, // magi
    );

    expect(result.netLongTerm).toBe(100000);
    // $33,400 at 15% = $5,010 and $66,600 at 20% = $13,320 -> total $18,330
    expect(result.longTermCapitalGainsTax).toBeCloseTo(18330, 2);
  });

  test("net capital loss with $3,000 deduction limit (single)", () => {
    const result = calculateCapitalGains(
      { ...zeroCapitalGains(), shortTermLosses: 8000 },
      "single",
      50000,
      42000,
    );

    expect(result.netShortTerm).toBe(-8000);
    expect(result.totalNetGain).toBe(-8000);
    expect(result.capitalLossDeduction).toBe(3000);
    expect(result.carryforwardToNextYear).toBe(5000);
  });

  test("net capital loss with $1,500 deduction limit (MFS)", () => {
    const result = calculateCapitalGains(
      { ...zeroCapitalGains(), longTermLosses: 5000 },
      "married_filing_separately",
      50000,
      45000,
    );

    expect(result.totalNetGain).toBe(-5000);
    expect(result.capitalLossDeduction).toBe(1500);
    expect(result.carryforwardToNextYear).toBe(3500);
  });

  test("loss carryforward calculation", () => {
    // $2,000 ST loss + $10,000 carryforward = $12,000 total loss
    // Deduction: $3,000; carryforward: $9,000
    const result = calculateCapitalGains(
      {
        ...zeroCapitalGains(),
        shortTermLosses: 2000,
        carryforwardLoss: 10000,
      },
      "single",
      50000,
      38000,
    );

    expect(result.totalNetGain).toBe(-12000);
    expect(result.capitalLossDeduction).toBe(3000);
    expect(result.carryforwardToNextYear).toBe(9000);
  });

  test("short-term loss offsets long-term gain", () => {
    // ST: -$5,000, LT: +$8,000 -> net LT should be $3,000
    const result = calculateCapitalGains(
      {
        ...zeroCapitalGains(),
        shortTermLosses: 5000,
        longTermGains: 8000,
      },
      "single",
      30000,
      38000,
    );

    expect(result.netShortTerm).toBe(0);
    expect(result.netLongTerm).toBe(3000);
    expect(result.totalNetGain).toBe(3000);
    expect(result.capitalLossDeduction).toBe(0);
  });

  test("long-term loss offsets short-term gain", () => {
    // ST: +$10,000, LT: -$4,000 -> net ST = $6,000
    const result = calculateCapitalGains(
      {
        ...zeroCapitalGains(),
        shortTermGains: 10000,
        longTermLosses: 4000,
      },
      "single",
      30000,
      36000,
    );

    expect(result.netShortTerm).toBe(6000);
    expect(result.netLongTerm).toBe(0);
    expect(result.totalNetGain).toBe(6000);
  });

  test("qualified dividends at LTCG rates", () => {
    // Single filer with $20,000 ordinary income and $5,000 qualified dividends
    // Total income = $25,000, well within 0% bracket ($48,350)
    const result = calculateCapitalGains(
      { ...zeroCapitalGains(), qualifiedDividends: 5000 },
      "single",
      20000,
      25000,
    );

    expect(result.qualifiedDividendsTax).toBe(0); // 0% rate

    // Now test with high income where dividends are in 15% bracket
    const result2 = calculateCapitalGains(
      { ...zeroCapitalGains(), qualifiedDividends: 5000 },
      "single",
      60000,
      65000,
    );

    expect(result2.qualifiedDividendsTax).toBeCloseTo(750, 2); // 5000 * 0.15
  });
});

// ---------------------------------------------------------------------------
// LTCG tax bracket tests
// ---------------------------------------------------------------------------

describe("calculateLtcgTax", () => {
  test("MFJ: 0% up to $96,700", () => {
    const { longTermCapitalGainsTax } = calculateLtcgTax(
      "married_filing_jointly",
      50000, // ordinary
      40000, // LTCG
      0,
    );
    // 50,000 + 40,000 = 90,000 < 96,700 -> all at 0%
    expect(longTermCapitalGainsTax).toBe(0);
  });

  test("HoH: spans 0% and 15% brackets", () => {
    // HoH: 0% up to $64,750
    // Ordinary $50,000, LTCG $30,000 -> total $80,000
    // First $14,750 of LTCG at 0%, remaining $15,250 at 15%
    const { longTermCapitalGainsTax } = calculateLtcgTax(
      "head_of_household",
      50000,
      30000,
      0,
    );
    expect(longTermCapitalGainsTax).toBeCloseTo(15250 * 0.15, 2);
  });

  test("proportional split between LTCG and qualified dividends", () => {
    // Single, ordinary $60,000 (above 0% threshold)
    // $20,000 LTCG + $10,000 QD = $30,000 preferential at 15%
    const { longTermCapitalGainsTax, qualifiedDividendsTax } = calculateLtcgTax(
      "single",
      60000,
      20000,
      10000,
    );

    const totalTax = 30000 * 0.15; // 4500
    expect(longTermCapitalGainsTax).toBeCloseTo((totalTax * 20000) / 30000, 2);
    expect(qualifiedDividendsTax).toBeCloseTo((totalTax * 10000) / 30000, 2);
  });
});

// ---------------------------------------------------------------------------
// NIIT tests
// ---------------------------------------------------------------------------

describe("calculateNiit", () => {
  test("no NIIT below threshold (single $200k)", () => {
    expect(calculateNiit("single", 190000, 10000)).toBe(0);
  });

  test("NIIT on lesser of NII or excess MAGI (single)", () => {
    // MAGI $250,000 -> excess = $50,000
    // NII = $30,000
    // Tax = min(30000, 50000) * 0.038 = $1,140
    expect(calculateNiit("single", 250000, 30000)).toBeCloseTo(1140, 2);
  });

  test("NIIT on excess MAGI when lower than NII", () => {
    // MAGI $210,000 -> excess = $10,000
    // NII = $30,000
    // Tax = min(30000, 10000) * 0.038 = $380
    expect(calculateNiit("single", 210000, 30000)).toBeCloseTo(380, 2);
  });

  test("NIIT with MFJ threshold ($250k)", () => {
    // MFJ MAGI $300,000 -> excess = $50,000
    // NII = $20,000
    // Tax = min(20000, 50000) * 0.038 = $760
    expect(calculateNiit("married_filing_jointly", 300000, 20000)).toBeCloseTo(760, 2);
  });

  test("no NIIT when net investment income is zero", () => {
    expect(calculateNiit("single", 500000, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration with calculateFederalTax
// ---------------------------------------------------------------------------

describe("calculateFederalTax with capitalGains", () => {
  test("no capital gains — existing behavior unchanged", () => {
    const input = baseTaxInput();
    const result = calculateFederalTax(input);

    // Should match existing behavior exactly
    expect(result.capitalGainsTax).toBe(0);
    expect(result.niitTax).toBe(0);
    expect(result.capitalGainsDetail).toBeUndefined();
    expect(result.grossIncome).toBe(50000);
  });

  test("explicit zero capital gains — same as no capital gains", () => {
    const input = baseTaxInput({ capitalGains: zeroCapitalGains() });
    const result = calculateFederalTax(input);

    expect(result.capitalGainsTax).toBe(0);
    expect(result.niitTax).toBe(0);
    expect(result.capitalGainsDetail).toBeUndefined();
    expect(result.grossIncome).toBe(50000);
  });

  test("short-term gains increase gross income and are taxed as ordinary income", () => {
    const withoutCG = calculateFederalTax(baseTaxInput());
    const withCG = calculateFederalTax(
      baseTaxInput({
        capitalGains: {
          ...zeroCapitalGains(),
          shortTermGains: 10000,
        },
      }),
    );

    expect(withCG.grossIncome).toBe(withoutCG.grossIncome + 10000);
    // Short-term gains go through ordinary brackets, not LTCG tax
    expect(withCG.capitalGainsTax).toBe(0);
    // Federal tax should be higher due to additional ordinary income
    expect(withCG.federalTax).toBeGreaterThan(withoutCG.federalTax);
  });

  test("long-term gains at 0% rate (low income single)", () => {
    // Single filer with $30,000 wages + $10,000 LTCG
    // Standard deduction $15,750
    // Taxable income = $24,250 (all below $48,350 LTCG threshold)
    const input = baseTaxInput({
      wages: 30000,
      capitalGains: { ...zeroCapitalGains(), longTermGains: 10000 },
    });
    const result = calculateFederalTax(input);

    expect(result.grossIncome).toBe(40000);
    expect(result.capitalGainsTax).toBe(0); // 0% LTCG rate
    expect(result.capitalGainsDetail).toBeDefined();
    expect(result.capitalGainsDetail!.netLongTerm).toBe(10000);
  });

  test("long-term gains at 15% rate (single $100k wages + $50k LTCG)", () => {
    const input = baseTaxInput({
      wages: 100000,
      capitalGains: { ...zeroCapitalGains(), longTermGains: 50000 },
    });
    const result = calculateFederalTax(input);

    expect(result.grossIncome).toBe(150000);
    expect(result.capitalGainsTax).toBeGreaterThan(0);
    // LTCG is at 15% for single between $48,350 and $533,400
    expect(result.capitalGainsTax).toBeCloseTo(50000 * 0.15, 2);
  });

  test("capital loss deduction reduces AGI", () => {
    const without = calculateFederalTax(baseTaxInput());
    const withLoss = calculateFederalTax(
      baseTaxInput({
        capitalGains: { ...zeroCapitalGains(), longTermLosses: 10000 },
      }),
    );

    // $10,000 loss -> $3,000 deduction against ordinary income
    expect(withLoss.adjustedGrossIncome).toBe(without.adjustedGrossIncome - 3000);
    expect(withLoss.capitalGainsDetail!.capitalLossDeduction).toBe(3000);
    expect(withLoss.capitalGainsDetail!.carryforwardToNextYear).toBe(7000);
  });

  test("NIIT at high income levels", () => {
    const input = baseTaxInput({
      wages: 250000,
      capitalGains: { ...zeroCapitalGains(), longTermGains: 50000 },
    });
    const result = calculateFederalTax(input);

    // MAGI = $300,000, threshold = $200,000, excess = $100,000
    // NII includes $50,000 LTCG (at least)
    expect(result.niitTax).toBeGreaterThan(0);
    expect(result.totalTax).toBeGreaterThan(result.federalTax + result.capitalGainsTax);
  });

  test("qualified dividends taxed at LTCG rates (not ordinary)", () => {
    const input = baseTaxInput({
      wages: 100000,
      capitalGains: { ...zeroCapitalGains(), qualifiedDividends: 20000 },
    });
    const result = calculateFederalTax(input);

    // QD should be taxed at 15% (stacking on top of $84,250 ordinary taxable)
    expect(result.capitalGainsTax).toBeCloseTo(20000 * 0.15, 2);
    expect(result.capitalGainsDetail!.qualifiedDividendsTax).toBeCloseTo(20000 * 0.15, 2);
  });

  test("mixed scenario: short + long + qualified dividends + losses", () => {
    const input = baseTaxInput({
      filingStatus: "married_filing_jointly",
      wages: 200000,
      taxableInterest: 5000,
      capitalGains: {
        shortTermGains: 15000,
        shortTermLosses: 3000,
        longTermGains: 40000,
        longTermLosses: 5000,
        qualifiedDividends: 10000,
        carryforwardLoss: 0,
      },
    });
    const result = calculateFederalTax(input);

    const detail = result.capitalGainsDetail!;
    expect(detail).toBeDefined();
    expect(detail.netShortTerm).toBe(12000); // 15000 - 3000
    expect(detail.netLongTerm).toBe(35000);  // 40000 - 5000
    expect(detail.totalNetGain).toBe(47000); // 12000 + 35000
    expect(detail.capitalLossDeduction).toBe(0); // net gain, no loss deduction

    // Gross income includes the net gain
    expect(result.grossIncome).toBe(200000 + 5000 + 47000);

    // LTCG tax covers net long-term + qualified dividends
    expect(result.capitalGainsTax).toBeGreaterThan(0);

    // Total tax should include ordinary, CG tax, and potentially NIIT
    expect(result.totalTax).toBeGreaterThan(result.federalTax);
  });

  test("carryforward with partial offset in subsequent year", () => {
    const input = baseTaxInput({
      capitalGains: {
        shortTermGains: 1000,
        shortTermLosses: 0,
        longTermGains: 0,
        longTermLosses: 0,
        qualifiedDividends: 0,
        carryforwardLoss: 5000, // prior year loss
      },
    });
    const result = calculateFederalTax(input);

    const detail = result.capitalGainsDetail!;
    // $1,000 ST gain offset by $5,000 carryforward -> net -$4,000
    expect(detail.totalNetGain).toBe(-4000);
    expect(detail.capitalLossDeduction).toBe(3000);
    expect(detail.carryforwardToNextYear).toBe(1000);
  });
});
