import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import { WorkflowDefinition } from "../registry.js";
import {
  buildEvidenceItem,
  buildGenericSummary,
  currency,
  genericArtifacts,
  makeCheck,
  makeFlag,
} from "../helpers.js";
import {
  passportInputSchema,
  nameChangeInputSchema,
  voterRegistrationInputSchema,
  realIdInputSchema,
  type PassportInput,
  type NameChangeInput,
  type VoterRegistrationInput,
  type RealIdInput,
} from "../schemas/identity-domain.js";

// ---------------------------------------------------------------------------
// identity/passport
// ---------------------------------------------------------------------------

const passportWorkflow = {
  summary: {
    id: "identity/passport",
    domain: "identity" as const,
    title: "Passport application planner",
    summary:
      "Determine form routing (DS-11 vs DS-82), document requirements, fees, and processing times for US passport applications.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["passport", "ds-11", "ds-82", "state-department", "identity"],
  },
  inputSchema: passportInputSchema,
  starterData: {
    applicantName: "",
    dob: "",
    citizenshipProof: "birth_certificate",
    isRenewal: false,
    hasNameChange: false,
    isMinor: false,
    processingSpeed: "routine",
  } satisfies PassportInput,
  sections: [
    {
      id: "application-type",
      title: "Application Type",
      fields: [
        { key: "isRenewal", label: "Is this a renewal?", type: "confirm" as const },
        { key: "hasNameChange", label: "Name change since last passport?", type: "confirm" as const },
        { key: "isMinor", label: "Applicant under 16?", type: "confirm" as const },
        {
          key: "processingSpeed",
          label: "Processing speed",
          type: "select" as const,
          options: [
            { label: "Routine (6-8 weeks)", value: "routine" },
            { label: "Expedited (2-3 weeks)", value: "expedited" },
            { label: "Urgent (same day / emergency)", value: "urgent" },
          ],
        },
      ],
    },
    {
      id: "applicant-information",
      title: "Applicant Information",
      fields: [
        { key: "applicantName", label: "Full legal name", type: "text" as const },
        { key: "dob", label: "Date of birth", type: "date" as const },
        {
          key: "citizenshipProof",
          label: "Citizenship proof type",
          type: "select" as const,
          options: [
            { label: "Birth certificate", value: "birth_certificate" },
            { label: "Naturalization certificate", value: "naturalization_certificate" },
            { label: "Previous passport", value: "previous_passport" },
          ],
        },
      ],
    },
    {
      id: "documentation",
      title: "Documentation",
      fields: [
        {
          key: "currentPassportInfo.passportNumber",
          label: "Current passport number (if renewal)",
          type: "text" as const,
        },
        {
          key: "currentPassportInfo.expirationDate",
          label: "Current passport expiration date",
          type: "date" as const,
        },
      ],
    },
  ],
  buildBundle(input: PassportInput): WorkflowBundle {
    // Determine form routing
    const canRenewByMail =
      input.isRenewal &&
      !input.hasNameChange &&
      !input.isMinor &&
      !!input.currentPassportInfo;

    const recommendedForm = canRenewByMail ? "DS-82" : "DS-11";

    // Fee calculation
    let applicationFee: number;
    let executionFee = 0;
    if (canRenewByMail) {
      applicationFee = 130; // DS-82 renewal
    } else {
      applicationFee = 165; // DS-11 new application
      executionFee = 35;    // execution fee for in-person
    }

    let expediteFee = 0;
    if (input.processingSpeed === "expedited" || input.processingSpeed === "urgent") {
      expediteFee = 60;
    }

    const totalFees = applicationFee + executionFee + expediteFee;

    // Processing time estimates
    const processingTimeMap = {
      routine: "6-8 weeks",
      expedited: "2-3 weeks",
      urgent: "Same day (at passport agency, by appointment only)",
    };
    const estimatedProcessingTime = processingTimeMap[input.processingSpeed];

    const evidence = [
      buildEvidenceItem(
        "citizenship-proof",
        input.citizenshipProof === "birth_certificate"
          ? "US birth certificate"
          : input.citizenshipProof === "naturalization_certificate"
            ? "Certificate of naturalization"
            : "Previous US passport",
        true,
        true, // User selected the type, so we assume they have it
      ),
      buildEvidenceItem("photo", "Passport photo (2x2 inches)", true, false),
      buildEvidenceItem(
        "current-passport",
        "Current/most recent passport",
        input.isRenewal,
        !!input.currentPassportInfo,
        input.isRenewal && !input.currentPassportInfo
          ? "Renewal requires your most recent passport."
          : undefined,
      ),
    ];

    if (input.hasNameChange) {
      evidence.push(
        buildEvidenceItem(
          "name-change-doc",
          "Name change documentation (court order, marriage certificate)",
          true,
          false,
        ),
      );
    }

    const flags: ValidationFlag[] = [];

    if (input.isMinor) {
      flags.push(
        makeFlag(
          "isMinor",
          "review",
          "Minor passport applications require both parents' consent or sole custody documentation. Both parents must appear in person for DS-11.",
        ),
      );
    }

    if (input.hasNameChange && !canRenewByMail) {
      flags.push(
        makeFlag(
          "hasNameChange",
          "warning",
          "Name change requires DS-11 (new application) even if renewing. Court order or marriage/divorce certificate required.",
        ),
      );
    }

    const checks = [
      makeCheck(
        "applicant-name",
        "Applicant name provided",
        input.applicantName.trim().length > 0,
        "error",
        "Full legal name is required.",
      ),
      makeCheck(
        "dob",
        "Date of birth provided",
        input.dob.trim().length > 0,
        "error",
        "Date of birth is required.",
      ),
    ];

    return {
      workflowId: "identity/passport",
      domain: "identity",
      title: "Passport application planner",
      summary: "Passport application readiness bundle. PigeonGov does not submit passport applications.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        recommendedForm,
        canRenewByMail,
        applicationFee,
        executionFee,
        expediteFee,
        totalFees,
        estimatedProcessingTime,
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "Passport application",
        `${recommendedForm} — ${estimatedProcessingTime}`,
        evidence,
        flags,
        [
          `Recommended form: ${recommendedForm} (${canRenewByMail ? "renewal by mail" : "in-person submission"}).`,
          `Total fees: ${currency(totalFees)} (application: ${currency(applicationFee)}${executionFee > 0 ? `, execution: ${currency(executionFee)}` : ""}${expediteFee > 0 ? `, expedite: ${currency(expediteFee)}` : ""}).`,
          `Estimated processing time: ${estimatedProcessingTime}.`,
        ],
      ),
      outputArtifacts: genericArtifacts("identity-passport", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<PassportInput>;

// ---------------------------------------------------------------------------
// identity/name-change
// ---------------------------------------------------------------------------

const NAME_CHANGE_UPDATE_ORDER = [
  "SSA",
  "DMV",
  "Passport",
  "Bank",
  "Employer",
  "Insurance",
  "Voter Registration",
  "Utilities",
] as const;

const nameChangeWorkflow = {
  summary: {
    id: "identity/name-change",
    domain: "identity" as const,
    title: "Name change planner",
    summary:
      "Plan your legal name change and track cascading updates across government agencies, financial institutions, and employers.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["name-change", "identity", "court-order", "ssa", "dmv"],
  },
  inputSchema: nameChangeInputSchema,
  starterData: {
    currentName: "",
    newName: "",
    reason: "marriage",
    state: "CA",
    hasCourtOrder: false,
    entitiesToUpdate: [...NAME_CHANGE_UPDATE_ORDER],
  } satisfies NameChangeInput,
  sections: [
    {
      id: "name-change-details",
      title: "Name Change Details",
      fields: [
        { key: "currentName", label: "Current legal name", type: "text" as const },
        { key: "newName", label: "New legal name", type: "text" as const },
        {
          key: "reason",
          label: "Reason for name change",
          type: "select" as const,
          options: [
            { label: "Marriage", value: "marriage" },
            { label: "Divorce", value: "divorce" },
            { label: "Personal preference", value: "personal" },
            { label: "Court order", value: "court-order" },
          ],
        },
      ],
    },
    {
      id: "state-requirements",
      title: "State Requirements",
      fields: [
        { key: "state", label: "State", type: "text" as const },
        { key: "hasCourtOrder", label: "Court order obtained", type: "confirm" as const },
      ],
    },
    {
      id: "cascading-updates",
      title: "Cascading Updates",
      description: "Entities to update after name change is legally effective.",
      fields: [
        {
          key: "entitiesToUpdate",
          label: "Entities to update",
          type: "textarea" as const,
          helpText: "Recommended order: SSA, DMV, Passport, Bank, Employer, Insurance, Voter Registration, Utilities.",
        },
      ],
    },
  ],
  buildBundle(input: NameChangeInput): WorkflowBundle {
    const needsCourtFiling = input.reason === "personal" || input.reason === "court-order";
    const hasReasonDoc = input.reason === "marriage" || input.reason === "divorce" || input.hasCourtOrder;

    const evidence = [
      buildEvidenceItem(
        "court-order",
        "Court order for name change",
        needsCourtFiling,
        input.hasCourtOrder,
      ),
      buildEvidenceItem("current-id", "Current government ID", true, false),
      buildEvidenceItem(
        "reason-proof",
        input.reason === "marriage"
          ? "Marriage certificate"
          : input.reason === "divorce"
            ? "Divorce decree"
            : "Court order or supporting documentation",
        true,
        hasReasonDoc,
      ),
    ];

    const flags: ValidationFlag[] = [];

    // Publication requirement
    const statesRequiringPublication = new Set([
      "AL", "AZ", "CA", "FL", "GA", "IL", "IN", "KY", "LA", "MD",
      "MI", "MN", "MS", "MO", "NJ", "NY", "NC", "OH", "OK", "PA",
      "SC", "TN", "TX", "VA", "WA", "WI",
    ]);

    if (needsCourtFiling && statesRequiringPublication.has(input.state)) {
      flags.push(
        makeFlag(
          "state",
          "review",
          `${input.state} may require publication of name change petition in a local newspaper before the hearing. Check county court requirements.`,
        ),
      );
    }

    if (needsCourtFiling && !input.hasCourtOrder) {
      flags.push(
        makeFlag(
          "hasCourtOrder",
          "warning",
          "A court order is required for this type of name change. File a petition with your county court.",
        ),
      );
    }

    // Build cascading update checklist in canonical order
    const updateChecklist = NAME_CHANGE_UPDATE_ORDER
      .filter((entity) => input.entitiesToUpdate.includes(entity))
      .map((entity, idx) => ({
        step: idx + 1,
        entity,
        status: "pending" as const,
      }));

    const checks = [
      makeCheck(
        "current-name",
        "Current name provided",
        input.currentName.trim().length > 0,
        "error",
        "Current legal name is required.",
      ),
      makeCheck(
        "new-name",
        "New name provided",
        input.newName.trim().length > 0,
        "error",
        "New legal name is required.",
      ),
      makeCheck(
        "reason-doc",
        "Supporting documentation available",
        hasReasonDoc,
        "warning",
        "Obtain supporting documentation (marriage cert, divorce decree, or court order) before starting updates.",
      ),
    ];

    return {
      workflowId: "identity/name-change",
      domain: "identity",
      title: "Name change planner",
      summary: "Name change planning bundle. PigeonGov does not file court petitions.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        needsCourtFiling,
        updateChecklist,
        entitiesToUpdateCount: input.entitiesToUpdate.length,
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "Name change",
        `${input.currentName || "?"} to ${input.newName || "?"}`,
        evidence,
        flags,
        [
          `Name change from ${input.currentName || "?"} to ${input.newName || "?"}.`,
          `${input.entitiesToUpdate.length} entities to update.`,
          `Court filing required: ${needsCourtFiling ? "yes" : "no"}.`,
        ],
      ),
      outputArtifacts: genericArtifacts("identity-name-change", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<NameChangeInput>;

// ---------------------------------------------------------------------------
// identity/voter-registration
// ---------------------------------------------------------------------------

const voterRegistrationWorkflow = {
  summary: {
    id: "identity/voter-registration",
    domain: "identity" as const,
    title: "Voter registration guide",
    summary:
      "Check eligibility, determine registration method, and prepare documentation for voter registration.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["voter", "registration", "election", "identity", "civic"],
  },
  inputSchema: voterRegistrationInputSchema,
  starterData: {
    name: "",
    address: {
      street1: "",
      city: "",
      state: "CA",
      zipCode: "",
    },
    dob: "",
    citizenshipConfirmed: false,
    state: "CA",
    previousRegistration: false,
  } satisfies VoterRegistrationInput,
  sections: [
    {
      id: "eligibility",
      title: "Eligibility",
      fields: [
        { key: "citizenshipConfirmed", label: "US citizen", type: "confirm" as const },
        { key: "dob", label: "Date of birth", type: "date" as const },
      ],
    },
    {
      id: "registration-details",
      title: "Registration Details",
      fields: [
        { key: "name", label: "Full legal name", type: "text" as const },
        { key: "address.street1", label: "Street address", type: "text" as const },
        { key: "address.city", label: "City", type: "text" as const },
        { key: "state", label: "State", type: "text" as const },
        { key: "address.zipCode", label: "ZIP code", type: "text" as const },
        { key: "previousRegistration", label: "Previously registered in another state?", type: "confirm" as const },
        {
          key: "partyAffiliation",
          label: "Party affiliation (optional)",
          type: "text" as const,
          helpText: "Some states require party affiliation to vote in primaries.",
        },
      ],
    },
  ],
  buildBundle(input: VoterRegistrationInput): WorkflowBundle {
    // States with online voter registration (most states now support this)
    const noOnlineRegistration = new Set(["AR", "MS", "MT", "NH", "SD", "TX", "WY"]);
    const sameDayRegistration = new Set([
      "CA", "CO", "CT", "DC", "HI", "ID", "IL", "IA", "ME", "MD",
      "MI", "MN", "MT", "NV", "NH", "NM", "NC", "UT", "VT", "VA",
      "WA", "WI",
    ]);

    const hasOnline = !noOnlineRegistration.has(input.state);
    const hasSameDay = sameDayRegistration.has(input.state);

    let registrationMethod: string;
    if (hasOnline) {
      registrationMethod = "Online registration available — visit your state's election website.";
    } else {
      registrationMethod = "Online registration not available — register by mail or in person.";
    }

    const evidence = [
      buildEvidenceItem("identity-doc", "Government-issued ID or last 4 of SSN", true, false),
      buildEvidenceItem("residency-proof", "Proof of residency (varies by state)", true, false),
    ];

    const flags: ValidationFlag[] = [];

    if (!input.citizenshipConfirmed) {
      flags.push(
        makeFlag("citizenshipConfirmed", "error", "US citizenship is required to register to vote."),
      );
    }

    const checks = [
      makeCheck(
        "citizenship",
        "US citizenship confirmed",
        input.citizenshipConfirmed,
        "error",
        "You must be a US citizen to register to vote.",
      ),
      makeCheck(
        "name-provided",
        "Name provided",
        input.name.trim().length > 0,
        "error",
        "Legal name is required for registration.",
      ),
      makeCheck(
        "address-provided",
        "Address provided",
        input.address.street1.trim().length > 0,
        "error",
        "Residential address is required for registration.",
      ),
    ];

    return {
      workflowId: "identity/voter-registration",
      domain: "identity",
      title: "Voter registration guide",
      summary: "Voter registration readiness bundle. PigeonGov does not register voters.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        hasOnlineRegistration: hasOnline,
        hasSameDayRegistration: hasSameDay,
        registrationMethod,
        deadlineNote: hasSameDay
          ? "Same-day registration available — register at your polling place on Election Day."
          : "Register at least 30 days before Election Day (typical state deadline).",
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "Voter registration",
        input.citizenshipConfirmed ? "eligible" : "citizenship not confirmed",
        evidence,
        flags,
        [
          registrationMethod,
          hasSameDay
            ? "Same-day registration is available in your state."
            : "Register at least 30 days before Election Day.",
        ],
      ),
      outputArtifacts: genericArtifacts("identity-voter-registration", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<VoterRegistrationInput>;

// ---------------------------------------------------------------------------
// identity/real-id
// ---------------------------------------------------------------------------

const realIdWorkflow = {
  summary: {
    id: "identity/real-id",
    domain: "identity" as const,
    title: "REAL ID readiness checker",
    summary:
      "Check document readiness for REAL ID-compliant driver's license or ID card.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["real-id", "dmv", "identity", "driver-license", "tsa"],
  },
  inputSchema: realIdInputSchema,
  starterData: {
    name: "",
    dob: "",
    state: "CA",
    hasIdentityDoc: false,
    hasSsnDoc: false,
    hasResidencyDocs: 0,
    hasCurrentLicense: false,
  } satisfies RealIdInput,
  sections: [
    {
      id: "document-checklist",
      title: "Document Checklist",
      description: "REAL ID requires four categories of documentation.",
      fields: [
        {
          key: "hasIdentityDoc",
          label: "Identity document (passport or birth certificate)",
          type: "confirm" as const,
        },
        {
          key: "hasSsnDoc",
          label: "SSN document (card, W-2, or SSA-1099)",
          type: "confirm" as const,
        },
        {
          key: "hasResidencyDocs",
          label: "Number of residency proofs (need 2: utility bill, bank statement, etc.)",
          type: "number" as const,
        },
        {
          key: "hasCurrentLicense",
          label: "Current driver's license or state ID",
          type: "confirm" as const,
        },
      ],
    },
    {
      id: "current-status",
      title: "Current Status",
      fields: [
        { key: "name", label: "Full legal name", type: "text" as const },
        { key: "dob", label: "Date of birth", type: "date" as const },
        { key: "state", label: "State", type: "text" as const },
      ],
    },
  ],
  buildBundle(input: RealIdInput): WorkflowBundle {
    const residencyDocsProvided = Math.min(input.hasResidencyDocs, 2);
    const requiredDocsMet = [
      input.hasIdentityDoc,       // 1. Identity
      input.hasSsnDoc,            // 2. SSN
      residencyDocsProvided >= 2, // 3. Two residency proofs
      input.hasCurrentLicense,    // 4. Current license/ID
    ];
    const docsVerified = requiredDocsMet.filter(Boolean).length;

    const evidence = [
      buildEvidenceItem(
        "identity-doc",
        "Identity document (passport, birth certificate, or permanent resident card)",
        true,
        input.hasIdentityDoc,
      ),
      buildEvidenceItem(
        "ssn-doc",
        "SSN document (Social Security card, W-2, or SSA-1099)",
        true,
        input.hasSsnDoc,
      ),
      buildEvidenceItem(
        "residency-1",
        "Residency proof #1 (utility bill, bank statement, mortgage statement)",
        true,
        residencyDocsProvided >= 1,
      ),
      buildEvidenceItem(
        "residency-2",
        "Residency proof #2 (must be different from #1)",
        true,
        residencyDocsProvided >= 2,
      ),
      buildEvidenceItem(
        "current-license",
        "Current driver's license or state ID",
        false,
        input.hasCurrentLicense,
      ),
    ];

    const flags: ValidationFlag[] = [];

    if (residencyDocsProvided < 2) {
      flags.push(
        makeFlag(
          "hasResidencyDocs",
          "warning",
          `You have ${residencyDocsProvided} of 2 required residency proofs. Accepted: utility bills, bank statements, mortgage documents, rental agreements.`,
        ),
      );
    }

    const checks = [
      makeCheck("identity-doc", "Identity document", input.hasIdentityDoc, "error", "A valid identity document is required."),
      makeCheck("ssn-doc", "SSN document", input.hasSsnDoc, "error", "A document showing your SSN is required."),
      makeCheck("residency", "Two residency proofs", residencyDocsProvided >= 2, "error", "Two different proofs of residency are required."),
    ];

    return {
      workflowId: "identity/real-id",
      domain: "identity",
      title: "REAL ID readiness checker",
      summary: "REAL ID document readiness bundle. PigeonGov does not issue IDs.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        docsVerified,
        totalRequired: 4,
        ready: docsVerified === 4,
        missingCategories: [
          ...(!input.hasIdentityDoc ? ["identity document"] : []),
          ...(!input.hasSsnDoc ? ["SSN document"] : []),
          ...(residencyDocsProvided < 2 ? [`${2 - residencyDocsProvided} more residency proof(s)`] : []),
        ],
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "REAL ID readiness",
        `${docsVerified}/4 required documents verified`,
        evidence,
        flags,
        [
          `REAL ID readiness: ${docsVerified}/4 required documents verified.`,
          docsVerified === 4
            ? "All required documents accounted for — schedule a DMV appointment."
            : "Gather missing documents before visiting the DMV.",
        ],
      ),
      outputArtifacts: genericArtifacts("identity-real-id", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<RealIdInput>;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const identityWorkflows = {
  "identity/passport": passportWorkflow,
  "identity/name-change": nameChangeWorkflow,
  "identity/voter-registration": voterRegistrationWorkflow,
  "identity/real-id": realIdWorkflow,
} as const;
