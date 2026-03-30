import type { WorkflowBundle } from "../../types.js";
import { buildEvidenceItem, buildGenericSummary, genericArtifacts, makeCheck } from "../helpers.js";
import { planningInputSchema } from "../schemas/planning.js";
import type { PlanningWorkflowInput } from "../schemas/planning.js";
import type { WorkflowDefinition } from "../types.js";

export const permitsWorkflows = {
  "permits/local-permit-planner": {
    summary: {
      id: "permits/local-permit-planner",
      domain: "permits",
      title: "Local permit planner",
      summary: "Preview workflow for local permit scoping and evidence collection.",
      status: "preview",
      audience: "individual",
      tags: ["permits", "construction", "local", "planning"],
    },
    inputSchema: planningInputSchema,
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
      entityName: "",
      state: "CA",
      locality: "",
      industry: "residential",
      needsProfessionalLicense: false,
      hasZoningQuestions: true,
    } satisfies PlanningWorkflowInput,
    sections: [
      {
        id: "permit",
        title: "Permit basics",
        fields: [
          { key: "entityName", label: "Project or applicant name", type: "text" },
          { key: "locality", label: "City or county", type: "text" },
          { key: "industry", label: "Permit category", type: "text" },
        ],
      },
    ],
    buildBundle(input: PlanningWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("site-plan", "Site plan or project description", true, true),
        buildEvidenceItem(
          "zoning",
          "Zoning and occupancy questions",
          true,
          !input.hasZoningQuestions,
          input.hasZoningQuestions ? "Review local zoning office guidance before applying." : undefined,
        ),
      ];
      return {
        workflowId: "permits/local-permit-planner",
        domain: "permits",
        title: "Local permit planner",
        summary: "Preview planner for local permit routing and document collection.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          locality: input.locality,
          planningMode: "preview",
        },
        validation: {
          checks: [makeCheck("locality", "Locality provided", input.locality.length > 0, "error", "Provide the city or county.")],
          flaggedFields: [],
        },
        review: buildGenericSummary(
          "Permit planning",
          "preview workflow",
          evidence,
          [],
          [`Permit area: ${input.locality}, ${input.state}.`, `Permit category: ${input.industry}.`],
        ),
        outputArtifacts: genericArtifacts("permits-local-permit-planner", evidence),
        provenance: ["workflow-registry", "permit-planning-model"],
      };
    },
  } satisfies WorkflowDefinition<PlanningWorkflowInput>,
} as const;
