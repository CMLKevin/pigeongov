import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import { buildEvidenceItem, buildGenericSummary, currency, genericArtifacts, makeCheck, makeFlag } from "../helpers.js";
import { unemploymentInputSchema } from "../schemas/unemployment.js";
import type { UnemploymentWorkflowInput } from "../schemas/unemployment.js";
import type { WorkflowDefinition } from "../types.js";

export const unemploymentWorkflows = {
  "unemployment/claim-intake": {
    summary: {
      id: "unemployment/claim-intake",
      domain: "unemployment",
      title: "Unemployment claim intake",
      summary: "Organize claimant identity, separation facts, and wage evidence for state unemployment review.",
      status: "active",
      audience: "individual",
      tags: ["unemployment", "claim", "wages", "state", "employment"],
    },
    inputSchema: unemploymentInputSchema,
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
      stateOfClaim: "CA",
      lastEmployerName: "",
      lastDayWorked: "",
      separationReason: "laid_off",
      wagesLast12Months: 0,
      receivingSeverance: false,
      availableForWork: true,
      identityProofAvailable: false,
      wageProofAvailable: false,
      separationNoticeAvailable: false,
    } satisfies UnemploymentWorkflowInput,
    sections: [
      {
        id: "claim",
        title: "Claim basics",
        fields: [
          { key: "applicant.firstName", label: "Claimant first name", type: "text" },
          { key: "stateOfClaim", label: "State of claim", type: "text" },
          { key: "lastEmployerName", label: "Last employer", type: "text" },
          { key: "lastDayWorked", label: "Last day worked", type: "date" },
        ],
      },
      {
        id: "separation",
        title: "Separation facts",
        fields: [
          {
            key: "separationReason",
            label: "Separation reason",
            type: "select",
            options: [
              { label: "Laid off", value: "laid_off" },
              { label: "Hours reduced", value: "hours_reduced" },
              { label: "Fired", value: "fired" },
              { label: "Quit", value: "quit" },
              { label: "Seasonal end", value: "seasonal_end" },
            ],
          },
          { key: "receivingSeverance", label: "Receiving severance", type: "confirm" },
          { key: "availableForWork", label: "Available for work", type: "confirm" },
          { key: "wagesLast12Months", label: "Wages in last 12 months", type: "currency" },
        ],
      },
    ],
    buildBundle(input: UnemploymentWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("identity", "Identity proof", true, input.identityProofAvailable),
        buildEvidenceItem("wages", "Wage proof", true, input.wageProofAvailable),
        buildEvidenceItem(
          "separation-notice",
          "Separation notice or termination letter",
          input.separationReason !== "hours_reduced",
          input.separationNoticeAvailable,
        ),
      ];
      const flags: ValidationFlag[] = [];
      if (!input.availableForWork) {
        flags.push(
          makeFlag(
            "availableForWork",
            "error",
            "Most unemployment programs require availability for suitable work.",
          ),
        );
      }
      if (input.separationReason === "quit" || input.separationReason === "fired") {
        flags.push(
          makeFlag(
            "separationReason",
            "review",
            "Quit and fired claims often require a fact-specific human review before filing.",
          ),
        );
      }
      if (input.receivingSeverance) {
        flags.push(
          makeFlag(
            "receivingSeverance",
            "review",
            "Severance may affect timing or state-specific eligibility calculations.",
          ),
        );
      }
      const checks = [
        makeCheck(
          "wage-proof",
          "Wage proof available",
          input.wageProofAvailable,
          "warning",
          "Collect wage statements or W-2s before claim review.",
        ),
        makeCheck(
          "availability",
          "Available for work",
          input.availableForWork,
          "error",
          "Claimant must usually certify availability for work.",
        ),
        makeCheck(
          "employer",
          "Employer identified",
          input.lastEmployerName.trim().length > 0,
          "error",
          "Provide the last employer name.",
        ),
      ];
      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "unemployment/claim-intake",
        domain: "unemployment",
        title: "Unemployment claim intake",
        summary:
          "State claim intake organizer for identity, wage, and separation facts. PigeonGov does not submit the claim.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          monthlyAverageWages: input.wagesLast12Months / 12,
          readinessState: missingEvidence === 0 ? "review-ready" : "needs-evidence",
          separationTrack: input.separationReason,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Claim readiness",
          missingEvidence === 0 ? "ready for state portal review" : "needs more documents",
          evidence,
          flags,
          [
            `State of claim: ${input.stateOfClaim}.`,
            `Last employer: ${input.lastEmployerName}.`,
            `Wages in last 12 months: ${currency(input.wagesLast12Months)}.`,
          ],
        ),
        outputArtifacts: genericArtifacts("unemployment-claim-intake", evidence),
        provenance: ["workflow-registry", "unemployment-claim-model"],
      };
    },
  } satisfies WorkflowDefinition<UnemploymentWorkflowInput>,
} as const;
