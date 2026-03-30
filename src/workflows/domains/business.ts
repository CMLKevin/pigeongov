import type { WorkflowBundle } from "../../types.js";
import { buildEvidenceItem, buildGenericSummary, genericArtifacts, makeCheck } from "../helpers.js";
import { planningInputSchema } from "../schemas/planning.js";
import type { PlanningWorkflowInput } from "../schemas/planning.js";
import type { WorkflowDefinition } from "../types.js";

export const businessWorkflows = {
  "business/license-starter": {
    summary: {
      id: "business/license-starter",
      domain: "business",
      title: "Business license planner",
      summary: "Map local license, zoning, and entity-registration follow-up tasks for a new business.",
      status: "preview",
      audience: "business",
      tags: ["business", "license", "zoning", "registration"],
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
      industry: "",
      needsProfessionalLicense: false,
      hasZoningQuestions: false,
    } satisfies PlanningWorkflowInput,
    sections: [
      {
        id: "business",
        title: "Business setup",
        fields: [
          { key: "entityName", label: "Entity name", type: "text" },
          { key: "state", label: "State", type: "text" },
          { key: "locality", label: "City or county", type: "text" },
          { key: "industry", label: "Industry", type: "text" },
        ],
      },
    ],
    buildBundle(input: PlanningWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("entity", "Entity registration details", true, true),
        buildEvidenceItem(
          "professional-license",
          "Professional license checklist",
          input.needsProfessionalLicense,
          !input.needsProfessionalLicense,
        ),
        buildEvidenceItem(
          "zoning",
          "Zoning approval checklist",
          input.hasZoningQuestions,
          !input.hasZoningQuestions,
          input.hasZoningQuestions ? "Review local zoning and occupancy requirements." : undefined,
        ),
      ];
      return {
        workflowId: "business/license-starter",
        domain: "business",
        title: "Business license planner",
        summary: "Preview workflow for local business licensing planning.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          locality: input.locality,
          planningMode: "preview",
        },
        validation: {
          checks: [makeCheck("entity", "Entity name provided", input.entityName.length > 0, "error", "Provide the business name.")],
          flaggedFields: [],
        },
        review: buildGenericSummary(
          "Business launch planning",
          "preview workflow",
          evidence,
          [],
          [`Industry: ${input.industry}.`, `Locality: ${input.locality}, ${input.state}.`],
        ),
        outputArtifacts: genericArtifacts("business-license-starter", evidence),
        provenance: ["workflow-registry", "business-planning-model"],
      };
    },
  } satisfies WorkflowDefinition<PlanningWorkflowInput>,
} as const;
