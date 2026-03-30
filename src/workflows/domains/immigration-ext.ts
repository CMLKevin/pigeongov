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
  naturalizationInputSchema,
  greenCardRenewalInputSchema,
  dacaRenewalInputSchema,
  workAuthorizationInputSchema,
} from "../schemas/immigration-ext.js";
import type {
  NaturalizationInput,
  GreenCardRenewalInput,
  DacaRenewalInput,
  WorkAuthorizationInput,
} from "../schemas/immigration-ext.js";

// ---------------------------------------------------------------------------
// Physical presence helpers for naturalization
// ---------------------------------------------------------------------------

interface TripAnalysis {
  totalTripDays: number;
  longestTripDays: number;
  breaksContinuousResidence: boolean;
  resetsClock: boolean;
  tripWarnings: string[];
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function analyzeTrips(trips: Array<{ departure: string; return: string; destination: string }>): TripAnalysis {
  let totalTripDays = 0;
  let longestTripDays = 0;
  let breaksContinuousResidence = false;
  let resetsClock = false;
  const tripWarnings: string[] = [];

  for (const trip of trips) {
    const days = daysBetween(trip.departure, trip.return);
    totalTripDays += days;
    if (days > longestTripDays) {
      longestTripDays = days;
    }

    if (days > 365) {
      resetsClock = true;
      tripWarnings.push(
        `Trip to ${trip.destination} (${days} days) exceeds 1 year -- this resets the statutory period clock.`,
      );
    } else if (days > 180) {
      breaksContinuousResidence = true;
      tripWarnings.push(
        `Trip to ${trip.destination} (${days} days) exceeds 6 months -- may break continuous residence.`,
      );
    }
  }

  return { totalTripDays, longestTripDays, breaksContinuousResidence, resetsClock, tripWarnings };
}

// ---------------------------------------------------------------------------
// Processing time estimates (placeholders)
// ---------------------------------------------------------------------------

const PROCESSING_ESTIMATES: Record<WorkAuthorizationInput["category"], string> = {
  marriage: "5-8 months",
  asylum: "3-5 months",
  "student-opt": "3-5 months",
  "student-cpt": "1-3 months",
  "ead-renewal": "5-8 months",
};

const CATEGORY_EVIDENCE_LABELS: Record<WorkAuthorizationInput["category"], string> = {
  marriage: "I-485 receipt notice",
  asylum: "Asylum approval or pending notice",
  "student-opt": "I-20 with OPT recommendation",
  "student-cpt": "I-20 with CPT authorization",
  "ead-renewal": "Current/expired EAD card",
};

// ---------------------------------------------------------------------------
// Exported workflow definitions
// ---------------------------------------------------------------------------

export const immigrationExtWorkflows = {
  // =========================================================================
  // NATURALIZATION (N-400)
  // =========================================================================
  "immigration/naturalization": {
    summary: {
      id: "immigration/naturalization",
      domain: "immigration",
      title: "Naturalization eligibility review",
      summary:
        "Assess N-400 eligibility including physical presence, continuous residence, and civics/English readiness.",
      status: "active",
      audience: "individual",
      tags: ["uscis", "naturalization", "n-400", "citizenship", "civics"],
    },
    inputSchema: naturalizationInputSchema,
    starterData: {
      applicantName: "",
      dob: "",
      greenCardDate: "",
      residencePeriod: 0,
      physicalPresenceDays: 0,
      tripsAbroad: [],
      employmentHistory: [],
      hasGoodMoralCharacter: true,
      englishProficiency: "fluent",
      civicsReady: false,
      maritalStatus: "",
    } satisfies NaturalizationInput,
    sections: [
      {
        id: "eligibility",
        title: "Eligibility",
        description: "Core eligibility factors for N-400.",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "dob", label: "Date of birth", type: "date" },
          { key: "greenCardDate", label: "Green card issue date", type: "date" },
          { key: "maritalStatus", label: "Marital status", type: "text" },
        ],
      },
      {
        id: "residence",
        title: "Residence",
        description: "Continuous residence and statutory period.",
        fields: [
          { key: "residencePeriod", label: "Months of residence", type: "number" },
        ],
      },
      {
        id: "physical-presence",
        title: "Physical Presence",
        description: "Physical presence in the US and trips abroad.",
        fields: [
          { key: "physicalPresenceDays", label: "Days physically present", type: "number" },
        ],
      },
      {
        id: "background",
        title: "Background",
        description: "Moral character and background check.",
        fields: [
          { key: "hasGoodMoralCharacter", label: "Good moral character", type: "confirm" },
        ],
      },
      {
        id: "english-civics",
        title: "English & Civics",
        description: "English proficiency and civics test readiness.",
        fields: [
          {
            key: "englishProficiency",
            label: "English proficiency",
            type: "select",
            options: [
              { label: "Fluent", value: "fluent" },
              { label: "Basic", value: "basic" },
              { label: "Exempt", value: "exempt" },
            ],
          },
          { key: "civicsReady", label: "Civics test ready", type: "confirm" },
        ],
      },
    ],
    buildBundle(input: NaturalizationInput): WorkflowBundle {
      const tripAnalysis = analyzeTrips(input.tripsAbroad);

      // Physical presence calculation:
      // 5-year track: must be present 30 of last 60 months
      // 3-year marriage track: must be present 18 of 36 months
      const isMarriageTrack = input.maritalStatus.toLowerCase().includes("married");
      const requiredMonths = isMarriageTrack ? 18 : 30;
      const totalMonths = isMarriageTrack ? 36 : 60;
      const totalDaysInPeriod = totalMonths * 30; // approximate
      const daysPresent = totalDaysInPeriod - tripAnalysis.totalTripDays;
      const monthsPresent = Math.floor(daysPresent / 30);

      const evidence = [
        buildEvidenceItem("green-card", "Permanent resident card (green card)", true, true),
        buildEvidenceItem("passport", "Current passport", true, true),
        buildEvidenceItem(
          "tax-returns",
          "Federal tax returns (last 5 years)",
          true,
          input.employmentHistory.length > 0,
        ),
        buildEvidenceItem(
          "travel-records",
          "Travel records and trip documentation",
          input.tripsAbroad.length > 0,
          input.tripsAbroad.length > 0,
        ),
        buildEvidenceItem(
          "employment-records",
          "Employment history records",
          true,
          input.employmentHistory.length > 0,
        ),
      ];

      const flags: ValidationFlag[] = [];

      if (tripAnalysis.resetsClock) {
        for (const warning of tripAnalysis.tripWarnings.filter((w) => w.includes("resets"))) {
          flags.push(makeFlag("tripsAbroad", "error", warning));
        }
      }
      if (tripAnalysis.breaksContinuousResidence) {
        for (const warning of tripAnalysis.tripWarnings.filter((w) => w.includes("break"))) {
          flags.push(makeFlag("tripsAbroad", "warning", warning));
        }
      }
      if (!input.hasGoodMoralCharacter) {
        flags.push(
          makeFlag(
            "hasGoodMoralCharacter",
            "review",
            "Applicant indicated potential moral character concerns -- attorney review strongly recommended.",
          ),
        );
      }

      const checks = [
        makeCheck(
          "applicant-name",
          "Applicant identified",
          input.applicantName.trim().length > 0,
          "error",
          "Provide the applicant legal name.",
        ),
        makeCheck(
          "physical-presence",
          "Physical presence sufficient",
          monthsPresent >= requiredMonths,
          "error",
          `Must be physically present at least ${requiredMonths} of ${totalMonths} months. Current: ~${monthsPresent} months.`,
        ),
        makeCheck(
          "continuous-residence",
          "Continuous residence maintained",
          !tripAnalysis.breaksContinuousResidence && !tripAnalysis.resetsClock,
          "warning",
          "A trip exceeding 6 months may disrupt continuous residence.",
        ),
        makeCheck(
          "civics-ready",
          "Civics test readiness",
          input.civicsReady,
          "warning",
          "Prepare for the civics and English test before the interview.",
        ),
      ];

      const continuousStatus = tripAnalysis.resetsClock
        ? "reset (trip > 1 year)"
        : tripAnalysis.breaksContinuousResidence
          ? "potentially broken (trip > 6 months)"
          : "maintained";

      const readiness =
        monthsPresent >= requiredMonths && !tripAnalysis.resetsClock && input.civicsReady
          ? "appears eligible"
          : "needs further review";

      return {
        workflowId: "immigration/naturalization",
        domain: "immigration",
        title: "Naturalization eligibility review",
        summary:
          "N-400 readiness assessment. PigeonGov does not submit applications to USCIS.",
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          track: isMarriageTrack ? "3-year marriage" : "5-year standard",
          physicalPresenceMonths: monthsPresent,
          requiredPresenceMonths: requiredMonths,
          totalTripDays: tripAnalysis.totalTripDays,
          longestTripDays: tripAnalysis.longestTripDays,
          continuousResidence: continuousStatus,
          fee: 760,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Naturalization readiness",
          readiness,
          evidence,
          flags,
          [
            `Naturalization readiness: ${readiness}. Physical presence: ~${monthsPresent}/${requiredMonths} months. Continuous residence: ${continuousStatus}.`,
            `Track: ${isMarriageTrack ? "3-year marriage" : "5-year standard"}.`,
            `Filing fee: ${currency(760)}.`,
          ],
        ),
        outputArtifacts: genericArtifacts("immigration-naturalization", evidence),
        provenance: ["workflow-registry", "naturalization-eligibility-model"],
      };
    },
  } satisfies WorkflowDefinition<NaturalizationInput>,

  // =========================================================================
  // GREEN CARD RENEWAL (I-90 / I-751)
  // =========================================================================
  "immigration/green-card-renewal": {
    summary: {
      id: "immigration/green-card-renewal",
      domain: "immigration",
      title: "Green card renewal",
      summary:
        "Route to I-90 (10-year renewal) or I-751 (conditional removal) with fee calculation and evidence planning.",
      status: "active",
      audience: "individual",
      tags: ["uscis", "green-card", "i-90", "i-751", "renewal"],
    },
    inputSchema: greenCardRenewalInputSchema,
    starterData: {
      applicantName: "",
      cardExpirationDate: "",
      cardType: "10year",
      reason: "expiring",
      isConditional: false,
      hasJointFiling: false,
    } satisfies GreenCardRenewalInput,
    sections: [
      {
        id: "card-info",
        title: "Card Information",
        description: "Details about the current green card.",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "cardExpirationDate", label: "Card expiration date", type: "date" },
          {
            key: "cardType",
            label: "Card type",
            type: "select",
            options: [
              { label: "10-year permanent", value: "10year" },
              { label: "2-year conditional", value: "2year-conditional" },
            ],
          },
        ],
      },
      {
        id: "renewal-type",
        title: "Renewal Type",
        description: "Reason for renewal and filing details.",
        fields: [
          {
            key: "reason",
            label: "Reason for renewal",
            type: "select",
            options: [
              { label: "Expiring", value: "expiring" },
              { label: "Lost", value: "lost" },
              { label: "Damaged", value: "damaged" },
              { label: "Name change", value: "name-change" },
            ],
          },
          { key: "isConditional", label: "Conditional resident", type: "confirm" },
          { key: "hasJointFiling", label: "Joint filing with spouse", type: "confirm" },
        ],
      },
    ],
    buildBundle(input: GreenCardRenewalInput): WorkflowBundle {
      const isConditional = input.cardType === "2year-conditional" || input.isConditional;
      const formRoute = isConditional ? "I-751" : "I-90";
      const fee = isConditional ? 595 : 540;

      const evidence = [
        buildEvidenceItem("current-card-front", "Current green card (front)", true, true),
        buildEvidenceItem("current-card-back", "Current green card (back)", true, true),
        buildEvidenceItem("passport-photos", "Passport-style photos", true, true),
      ];

      if (isConditional) {
        evidence.push(
          buildEvidenceItem(
            "bona-fide-marriage",
            "Evidence of bona fide marriage (joint accounts, leases, children, etc.)",
            true,
            false,
            "Conditional residents must demonstrate the marriage is genuine.",
          ),
        );
      }

      const flags: ValidationFlag[] = [];

      // Check if card has been expired > 6 months
      if (isConditional && input.cardExpirationDate) {
        const expDate = new Date(input.cardExpirationDate);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (expDate < sixMonthsAgo) {
          flags.push(
            makeFlag(
              "cardExpirationDate",
              "warning",
              "Conditional card expired more than 6 months ago -- late filing may complicate the case.",
            ),
          );
        }
      }

      if (isConditional && !input.hasJointFiling) {
        flags.push(
          makeFlag(
            "hasJointFiling",
            "review",
            "I-751 without joint filing requires a waiver -- attorney review recommended.",
          ),
        );
      }

      const checks = [
        makeCheck(
          "applicant-name",
          "Applicant identified",
          input.applicantName.trim().length > 0,
          "error",
          "Provide the applicant name.",
        ),
        makeCheck(
          "expiration-date",
          "Expiration date provided",
          input.cardExpirationDate.trim().length > 0,
          "error",
          "Provide the card expiration date.",
        ),
      ];

      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "immigration/green-card-renewal",
        domain: "immigration",
        title: "Green card renewal",
        summary: `${formRoute} filing organizer. PigeonGov does not submit forms to USCIS.`,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          formRoute,
          fee,
          isConditional,
          needsWaiver: isConditional && !input.hasJointFiling,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Green card renewal",
          missingEvidence === 0 ? "ready for review" : "needs more evidence",
          evidence,
          flags,
          [
            `Form: ${formRoute}. Filing fee: ${currency(fee)}.`,
            `Card type: ${input.cardType}. Reason: ${input.reason}.`,
            isConditional && !input.hasJointFiling
              ? "Waiver required: filing without joint petitioner."
              : "",
          ].filter(Boolean),
        ),
        outputArtifacts: genericArtifacts("immigration-green-card-renewal", evidence),
        provenance: ["workflow-registry", "green-card-renewal-model"],
      };
    },
  } satisfies WorkflowDefinition<GreenCardRenewalInput>,

  // =========================================================================
  // DACA RENEWAL
  // =========================================================================
  "immigration/daca-renewal": {
    summary: {
      id: "immigration/daca-renewal",
      domain: "immigration",
      title: "DACA renewal",
      summary:
        "Assess DACA renewal timing window, continuous presence, and background eligibility.",
      status: "active",
      audience: "individual",
      tags: ["uscis", "daca", "renewal", "ead", "deferred-action"],
    },
    inputSchema: dacaRenewalInputSchema,
    starterData: {
      applicantName: "",
      dob: "",
      lastApprovalDate: "",
      expirationDate: "",
      hasContinuousPresence: true,
      hasConvictions: false,
      advanceParoleHistory: false,
    } satisfies DacaRenewalInput,
    sections: [
      {
        id: "current-status",
        title: "Current Status",
        description: "Current DACA approval details.",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "dob", label: "Date of birth", type: "date" },
          { key: "lastApprovalDate", label: "Last approval date", type: "date" },
          { key: "expirationDate", label: "Expiration date", type: "date" },
        ],
      },
      {
        id: "eligibility-maintenance",
        title: "Eligibility Maintenance",
        description: "Continuous presence and eligibility factors.",
        fields: [
          { key: "hasContinuousPresence", label: "Continuous presence maintained", type: "confirm" },
        ],
      },
      {
        id: "background",
        title: "Background",
        description: "Criminal history and travel records.",
        fields: [
          { key: "hasConvictions", label: "Any convictions", type: "confirm" },
          { key: "advanceParoleHistory", label: "Advance parole travel history", type: "confirm" },
        ],
      },
    ],
    buildBundle(input: DacaRenewalInput): WorkflowBundle {
      // Renewal window: submit 120-150 days before expiration
      let daysUntilExpiration: number | undefined;
      let renewalWindowStatus = "unknown";

      if (input.expirationDate) {
        const exp = new Date(input.expirationDate);
        const now = new Date();
        daysUntilExpiration = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration < 0) {
          renewalWindowStatus = "expired";
        } else if (daysUntilExpiration > 150) {
          renewalWindowStatus = "too early (risk of rejection)";
        } else if (daysUntilExpiration >= 120 && daysUntilExpiration <= 150) {
          renewalWindowStatus = "optimal window";
        } else if (daysUntilExpiration < 120) {
          renewalWindowStatus = "late (submit immediately)";
        }
      }

      const evidence = [
        buildEvidenceItem("previous-ead", "Previous EAD card", true, true),
        buildEvidenceItem(
          "continuous-presence",
          "Proof of continuous presence (utility bills, school records, etc.)",
          true,
          input.hasContinuousPresence,
        ),
        buildEvidenceItem(
          "school-work-records",
          "School enrollment or employment records",
          true,
          false,
          "Gather recent school transcripts or pay stubs.",
        ),
      ];

      const flags: ValidationFlag[] = [];

      if (daysUntilExpiration !== undefined && daysUntilExpiration > 150) {
        flags.push(
          makeFlag(
            "expirationDate",
            "warning",
            `Submitting ${daysUntilExpiration} days before expiration -- USCIS may reject renewals filed more than 150 days early.`,
          ),
        );
      }

      if (input.hasConvictions) {
        flags.push(
          makeFlag(
            "hasConvictions",
            "review",
            "Any criminal conviction must be reviewed by an attorney before filing a DACA renewal.",
          ),
        );
      }

      if (input.advanceParoleHistory) {
        flags.push(
          makeFlag(
            "advanceParoleHistory",
            "review",
            "Advance parole travel history may affect re-entry eligibility -- attorney review recommended.",
          ),
        );
      }

      const checks = [
        makeCheck(
          "applicant-name",
          "Applicant identified",
          input.applicantName.trim().length > 0,
          "error",
          "Provide the applicant name.",
        ),
        makeCheck(
          "continuous-presence",
          "Continuous presence maintained",
          input.hasContinuousPresence,
          "error",
          "Continuous presence is required for DACA renewal.",
        ),
        makeCheck(
          "no-convictions",
          "No disqualifying convictions",
          !input.hasConvictions,
          "warning",
          "Convictions require careful legal review before filing.",
        ),
      ];

      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "immigration/daca-renewal",
        domain: "immigration",
        title: "DACA renewal",
        summary:
          "DACA renewal readiness assessment. PigeonGov does not submit applications to USCIS.",
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          fee: 495,
          daysUntilExpiration,
          renewalWindowStatus,
          gapRisk: daysUntilExpiration !== undefined && daysUntilExpiration < 0,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "DACA renewal readiness",
          renewalWindowStatus === "optimal window" && !input.hasConvictions
            ? "ready for filing"
            : "needs review",
          evidence,
          flags,
          [
            `Renewal window: ${renewalWindowStatus}.`,
            daysUntilExpiration !== undefined
              ? `Days until expiration: ${daysUntilExpiration}.`
              : "Expiration date not provided.",
            `Filing fee: ${currency(495)} (biometrics included).`,
          ],
        ),
        outputArtifacts: genericArtifacts("immigration-daca-renewal", evidence),
        provenance: ["workflow-registry", "daca-renewal-model"],
      };
    },
  } satisfies WorkflowDefinition<DacaRenewalInput>,

  // =========================================================================
  // WORK AUTHORIZATION (EAD)
  // =========================================================================
  "immigration/work-authorization": {
    summary: {
      id: "immigration/work-authorization",
      domain: "immigration",
      title: "Work authorization (EAD)",
      summary:
        "Plan EAD application by category with evidence requirements, processing time estimates, and gap coverage strategy.",
      status: "active",
      audience: "individual",
      tags: ["uscis", "ead", "work-permit", "employment-authorization"],
    },
    inputSchema: workAuthorizationInputSchema,
    starterData: {
      applicantName: "",
      category: "marriage",
    } satisfies WorkAuthorizationInput,
    sections: [
      {
        id: "category",
        title: "Category",
        description: "EAD application category.",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          {
            key: "category",
            label: "Authorization category",
            type: "select",
            options: [
              { label: "Marriage-based", value: "marriage" },
              { label: "Asylum", value: "asylum" },
              { label: "Student OPT", value: "student-opt" },
              { label: "Student CPT", value: "student-cpt" },
              { label: "EAD renewal", value: "ead-renewal" },
            ],
          },
        ],
      },
      {
        id: "current-status",
        title: "Current Status",
        description: "Current EAD details if applicable.",
        fields: [
          { key: "currentEadExpiration", label: "Current EAD expiration", type: "date" },
          { key: "gapDays", label: "Gap days in authorization", type: "number" },
        ],
      },
      {
        id: "timeline",
        title: "Timeline",
        description: "Processing expectations and strategy.",
        fields: [],
      },
    ],
    buildBundle(input: WorkAuthorizationInput): WorkflowBundle {
      const processingEstimate = PROCESSING_ESTIMATES[input.category];
      const categoryEvidenceLabel = CATEGORY_EVIDENCE_LABELS[input.category];

      const evidence = [
        buildEvidenceItem(
          "category-evidence",
          categoryEvidenceLabel,
          true,
          false,
          `Required for ${input.category} category EAD.`,
        ),
      ];

      // Add category-specific evidence
      if (input.category === "marriage") {
        evidence.push(
          buildEvidenceItem("i-485-receipt", "I-485 receipt notice", true, false),
        );
      } else if (input.category === "asylum") {
        evidence.push(
          buildEvidenceItem("asylum-notice", "Asylum approval or pending notice", true, false),
        );
      } else if (input.category === "student-opt" || input.category === "student-cpt") {
        evidence.push(
          buildEvidenceItem("i-20", "I-20 with school endorsement", true, false),
        );
      }

      const flags: ValidationFlag[] = [];
      const gapDays = input.gapDays ?? 0;

      if (gapDays > 0) {
        flags.push(
          makeFlag(
            "gapDays",
            "warning",
            `${gapDays} days of gap in work authorization -- unauthorized employment during a gap creates serious immigration consequences.`,
          ),
        );
      }

      if (input.currentEadExpiration) {
        const expDate = new Date(input.currentEadExpiration);
        const now = new Date();
        if (expDate < now) {
          flags.push(
            makeFlag(
              "currentEadExpiration",
              "error",
              "Current EAD has expired. Check whether an automatic extension applies under 8 CFR 274a.13(d).",
            ),
          );
        }
      }

      const checks = [
        makeCheck(
          "applicant-name",
          "Applicant identified",
          input.applicantName.trim().length > 0,
          "error",
          "Provide the applicant name.",
        ),
        makeCheck(
          "category-evidence",
          "Category evidence identified",
          true,
          "warning",
          `Gather ${categoryEvidenceLabel} before filing.`,
        ),
      ];

      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      // Gap coverage strategy
      let gapStrategy = "No gap concerns.";
      if (gapDays > 0) {
        gapStrategy = "File as early as possible. Check automatic extension eligibility for timely-filed renewals.";
      } else if (input.currentEadExpiration) {
        const expDate = new Date(input.currentEadExpiration);
        const now = new Date();
        const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 90) {
          gapStrategy = `${daysLeft} days remaining on current EAD. File immediately to minimize gap risk.`;
        }
      }

      return {
        workflowId: "immigration/work-authorization",
        domain: "immigration",
        title: "Work authorization (EAD)",
        summary:
          "EAD filing planner by category. PigeonGov does not submit forms to USCIS.",
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          category: input.category,
          processingEstimate,
          gapDays,
          gapStrategy,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Work authorization readiness",
          missingEvidence === 0 ? "ready for filing" : "needs evidence",
          evidence,
          flags,
          [
            `Category: ${input.category}. Estimated processing: ${processingEstimate}.`,
            gapStrategy,
          ],
        ),
        outputArtifacts: genericArtifacts("immigration-work-authorization", evidence),
        provenance: ["workflow-registry", "work-authorization-model"],
      };
    },
  } satisfies WorkflowDefinition<WorkAuthorizationInput>,
} as const;
