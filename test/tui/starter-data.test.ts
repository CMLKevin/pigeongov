/**
 * TUI smoke tests — verify the exact flow the TUI uses:
 * 1. List workflow catalog
 * 2. Get starter data for a workflow
 * 3. Build a bundle from starter data (empty fields)
 * 4. Bundle should not crash — may have validation flags
 *
 * This is the critical path that was crashing in production.
 */
import { describe, test, expect } from "vitest";
import {
  listWorkflowSummaries,
  getWorkflowStarterData,
  buildWorkflowBundle,
  describeWorkflow,
} from "../../src/workflows/registry.js";

describe("TUI workflow catalog", () => {
  test("lists all 34 workflows", () => {
    const workflows = listWorkflowSummaries();
    expect(workflows.length).toBe(34);
  });

  test("every workflow has required summary fields", () => {
    for (const wf of listWorkflowSummaries()) {
      expect(wf.id).toBeTruthy();
      expect(wf.domain).toBeTruthy();
      expect(wf.title).toBeTruthy();
      expect(wf.status).toMatch(/^(active|preview|planned)$/);
    }
  });

  test("every workflow can be described", () => {
    for (const wf of listWorkflowSummaries()) {
      const desc = describeWorkflow(wf.id);
      expect(desc.id).toBe(wf.id);
      expect(desc.sections).toBeDefined();
      expect(Array.isArray(desc.sections)).toBe(true);
    }
  });
});

describe("TUI starter data → bundle (the critical path)", () => {
  const workflows = listWorkflowSummaries();

  for (const wf of workflows) {
    test(`${wf.id}: starter data → buildWorkflowBundle does NOT crash`, () => {
      const starter = getWorkflowStarterData(wf.id);
      expect(starter).toBeDefined();

      // This MUST NOT throw — the TUI passes starter data directly
      const bundle = buildWorkflowBundle(wf.id, starter);

      expect(bundle.workflowId).toBe(wf.id);
      expect(bundle.domain).toBe(wf.domain);
      expect(bundle.validation).toBeDefined();
      expect(bundle.validation.checks).toBeDefined();
      expect(bundle.validation.flaggedFields).toBeDefined();
      expect(bundle.review).toBeDefined();
      expect(bundle.review.headline).toBeTruthy();
    });
  }
});

describe("TUI bundle structure", () => {
  test("tax/1040 bundle has calculation data", () => {
    const starter = getWorkflowStarterData("tax/1040");
    const bundle = buildWorkflowBundle("tax/1040", starter);
    expect(bundle.calculation).toBeDefined();
  });

  test("tax/1040 bundle with real data produces valid calculation", () => {
    const bundle = buildWorkflowBundle("tax/1040", {
      taxpayer: {
        firstName: "Jane",
        lastName: "Doe",
        ssn: "123-45-6789",
        address: { street1: "123 Main St", city: "Springfield", state: "CA", zipCode: "90210" },
      },
      filingStatus: "single",
      wages: 85000,
      taxableInterest: 500,
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
      federalWithheld: 12000,
      estimatedPayments: 0,
      dependents: [],
    });

    expect(bundle.workflowId).toBe("tax/1040");
    const calc = bundle.calculation as Record<string, unknown>;
    expect(calc).toBeDefined();
    expect(calc.grossIncome).toBe(85500);
    expect(calc.totalTax).toBeGreaterThan(0);
    expect(typeof calc.refund).toBe("number");
  });

  test("benefits/snap bundle has eligibility data", () => {
    const bundle = buildWorkflowBundle("benefits/snap", {
      householdSize: 4,
      monthlyGrossIncome: 2500,
      monthlyNetIncome: 2100,
      state: "CA",
      citizenshipStatus: "us_citizen",
      receivingTanf: false,
      receivingSsi: false,
      hasAssets: false,
      assetValue: 0,
      hasVehicle: false,
    });

    expect(bundle.workflowId).toBe("benefits/snap");
    expect(bundle.derived).toBeDefined();
  });

  test("immigration/naturalization bundle works with starter data", () => {
    const starter = getWorkflowStarterData("immigration/naturalization");
    const bundle = buildWorkflowBundle("immigration/naturalization", starter);
    expect(bundle.workflowId).toBe("immigration/naturalization");
    expect(bundle.evidence.length).toBeGreaterThan(0);
  });
});

describe("TUI error resilience", () => {
  test("buildWorkflowBundle with completely empty object returns error bundle", () => {
    const bundle = buildWorkflowBundle("tax/1040", {});
    expect(bundle.workflowId).toBe("tax/1040");
    expect(bundle.validation.flaggedFields.length).toBeGreaterThan(0);
    // Should not throw
  });

  test("buildWorkflowBundle with partial data returns bundle with flags", () => {
    const bundle = buildWorkflowBundle("tax/1040", {
      filingStatus: "single",
      wages: 50000,
      // Missing everything else
    });
    expect(bundle.workflowId).toBe("tax/1040");
    // Should have flags for missing fields but not crash
  });
});
