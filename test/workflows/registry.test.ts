import { describe, expect, test } from "vitest";

import {
  buildWorkflowBundle,
  describeWorkflow,
  listWorkflowSummaries,
} from "../../src/workflows/registry.js";

describe("workflow registry", () => {
  test("lists cross-domain workflows", () => {
    const workflows = listWorkflowSummaries();

    expect(workflows.map((workflow) => workflow.id)).toEqual(
      expect.arrayContaining([
        "tax/1040",
        "immigration/family-visa-intake",
        "healthcare/aca-enrollment",
        "unemployment/claim-intake",
      ]),
    );
  });

  test("describes workflow sections for planner clients", () => {
    const descriptor = describeWorkflow("immigration/family-visa-intake");

    expect(descriptor.sections.length).toBeGreaterThan(0);
    expect(descriptor.starterData).toHaveProperty("beneficiary");
  });

  test("builds a healthcare bundle with evidence and review output", () => {
    const bundle = buildWorkflowBundle("healthcare/aca-enrollment", {
      applicant: {
        firstName: "Mia",
        lastName: "Johnson",
        ssn: "000-00-0000",
        address: {
          street1: "500 W 2nd St",
          city: "Austin",
          state: "TX",
          zipCode: "78701",
        },
      },
      household: [{ name: "Leo Johnson", relationship: "child", age: 7 }],
      stateOfResidence: "TX",
      annualHouseholdIncome: 52000,
      currentlyInsured: false,
      qualifyingLifeEvent: true,
      hasEmployerCoverageOffer: false,
      needsDependentCoverage: true,
      immigrationDocumentsAvailable: true,
      incomeProofAvailable: true,
      residenceProofAvailable: true,
      preferredCoverageMonth: "May",
    });

    expect(bundle.domain).toBe("healthcare");
    expect(bundle.evidence.length).toBeGreaterThan(0);
    expect(bundle.review.headline).toContain("Enrollment readiness");
  });
});
