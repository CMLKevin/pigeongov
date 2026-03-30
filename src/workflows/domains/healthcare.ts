import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import { buildEvidenceItem, buildGenericSummary, currency, genericArtifacts, makeCheck, makeFlag } from "../helpers.js";
import { healthcareInputSchema } from "../schemas/healthcare.js";
import type { HealthcareWorkflowInput } from "../schemas/healthcare.js";
import type { WorkflowDefinition } from "../types.js";

export const healthcareWorkflows = {
  "healthcare/aca-enrollment": {
    summary: {
      id: "healthcare/aca-enrollment",
      domain: "healthcare",
      title: "Healthcare enrollment planner",
      summary: "Organize household, income, and coverage evidence for marketplace enrollment review.",
      status: "active",
      audience: "household",
      tags: ["healthcare", "aca", "marketplace", "household", "coverage"],
    },
    inputSchema: healthcareInputSchema,
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      household: [],
      stateOfResidence: "CA",
      annualHouseholdIncome: 0,
      currentlyInsured: false,
      qualifyingLifeEvent: false,
      hasEmployerCoverageOffer: false,
      needsDependentCoverage: false,
      immigrationDocumentsAvailable: true,
      incomeProofAvailable: false,
      residenceProofAvailable: false,
      preferredCoverageMonth: "January",
    } satisfies HealthcareWorkflowInput,
    sections: [
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "applicant.firstName", label: "Applicant first name", type: "text" },
          { key: "stateOfResidence", label: "State of residence", type: "text" },
          {
            key: "annualHouseholdIncome",
            label: "Annual household income",
            type: "currency",
          },
          {
            key: "preferredCoverageMonth",
            label: "Preferred coverage month",
            type: "text",
          },
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility",
        fields: [
          { key: "currentlyInsured", label: "Currently insured", type: "confirm" },
          { key: "qualifyingLifeEvent", label: "Qualifying life event", type: "confirm" },
          {
            key: "hasEmployerCoverageOffer",
            label: "Employer coverage offered",
            type: "confirm",
          },
          { key: "needsDependentCoverage", label: "Needs dependent coverage", type: "confirm" },
        ],
      },
    ],
    buildBundle(input: HealthcareWorkflowInput): WorkflowBundle {
      const householdSize = input.household.length + 1;
      const monthlyIncome = input.annualHouseholdIncome / 12;
      const evidence = [
        buildEvidenceItem("income-proof", "Income proof", true, input.incomeProofAvailable),
        buildEvidenceItem("residence-proof", "Residence proof", true, input.residenceProofAvailable),
        buildEvidenceItem(
          "immigration-docs",
          "Immigration or citizenship documents",
          true,
          input.immigrationDocumentsAvailable,
        ),
        buildEvidenceItem(
          "employer-coverage",
          "Employer coverage notice",
          input.hasEmployerCoverageOffer,
          !input.hasEmployerCoverageOffer,
          input.hasEmployerCoverageOffer
            ? "Human review recommended to compare affordability and minimum value."
            : undefined,
        ),
      ];
      const flags: ValidationFlag[] = [];
      if (!input.qualifyingLifeEvent && input.currentlyInsured) {
        flags.push(
          makeFlag(
            "qualifyingLifeEvent",
            "review",
            "Outside open enrollment, a qualifying life event is usually needed to change coverage.",
          ),
        );
      }
      if (input.hasEmployerCoverageOffer) {
        flags.push(
          makeFlag(
            "hasEmployerCoverageOffer",
            "review",
            "Employer-sponsored coverage may affect marketplace subsidies and needs a human check.",
          ),
        );
      }
      const checks = [
        makeCheck(
          "income-proof",
          "Income proof available",
          input.incomeProofAvailable,
          "warning",
          "Upload pay stubs or other income proof before submission review.",
        ),
        makeCheck(
          "residence-proof",
          "Residence proof available",
          input.residenceProofAvailable,
          "warning",
          "Residence proof is often needed to complete enrollment review.",
        ),
        makeCheck(
          "coverage-month",
          "Coverage month selected",
          input.preferredCoverageMonth.trim().length > 0,
          "error",
          "Choose a target coverage month.",
        ),
      ];
      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "healthcare/aca-enrollment",
        domain: "healthcare",
        title: "Healthcare enrollment planner",
        summary:
          "Household-centric enrollment planner for marketplace review. PigeonGov does not file coverage applications for you.",
        applicant: input.applicant,
        household: input.household,
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          householdSize,
          monthlyIncome,
          coverageTrack: input.qualifyingLifeEvent ? "special-enrollment-review" : "open-enrollment-review",
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Enrollment readiness",
          missingEvidence === 0 ? "ready for review" : "missing documentation",
          evidence,
          flags,
          [
            `Household size: ${householdSize}.`,
            `Annual household income: ${currency(input.annualHouseholdIncome)}.`,
            `Target effective month: ${input.preferredCoverageMonth}.`,
          ],
        ),
        outputArtifacts: genericArtifacts("healthcare-aca-enrollment", evidence),
        provenance: ["workflow-registry", "healthcare-enrollment-model"],
      };
    },
  } satisfies WorkflowDefinition<HealthcareWorkflowInput>,
} as const;
