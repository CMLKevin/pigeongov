import { describe, expect, test } from "vitest";

import calculateTaxTool from "../../src/mcp/tools/calculate-tax.js";
import fillFormTool from "../../src/mcp/tools/fill-form.js";
import fillWorkflowTool from "../../src/mcp/tools/fill-workflow.js";
import listFormsTool from "../../src/mcp/tools/list-forms.js";
import listWorkflowsTool from "../../src/mcp/tools/list-workflows.js";

const singleFilerInput = {
  filingStatus: "single" as const,
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
};

describe("PigeonGov MCP tools", () => {
  test("list-forms exposes the 2025 form catalog", async () => {
    const result = await listFormsTool({});

    expect(result.flaggedFields).toEqual([]);
    expect(result.forms.map((form: { formId: string }) => form.formId)).toEqual(
      expect.arrayContaining(["1040", "schedule-1", "schedule-c", "w2", "1099-nec", "1099-int"]),
    );
  });

  test("calculate-tax returns the shared engine result", async () => {
    const result = await calculateTaxTool({ taxYear: 2025, data: singleFilerInput });

    expect(result.flaggedFields).toEqual([]);
    expect(result.calculation.totalTax).toBeCloseTo(3871.5, 2);
    expect(result.calculation.refund).toBeCloseTo(2328.5, 2);
  });

  test("fill-form returns calculated data and flaggedFields", async () => {
    const result = await fillFormTool({
      formId: "1040",
      taxYear: 2025,
      data: singleFilerInput,
      documents: [],
    });

    expect(result.flaggedFields).toEqual([]);
    expect(result.formId).toBe("1040");
    expect(result.calculation.totalTax).toBeCloseTo(3871.5, 2);
    expect(result.validation.flaggedFields).toEqual([]);
    expect(result.filledForm.calculation.federalTax).toBeCloseTo(3871.5, 2);
  });

  test("list-workflows exposes tax and non-tax workflows", async () => {
    const result = await listWorkflowsTool();

    expect(result.flaggedFields).toEqual([]);
    expect(result.workflows.map((workflow: { id: string }) => workflow.id)).toEqual(
      expect.arrayContaining([
        "tax/1040",
        "immigration/family-visa-intake",
        "healthcare/aca-enrollment",
        "unemployment/claim-intake",
      ]),
    );
  });

  test("fill-workflow returns workflow bundle output", async () => {
    const result = await fillWorkflowTool({
      workflowId: "unemployment/claim-intake",
      data: {
        applicant: {
          firstName: "Jordan",
          lastName: "Lee",
          ssn: "000-00-0000",
          address: {
            street1: "88 Pine St",
            city: "Seattle",
            state: "WA",
            zipCode: "98101",
          },
        },
        stateOfClaim: "WA",
        lastEmployerName: "Harbor Logistics",
        lastDayWorked: "2026-03-01",
        separationReason: "laid_off",
        wagesLast12Months: 68000,
        receivingSeverance: false,
        availableForWork: true,
        identityProofAvailable: true,
        wageProofAvailable: true,
        separationNoticeAvailable: true,
      },
    });

    expect(result.workflowId).toBe("unemployment/claim-intake");
    expect(result.bundle.review.headline).toContain("Claim readiness");
    expect(result.validation.flaggedFields).toEqual([]);
  });
});
