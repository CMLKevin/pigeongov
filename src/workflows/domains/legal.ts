import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import {
  buildEvidenceItem,
  buildGenericSummary,
  currency,
  genericArtifacts,
  makeCheck,
  makeFlag,
} from "../helpers.js";
import type { WorkflowDefinition } from "../registry.js";
import {
  childSupportModificationInputSchema,
  expungementInputSchema,
  smallClaimsInputSchema,
} from "../schemas/legal.js";
import type {
  ChildSupportModificationInput,
  ExpungementInput,
  SmallClaimsInput,
} from "../schemas/legal.js";

// ---------------------------------------------------------------------------
// legal/small-claims
// ---------------------------------------------------------------------------

function estimateFilingFee(amount: number): number {
  if (amount <= 2_500) return 30;
  if (amount <= 5_000) return 50;
  return 75;
}

function buildSmallClaimsBundle(input: SmallClaimsInput): WorkflowBundle {
  const filingFee = estimateFilingFee(input.claimAmount);
  // Placeholder: most states cap small claims at $5,000-$25,000
  const typicalLimit = 10_000;
  const exceedsLimit = input.claimAmount > typicalLimit;

  // Statute of limitations rough check — 2 years from incident
  const incidentDate = input.incidentDate ? new Date(input.incidentDate) : null;
  const now = new Date();
  const daysSinceIncident = incidentDate
    ? Math.floor((now.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const yearsElapsed = incidentDate ? daysSinceIncident / 365.25 : 0;
  const possibleSolConcern = incidentDate ? yearsElapsed > 2 : false;

  const evidence = [
    buildEvidenceItem("receipts", "Receipts or invoices", false, input.hasEvidence),
    buildEvidenceItem("contracts", "Contracts or written agreements", false, input.hasEvidence),
    buildEvidenceItem("photos", "Photographs of damage or condition", false, false),
    buildEvidenceItem("correspondence", "Correspondence (emails, texts, letters)", false, false),
    buildEvidenceItem("witness-info", "Witness contact information", false, false),
  ];

  const flags: ValidationFlag[] = [];
  if (exceedsLimit) {
    flags.push(makeFlag("claimAmount", "warning", `Claim of ${currency(input.claimAmount)} exceeds typical small claims limit of ${currency(typicalLimit)}. Check ${input.state} specific limits ($5,000-$25,000 depending on state).`));
  }
  if (possibleSolConcern) {
    flags.push(makeFlag("incidentDate", "warning", `Incident occurred ~${Math.round(yearsElapsed * 10) / 10} years ago. Many states have 2-3 year statutes of limitations for small claims. Verify ${input.state} statute.`));
  }

  const checks = [
    makeCheck("claim-amount", "Claim within typical limits", !exceedsLimit, "warning", `Check ${input.state} small claims dollar limit.`),
    makeCheck("defendant-identified", "Defendant identified", input.defendantName.trim().length > 0, "error", "Defendant must be identified to file a small claims case."),
    makeCheck("evidence-available", "Some evidence available", input.hasEvidence, "warning", "Gather supporting evidence before filing."),
  ];

  return {
    workflowId: "legal/small-claims",
    domain: "legal",
    title: "Small claims court filing",
    summary: "Small claims case preparation with filing fee estimate and evidence checklist. PigeonGov does not file court documents.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      estimatedFilingFee: filingFee,
      typicalDollarLimit: typicalLimit,
      exceedsLimit,
      daysSinceIncident,
      yearsElapsed: Math.round(yearsElapsed * 10) / 10,
      possibleStatuteOfLimitationsConcern: possibleSolConcern,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "Small claims case",
      exceedsLimit ? "claim may exceed small claims limit" : "within typical limits",
      evidence,
      flags,
      [
        `${input.plaintiffName} v. ${input.defendantName}. State: ${input.state}.`,
        `Claim type: ${input.claimType}. Amount: ${currency(input.claimAmount)}.`,
        `Incident date: ${input.incidentDate}. ~${Math.round(yearsElapsed * 10) / 10} years ago.`,
        `Estimated filing fee: ${currency(filingFee)}.`,
      ],
    ),
    outputArtifacts: genericArtifacts("legal-small-claims", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// legal/expungement
// ---------------------------------------------------------------------------

function estimateWaitingPeriod(offenseType: "misdemeanor" | "felony" | "infraction"): { years: number; label: string } {
  switch (offenseType) {
    case "infraction":
      return { years: 1, label: "~1 year from completion (varies by state)" };
    case "misdemeanor":
      return { years: 3, label: "~3 years from sentence completion (varies by state)" };
    case "felony":
      return { years: 7, label: "~5-7 years from sentence completion (varies by state)" };
  }
}

function buildExpungementBundle(input: ExpungementInput): WorkflowBundle {
  const waitingPeriod = estimateWaitingPeriod(input.offenseType);

  const completionDate = input.sentenceCompletionDate ? new Date(input.sentenceCompletionDate) : null;
  const now = new Date();
  const yearsSinceCompletion = completionDate
    ? (now.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : 0;
  const waitingPeriodMet = completionDate ? yearsSinceCompletion >= waitingPeriod.years : false;

  const hasSubsequentOffenses = input.subsequentOffenses > 0;

  const evidence = [
    buildEvidenceItem("court-records", "Court records of original case", true, true),
    buildEvidenceItem("sentence-completion", "Proof of sentence completion", true, input.hasCompletedProbation),
    buildEvidenceItem("character-references", "Character references", false, false),
  ];

  const flags: ValidationFlag[] = [];
  if (input.offenseType === "felony") {
    flags.push(makeFlag("offenseType", "review", "Felony expungement has stricter requirements in most states. Some felonies are ineligible for expungement."));
  }
  if (hasSubsequentOffenses) {
    flags.push(makeFlag("subsequentOffenses", "warning", `${input.subsequentOffenses} subsequent offense(s) on record — may disqualify expungement in many jurisdictions.`));
  }
  if (!waitingPeriodMet) {
    flags.push(makeFlag("sentenceCompletionDate", "warning", `Waiting period may not be met. ~${Math.round(yearsSinceCompletion * 10) / 10} years since completion; estimated requirement: ${waitingPeriod.years} years.`));
  }

  const checks = [
    makeCheck("probation-complete", "Probation/sentence completed", input.hasCompletedProbation, "error", "Sentence and probation must be fully completed before expungement."),
    makeCheck("waiting-period", "Waiting period likely met", waitingPeriodMet, "warning", `Estimated waiting period: ${waitingPeriod.label}.`),
    makeCheck("subsequent-offenses", "No subsequent offenses", !hasSubsequentOffenses, "warning", "Subsequent offenses may disqualify expungement."),
  ];

  const eligibilityAssessment = waitingPeriodMet && input.hasCompletedProbation && !hasSubsequentOffenses
    ? "potentially eligible"
    : "eligibility uncertain — review factors above";

  return {
    workflowId: "legal/expungement",
    domain: "legal",
    title: "Criminal record expungement",
    summary: "Expungement eligibility assessment with waiting period estimate. PigeonGov does not file legal petitions.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      waitingPeriodYears: waitingPeriod.years,
      waitingPeriodLabel: waitingPeriod.label,
      yearsSinceCompletion: Math.round(yearsSinceCompletion * 10) / 10,
      waitingPeriodMet,
      hasSubsequentOffenses,
      eligibilityAssessment,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "Expungement eligibility",
      eligibilityAssessment,
      evidence,
      flags,
      [
        `Applicant: ${input.applicantName}. State: ${input.state}.`,
        `Offense type: ${input.offenseType}. Date: ${input.offenseDate}.`,
        `Sentence completed: ${input.sentenceCompletionDate}. Years since: ~${Math.round(yearsSinceCompletion * 10) / 10}.`,
        `Estimated waiting period: ${waitingPeriod.label}.`,
        `Subsequent offenses: ${input.subsequentOffenses}.`,
        `Assessment: ${eligibilityAssessment}.`,
      ],
    ),
    outputArtifacts: genericArtifacts("legal-expungement", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// legal/child-support-modification
// ---------------------------------------------------------------------------

function buildChildSupportModificationBundle(input: ChildSupportModificationInput): WorkflowBundle {
  const incomeChangeAmount = input.currentIncome - input.previousIncome;
  const incomeChangePct = input.previousIncome > 0
    ? Math.round(Math.abs(incomeChangeAmount / input.previousIncome) * 100)
    : 100;

  // Most states require ~15-20% change to modify
  const modificationThreshold = 15;
  const meetsThreshold = incomeChangePct >= modificationThreshold;

  const evidence = [
    buildEvidenceItem("current-order", "Current child support order", true, true),
    buildEvidenceItem("income-docs", "Income documentation (pay stubs, tax returns)", true, input.currentIncome > 0),
    buildEvidenceItem("changed-circumstances", "Proof of changed circumstances", true, false),
  ];

  const flags: ValidationFlag[] = [];
  if (!meetsThreshold) {
    flags.push(makeFlag("incomeChange", "warning", `Income change of ${incomeChangePct}% may not meet the typical ${modificationThreshold}% threshold for modification in most states.`));
  }
  if (input.reason === "child-needs-change") {
    flags.push(makeFlag("reason", "review", "Child needs-based modifications may require medical or educational documentation."));
  }

  const checks = [
    makeCheck("income-change-threshold", "Income change meets threshold", meetsThreshold, "warning", `Most states require at least a ${modificationThreshold}% change in income for modification.`),
    makeCheck("current-order", "Current order documented", true, "error", "The current support order must be documented."),
  ];

  return {
    workflowId: "legal/child-support-modification",
    domain: "legal",
    title: "Child support modification petition",
    summary: "Child support modification assessment with income change analysis. PigeonGov does not file legal petitions.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      incomeChangeAmount,
      incomeChangePct,
      modificationThreshold,
      meetsThreshold,
      incomeDirection: incomeChangeAmount >= 0 ? "increase" : "decrease",
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "Child support modification",
      meetsThreshold ? "change likely meets threshold" : "change may be below threshold",
      evidence,
      flags,
      [
        `Petitioner: ${input.petitionerName}. State: ${input.state}.`,
        `Current order: ${currency(input.currentOrderAmount)}/month. Children: ${input.numberOfChildren}.`,
        `Previous income: ${currency(input.previousIncome)}. Current income: ${currency(input.currentIncome)}.`,
        `Income change: ${incomeChangePct}% (${incomeChangeAmount >= 0 ? "increase" : "decrease"}). Threshold: ${modificationThreshold}%.`,
        `Reason: ${input.reason}.`,
      ],
    ),
    outputArtifacts: genericArtifacts("legal-child-support-modification", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const legalWorkflows = {
  "legal/small-claims": {
    summary: {
      id: "legal/small-claims",
      domain: "legal",
      title: "Small claims court filing",
      summary: "Prepare a small claims case with filing fee estimate, evidence checklist, and statute of limitations check.",
      status: "active",
      audience: "individual",
      tags: ["legal", "small-claims", "court", "filing", "dispute"],
    },
    inputSchema: smallClaimsInputSchema,
    starterData: {
      plaintiffName: "",
      defendantName: "",
      state: "CA",
      claimAmount: 0,
      claimType: "money-owed",
      incidentDate: "",
      hasEvidence: false,
    } satisfies SmallClaimsInput,
    sections: [
      {
        id: "claim-details",
        title: "Claim Details",
        fields: [
          { key: "claimAmount", label: "Claim amount", type: "currency" },
          {
            key: "claimType",
            label: "Claim type",
            type: "select",
            options: [
              { label: "Money owed", value: "money-owed" },
              { label: "Property damage", value: "property-damage" },
              { label: "Contract dispute", value: "contract" },
              { label: "Security deposit", value: "deposit" },
              { label: "Other", value: "other" },
            ],
          },
          { key: "incidentDate", label: "Incident date", type: "date" },
          { key: "state", label: "State", type: "text" },
        ],
      },
      {
        id: "parties",
        title: "Parties",
        fields: [
          { key: "plaintiffName", label: "Plaintiff (your name)", type: "text" },
          { key: "defendantName", label: "Defendant name", type: "text" },
        ],
      },
      {
        id: "evidence",
        title: "Evidence",
        fields: [
          { key: "hasEvidence", label: "Has supporting evidence", type: "confirm" },
        ],
      },
    ],
    buildBundle: buildSmallClaimsBundle,
  } satisfies WorkflowDefinition<SmallClaimsInput>,

  "legal/expungement": {
    summary: {
      id: "legal/expungement",
      domain: "legal",
      title: "Criminal record expungement",
      summary: "Assess expungement eligibility with waiting period estimation and documentation requirements.",
      status: "active",
      audience: "individual",
      tags: ["legal", "expungement", "criminal-record", "court"],
    },
    inputSchema: expungementInputSchema,
    starterData: {
      applicantName: "",
      state: "CA",
      offenseType: "misdemeanor",
      offenseDate: "",
      sentenceCompletionDate: "",
      hasCompletedProbation: false,
      subsequentOffenses: 0,
    } satisfies ExpungementInput,
    sections: [
      {
        id: "offense-info",
        title: "Offense Information",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "state", label: "State", type: "text" },
          {
            key: "offenseType",
            label: "Offense type",
            type: "select",
            options: [
              { label: "Infraction", value: "infraction" },
              { label: "Misdemeanor", value: "misdemeanor" },
              { label: "Felony", value: "felony" },
            ],
          },
          { key: "offenseDate", label: "Offense date", type: "date" },
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility",
        fields: [
          { key: "sentenceCompletionDate", label: "Sentence completion date", type: "date" },
          { key: "hasCompletedProbation", label: "Has completed probation", type: "confirm" },
          { key: "subsequentOffenses", label: "Number of subsequent offenses", type: "number" },
        ],
      },
      {
        id: "documentation",
        title: "Documentation",
        description: "Gather court records and proof of sentence completion.",
        fields: [],
      },
    ],
    buildBundle: buildExpungementBundle,
  } satisfies WorkflowDefinition<ExpungementInput>,

  "legal/child-support-modification": {
    summary: {
      id: "legal/child-support-modification",
      domain: "legal",
      title: "Child support modification petition",
      summary: "Assess whether changed circumstances meet the modification threshold for child support orders.",
      status: "active",
      audience: "individual",
      tags: ["legal", "child-support", "modification", "family-law"],
    },
    inputSchema: childSupportModificationInputSchema,
    starterData: {
      petitionerName: "",
      currentOrderAmount: 0,
      currentIncome: 0,
      previousIncome: 0,
      reason: "income-change",
      state: "CA",
      numberOfChildren: 1,
    } satisfies ChildSupportModificationInput,
    sections: [
      {
        id: "current-order",
        title: "Current Order",
        fields: [
          { key: "petitionerName", label: "Petitioner name", type: "text" },
          { key: "currentOrderAmount", label: "Current monthly support amount", type: "currency" },
          { key: "numberOfChildren", label: "Number of children", type: "number" },
          { key: "state", label: "State", type: "text" },
        ],
      },
      {
        id: "changed-circumstances",
        title: "Changed Circumstances",
        fields: [
          { key: "previousIncome", label: "Previous income (at time of order)", type: "currency" },
          { key: "currentIncome", label: "Current income", type: "currency" },
          {
            key: "reason",
            label: "Reason for modification",
            type: "select",
            options: [
              { label: "Income change", value: "income-change" },
              { label: "Custody change", value: "custody-change" },
              { label: "Child needs change", value: "child-needs-change" },
            ],
          },
        ],
      },
      {
        id: "documentation",
        title: "Documentation",
        description: "Gather the current order, income records, and proof of changed circumstances.",
        fields: [],
      },
    ],
    buildBundle: buildChildSupportModificationBundle,
  } satisfies WorkflowDefinition<ChildSupportModificationInput>,
} as const;
