import { describe, expect, test } from "vitest";

import {
  calculateStateTax,
  listSupportedStates,
} from "../../src/engine/state-tax-integration.js";
import { calculateFederalTax } from "../../src/engine/tax-calculator.js";

/**
 * Convenience helper to build a basic StateTaxIntegrationInput.
 * Sets sensible defaults so tests only need to override what matters.
 */
function makeInput(overrides: {
  state: string;
  federalAGI?: number;
  wages?: number;
  filingStatus?: "single" | "married_filing_jointly" | "married_filing_separately" | "head_of_household";
  stateWithheld?: number;
  stateEstimatedPayments?: number;
}) {
  return {
    state: overrides.state,
    federalAGI: overrides.federalAGI ?? 100_000,
    federalTaxableIncome: overrides.federalAGI ?? 100_000,
    wages: overrides.wages ?? overrides.federalAGI ?? 100_000,
    filingStatus: overrides.filingStatus ?? "single",
    dependents: 0,
    itemizedDeductions: 0,
    stateWithheld: overrides.stateWithheld ?? 0,
    stateEstimatedPayments: overrides.stateEstimatedPayments ?? 0,
    propertyTaxPaid: 0,
    mortgageInterest: 0,
    charitableContributions: 0,
  } as const;
}

describe("State Tax Integration", () => {
  describe("California (progressive brackets)", () => {
    test("calculates CA tax for a $100k single filer", () => {
      const result = calculateStateTax(makeInput({ state: "CA", federalAGI: 100_000 }));

      expect(result.state).toBe("CA");
      expect(result.stateName).toBe("California");
      expect(result.stateTaxableIncome).toBeGreaterThan(0);
      expect(result.stateTax).toBeGreaterThan(0);
      // CA has progressive brackets — effective rate on $100k should be well under 9.3%
      expect(result.stateEffectiveRate).toBeGreaterThan(0);
      expect(result.stateEffectiveRate).toBeLessThan(0.1);
      // Should have multiple bracket entries
      expect(result.brackets.length).toBeGreaterThan(1);
    });

    test("handles lowercase state code", () => {
      const result = calculateStateTax(makeInput({ state: "ca" }));
      expect(result.state).toBe("CA");
      expect(result.stateName).toBe("California");
    });

    test("CA tax on $100k includes SDI in localTax", () => {
      const result = calculateStateTax(makeInput({ state: "CA", federalAGI: 100_000, wages: 100_000 }));
      // SDI is reported as localTax on the raw result and shows in notes
      expect(result.rawResult).not.toBeNull();
      expect(result.rawResult!.localTax).toBeGreaterThan(0);
    });
  });

  describe("New York (progressive brackets)", () => {
    test("calculates NY tax for a $100k single filer", () => {
      const result = calculateStateTax(makeInput({ state: "NY", federalAGI: 100_000 }));

      expect(result.state).toBe("NY");
      expect(result.stateName).toBe("New York");
      expect(result.stateTaxableIncome).toBeGreaterThan(0);
      expect(result.stateTax).toBeGreaterThan(0);
      expect(result.brackets.length).toBeGreaterThan(1);
    });

    test("NY standard deduction reduces taxable income", () => {
      const result = calculateStateTax(makeInput({ state: "NY", federalAGI: 100_000 }));
      // NY single standard deduction is $8,000
      expect(result.stateTaxableIncome).toBe(92_000);
    });
  });

  describe("Texas (no income tax)", () => {
    test("returns zero tax for TX", () => {
      const result = calculateStateTax(makeInput({ state: "TX", federalAGI: 100_000 }));

      expect(result.state).toBe("TX");
      expect(result.stateName).toBe("Texas");
      expect(result.stateTaxableIncome).toBe(0);
      expect(result.stateTax).toBe(0);
      expect(result.stateEffectiveRate).toBe(0);
      expect(result.brackets).toHaveLength(0);
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes[0]).toContain("does not levy a state income tax");
    });

    test("TX with withholding returns full refund", () => {
      const result = calculateStateTax(makeInput({ state: "TX", stateWithheld: 5000 }));
      expect(result.stateRefund).toBe(5000);
      expect(result.stateOwed).toBe(0);
    });
  });

  describe("Pennsylvania (flat rate 3.07%)", () => {
    test("calculates PA flat tax correctly", () => {
      const result = calculateStateTax(makeInput({ state: "PA", federalAGI: 100_000 }));

      expect(result.state).toBe("PA");
      expect(result.stateTax).toBeGreaterThan(0);
      // PA has no standard deduction or personal exemption
      expect(result.stateTaxableIncome).toBe(100_000);
      // PA flat rate is 3.07%, so tax on $100k should be $3,070
      expect(result.rawResult!.stateTax).toBe(3070);
      // Single bracket entry
      expect(result.brackets).toHaveLength(1);
      expect(result.brackets[0]!.rate).toBe(0.0307);
    });
  });

  describe("Illinois (flat rate 4.95%)", () => {
    test("calculates IL flat tax correctly", () => {
      const result = calculateStateTax(makeInput({ state: "IL", federalAGI: 100_000 }));

      expect(result.state).toBe("IL");
      expect(result.stateTax).toBeGreaterThan(0);
      // IL has personal exemption of $2,625 for single
      expect(result.stateTaxableIncome).toBe(97_375);
      // 4.95% of $97,375 = $4,820.06
      expect(result.rawResult!.stateTax).toBeCloseTo(4820.06, 0);
      expect(result.brackets).toHaveLength(1);
      expect(result.brackets[0]!.rate).toBe(0.0495);
    });
  });

  describe("Unknown state", () => {
    test("returns graceful not-available response for unsupported state", () => {
      const result = calculateStateTax(makeInput({ state: "ZZ" }));

      expect(result.state).toBe("ZZ");
      expect(result.stateTax).toBe(0);
      expect(result.stateTaxableIncome).toBe(0);
      expect(result.brackets).toHaveLength(0);
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes[0]).toContain("not available for ZZ");
      expect(result.notes[0]).toContain("Available states:");
      expect(result.rawResult).toBeNull();
    });

    test("returns graceful response for state with no calculator (e.g. OR)", () => {
      const result = calculateStateTax(makeInput({ state: "OR" }));

      expect(result.stateTax).toBe(0);
      expect(result.notes[0]).toContain("not available for OR");
    });
  });

  describe("State refund/owed from withholding", () => {
    test("computes refund when withholding exceeds tax", () => {
      const result = calculateStateTax(makeInput({
        state: "PA",
        federalAGI: 50_000,
        stateWithheld: 3_000,
      }));

      // PA tax on $50k = $50,000 * 0.0307 = $1,535
      expect(result.rawResult!.stateTax).toBe(1535);
      // Withholding $3,000 - Tax $1,535 = Refund $1,465
      expect(result.stateRefund).toBe(1465);
      expect(result.stateOwed).toBe(0);
    });

    test("computes amount owed when withholding is less than tax", () => {
      const result = calculateStateTax(makeInput({
        state: "PA",
        federalAGI: 100_000,
        stateWithheld: 1_000,
      }));

      // PA tax on $100k = $3,070
      expect(result.rawResult!.stateTax).toBe(3070);
      // Withholding $1,000 + estimated $0 = $1,000
      // stateWithholding in the raw result is stateWithheld + stateEstimatedPayments = $1,000
      expect(result.stateOwed).toBe(2070);
      expect(result.stateRefund).toBe(0);
    });

    test("includes estimated payments in withholding total", () => {
      const result = calculateStateTax(makeInput({
        state: "PA",
        federalAGI: 100_000,
        stateWithheld: 1_000,
        stateEstimatedPayments: 2_500,
      }));

      // Total payments = $1,000 + $2,500 = $3,500
      // PA tax = $3,070
      // Refund = $430
      expect(result.stateRefund).toBe(430);
      expect(result.stateOwed).toBe(0);
    });
  });

  describe("Federal + state combined (integration)", () => {
    test("calculateFederalTax includes state tax when stateCode is provided", () => {
      const result = calculateFederalTax({
        filingStatus: "single",
        wages: 75_000,
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
        federalWithheld: 10_000,
        estimatedPayments: 0,
        stateCode: "CA",
        stateWithheld: 2_000,
        stateEstimatedPayments: 0,
      });

      // Federal return should be computed as normal
      expect(result.grossIncome).toBe(75_000);
      expect(result.federalTax).toBeGreaterThan(0);

      // State tax should be attached
      expect(result.stateTax).toBeDefined();
      expect(result.stateTax!.state).toBe("CA");
      expect(result.stateTax!.stateTax).toBeGreaterThan(0);
      expect(result.stateTax!.stateWithheld).toBe(2_000);
    });

    test("calculateFederalTax omits state tax when stateCode is not provided", () => {
      const result = calculateFederalTax({
        filingStatus: "single",
        wages: 75_000,
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
        federalWithheld: 10_000,
        estimatedPayments: 0,
      });

      expect(result.stateTax).toBeUndefined();
    });

    test("no-income-tax state returns zero in combined result", () => {
      const result = calculateFederalTax({
        filingStatus: "single",
        wages: 75_000,
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
        federalWithheld: 10_000,
        estimatedPayments: 0,
        stateCode: "FL",
      });

      expect(result.stateTax).toBeDefined();
      expect(result.stateTax!.stateTax).toBe(0);
      expect(result.stateTax!.notes[0]).toContain("does not levy");
    });
  });

  describe("listSupportedStates", () => {
    test("returns at least 19 states (10 implemented + 9 no-income-tax)", () => {
      const states = listSupportedStates();
      expect(states.length).toBeGreaterThanOrEqual(19);
    });

    test("includes CA as progressive", () => {
      const states = listSupportedStates();
      const ca = states.find((s) => s.stateCode === "CA");
      expect(ca).toBeDefined();
      expect(ca!.taxType).toBe("progressive");
      expect(ca!.hasCalculator).toBe(true);
    });

    test("includes TX as no-income-tax", () => {
      const states = listSupportedStates();
      const tx = states.find((s) => s.stateCode === "TX");
      expect(tx).toBeDefined();
      expect(tx!.taxType).toBe("none");
    });

    test("results are sorted by state code", () => {
      const states = listSupportedStates();
      const codes = states.map((s) => s.stateCode);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });
  });
});
