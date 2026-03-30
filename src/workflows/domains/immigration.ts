import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import { buildEvidenceItem, buildGenericSummary, genericArtifacts, makeCheck, makeFlag } from "../helpers.js";
import { immigrationInputSchema } from "../schemas/immigration.js";
import type { ImmigrationWorkflowInput } from "../schemas/immigration.js";
import type { WorkflowDefinition } from "../types.js";

export const immigrationWorkflows = {
  "immigration/family-visa-intake": {
    summary: {
      id: "immigration/family-visa-intake",
      domain: "immigration",
      title: "Family visa packet intake",
      summary: "Build a household-centered family visa or adjustment packet checklist before attorney or human review.",
      status: "active",
      audience: "household",
      tags: ["uscis", "family", "visa", "packet", "evidence"],
    },
    inputSchema: immigrationInputSchema,
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
      beneficiary: {
        fullName: "",
        relationship: "spouse",
        currentCountry: "",
        currentlyInUnitedStates: false,
      },
      household: [],
      visaGoal: "family",
      petitionerStatus: "uscitizen",
      hasPassportCopy: false,
      hasBirthCertificate: false,
      hasRelationshipEvidence: false,
      hasFinancialSponsor: false,
      priorVisaDenials: false,
      needsTranslation: false,
      workAuthorizationRequested: false,
    } satisfies ImmigrationWorkflowInput,
    sections: [
      {
        id: "sponsor",
        title: "Petitioner",
        fields: [
          { key: "applicant.firstName", label: "Petitioner first name", type: "text" },
          { key: "applicant.lastName", label: "Petitioner last name", type: "text" },
          {
            key: "petitionerStatus",
            label: "Petitioner status",
            type: "select",
            options: [
              { label: "US citizen", value: "uscitizen" },
              { label: "Permanent resident", value: "permanent_resident" },
              { label: "Employer", value: "employer" },
              { label: "Other", value: "other" },
            ],
          },
        ],
      },
      {
        id: "beneficiary",
        title: "Beneficiary",
        fields: [
          { key: "beneficiary.fullName", label: "Beneficiary full name", type: "text" },
          { key: "beneficiary.relationship", label: "Relationship", type: "text" },
          { key: "beneficiary.currentCountry", label: "Current country", type: "text" },
          {
            key: "beneficiary.currentlyInUnitedStates",
            label: "Currently in the United States",
            type: "confirm",
          },
        ],
      },
      {
        id: "evidence",
        title: "Evidence",
        fields: [
          { key: "hasPassportCopy", label: "Passport copy available", type: "confirm" },
          { key: "hasBirthCertificate", label: "Birth certificate available", type: "confirm" },
          {
            key: "hasRelationshipEvidence",
            label: "Relationship evidence available",
            type: "confirm",
          },
          { key: "hasFinancialSponsor", label: "Financial sponsor ready", type: "confirm" },
        ],
      },
    ],
    buildBundle(input: ImmigrationWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("passport", "Passport biographic page", true, input.hasPassportCopy),
        buildEvidenceItem("birth", "Birth certificate", true, input.hasBirthCertificate),
        buildEvidenceItem(
          "relationship",
          "Relationship evidence",
          true,
          input.hasRelationshipEvidence,
        ),
        buildEvidenceItem(
          "financial",
          "Financial sponsor package",
          true,
          input.hasFinancialSponsor,
        ),
        buildEvidenceItem(
          "translations",
          "Certified translations",
          input.needsTranslation,
          !input.needsTranslation,
          input.needsTranslation ? "Confirm each non-English civil document has a translation." : undefined,
        ),
      ];
      const flags: ValidationFlag[] = [];
      if (input.priorVisaDenials) {
        flags.push(
          makeFlag(
            "priorVisaDenials",
            "review",
            "Prior denials usually require a human review of prior filings and refusal notices.",
          ),
        );
      }
      if (!input.hasFinancialSponsor) {
        flags.push(
          makeFlag(
            "hasFinancialSponsor",
            "warning",
            "Most family visa packets need a support affidavit or equivalent sponsor evidence.",
          ),
        );
      }
      if (!input.hasRelationshipEvidence) {
        flags.push(
          makeFlag(
            "hasRelationshipEvidence",
            "error",
            "Relationship evidence is missing for a family-based packet.",
          ),
        );
      }
      const checks = [
        makeCheck(
          "beneficiary-name",
          "Beneficiary identity captured",
          input.beneficiary.fullName.trim().length > 0,
          "error",
          "Provide the beneficiary legal name.",
        ),
        makeCheck(
          "relationship-evidence",
          "Relationship evidence captured",
          input.hasRelationshipEvidence,
          "error",
          "Relationship evidence is required for packet assembly.",
        ),
        makeCheck(
          "passport-copy",
          "Passport copy available",
          input.hasPassportCopy,
          "warning",
          "Passport copy is recommended before packet review.",
        ),
      ];
      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "immigration/family-visa-intake",
        domain: "immigration",
        title: "Family visa packet intake",
        summary:
          "Packet planner for family visa and adjustment-style evidence assembly. PigeonGov does not submit to USCIS.",
        applicant: input.applicant,
        household: [
          {
            name: input.beneficiary.fullName,
            relationship: input.beneficiary.relationship,
          },
          ...input.household,
        ],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          packetTrack: input.beneficiary.currentlyInUnitedStates ? "adjustment-review" : "consular-review",
          missingEvidenceCount: missingEvidence,
          workAuthorizationRequested: input.workAuthorizationRequested,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Visa packet readiness",
          missingEvidence === 0 ? "ready for human review" : "needs more evidence",
          evidence,
          flags,
          [
            `${input.beneficiary.fullName} is being reviewed for a ${input.visaGoal} packet.`,
            `Recommended track: ${input.beneficiary.currentlyInUnitedStates ? "adjustment of status review" : "consular packet review"}.`,
            `Missing evidence items: ${missingEvidence}.`,
          ],
        ),
        outputArtifacts: genericArtifacts("immigration-family-visa-intake", evidence),
        provenance: ["workflow-registry", "immigration-evidence-model"],
      };
    },
  } satisfies WorkflowDefinition<ImmigrationWorkflowInput>,
} as const;
