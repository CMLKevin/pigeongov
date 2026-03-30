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
  giBillInputSchema,
  vaDisabilityInputSchema,
  vaHealthcareInputSchema,
} from "../schemas/veterans.js";
import type {
  GiBillInput,
  VaDisabilityInput,
  VaHealthcareInput,
} from "../schemas/veterans.js";

// ---------------------------------------------------------------------------
// VA combined rating math
// ---------------------------------------------------------------------------

function vaCombinedRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  // Sort descending for standard VA combined rating calculation
  const sorted = [...ratings].sort((a, b) => b - a);
  let remaining = 100;
  for (const r of sorted) {
    remaining = remaining * (1 - r / 100);
  }
  const combined = 100 - remaining;
  // Round to nearest 10%
  return Math.round(combined / 10) * 10;
}

function severityToRating(severity: "mild" | "moderate" | "severe"): number {
  switch (severity) {
    case "mild":
      return 10;
    case "moderate":
      return 30;
    case "severe":
      return 50;
  }
}

// ---------------------------------------------------------------------------
// veterans/disability-claim
// ---------------------------------------------------------------------------

function buildDisabilityClaimBundle(input: VaDisabilityInput): WorkflowBundle {
  const individualRatings = input.conditions
    .filter((c) => c.serviceConnected)
    .map((c) => severityToRating(c.currentSeverity));
  const estimatedCombinedRating = vaCombinedRating(individualRatings);
  const isDishonorable = input.dischargeType.toLowerCase().includes("dishonorable");

  const evidence = [
    buildEvidenceItem("dd214", "DD-214 (Certificate of Release or Discharge)", true, true),
    buildEvidenceItem("service-medical", "Service medical records", true, input.hasMedicalRecords),
    buildEvidenceItem("va-medical", "VA medical records", true, input.hasMedicalRecords),
    buildEvidenceItem("buddy-statements", "Buddy statements / lay evidence", false, input.hasBuddyStatements),
    buildEvidenceItem("nexus-letters", "Nexus letters (medical opinion linking condition to service)", true, false,
      "Nexus letters from physicians are strongly recommended for service connection claims."),
  ];

  const flags: ValidationFlag[] = [];
  if (isDishonorable) {
    flags.push(makeFlag("dischargeType", "error", "Dishonorable discharge generally bars eligibility for VA disability compensation."));
  }
  if (!input.hasMedicalRecords) {
    flags.push(makeFlag("hasMedicalRecords", "warning", "Missing medical records — obtain service treatment records and current medical evidence."));
  }
  // Nexus letter is almost always missing since we default provided=false
  flags.push(makeFlag("nexusLetters", "warning", "Nexus letters linking conditions to service are critical for claim success."));

  const checks = [
    makeCheck("discharge-type", "Eligible discharge type", !isDishonorable, "error", "Dishonorable discharge bars VA benefits eligibility."),
    makeCheck("medical-records", "Medical records available", input.hasMedicalRecords, "warning", "Medical records are essential for disability evaluation."),
    makeCheck("conditions-documented", "Conditions documented", input.conditions.length > 0, "error", "At least one condition must be claimed."),
  ];

  const serviceConnectedCount = input.conditions.filter((c) => c.serviceConnected).length;

  return {
    workflowId: "veterans/disability-claim",
    domain: "veterans",
    title: "VA disability compensation claim",
    summary: "VA disability claim intake with combined rating estimation. PigeonGov does not file VA claims.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      individualRatings,
      estimatedCombinedRating,
      serviceConnectedCount,
      totalConditions: input.conditions.length,
      isDishonorable,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "VA disability claim",
      isDishonorable ? "ineligible — dishonorable discharge" : `${serviceConnectedCount} service-connected condition(s)`,
      evidence,
      flags,
      [
        `Veteran: ${input.veteranName}. Service: ${input.serviceStartDate} to ${input.serviceEndDate}.`,
        `Discharge type: ${input.dischargeType}.`,
        `Disability claim for ${input.conditions.length} condition(s). ${serviceConnectedCount} service-connected.`,
        `Estimated combined rating: ${estimatedCombinedRating}%.`,
        `Individual ratings: ${individualRatings.map((r) => `${r}%`).join(", ") || "none (no service-connected conditions)"}.`,
      ],
    ),
    outputArtifacts: genericArtifacts("veterans-disability-claim", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// veterans/gi-bill
// ---------------------------------------------------------------------------

function buildGiBillBundle(input: GiBillInput): WorkflowBundle {
  const MAX_ENTITLEMENT_MONTHS = 36;
  const monthsRemaining = Math.max(0, MAX_ENTITLEMENT_MONTHS - input.monthsUsed);

  // Placeholder average MHA — varies by ZIP in reality
  const estimatedMha = 1_800;
  const bookStipendAnnual = 1_000;
  const bookStipendMonthly = Math.round(bookStipendAnnual / 12);

  const evidence = [
    buildEvidenceItem("dd214", "DD-214 (Certificate of Release or Discharge)", true, true),
    buildEvidenceItem("school-acceptance", "School acceptance letter", true, false),
  ];

  const flags: ValidationFlag[] = [];
  if (monthsRemaining <= 3) {
    flags.push(makeFlag("monthsUsed", "warning", `Only ${monthsRemaining} month(s) of GI Bill entitlement remaining.`));
  }
  if (input.serviceType !== "active" && input.totalServiceMonths < 36) {
    flags.push(makeFlag("serviceType", "review", "Reserve/Guard members may receive partial benefits based on aggregate active duty time."));
  }

  const checks = [
    makeCheck("entitlement-remaining", "Entitlement months remaining", monthsRemaining > 0, "error", "No GI Bill entitlement months remaining."),
    makeCheck("service-duration", "Minimum service requirement", input.totalServiceMonths >= 6, "warning", "At least 6 months of qualifying service is typically required."),
  ];

  return {
    workflowId: "veterans/gi-bill",
    domain: "veterans",
    title: "Post-9/11 GI Bill benefits",
    summary: "GI Bill benefit estimation including housing allowance and remaining entitlement. PigeonGov does not file VA education claims.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      maxEntitlementMonths: MAX_ENTITLEMENT_MONTHS,
      monthsRemaining,
      estimatedMonthlyHousingAllowance: estimatedMha,
      bookStipendAnnual,
      bookStipendMonthly,
      programType: input.programType,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "GI Bill benefits",
      `${monthsRemaining} months remaining`,
      evidence,
      flags,
      [
        `Veteran: ${input.veteranName}. Service type: ${input.serviceType}.`,
        `Total service: ${input.totalServiceMonths} months. Post-service: ${input.postServiceMonths} months.`,
        `School: ${input.schoolName}. Program: ${input.programType}. ZIP: ${input.zipCode}.`,
        `GI Bill benefits: ${monthsRemaining} months remaining. Estimated monthly housing: ${currency(estimatedMha)}.`,
        `Book stipend: ${currency(bookStipendAnnual)}/year.`,
      ],
    ),
    outputArtifacts: genericArtifacts("veterans-gi-bill", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// veterans/va-healthcare
// ---------------------------------------------------------------------------

function determinePriorityGroup(input: VaHealthcareInput): { group: number; label: string } {
  if (input.hasServiceConnectedDisability && input.disabilityRating >= 50) {
    return { group: 1, label: "50%+ service-connected disability" };
  }
  if (input.hasServiceConnectedDisability && input.disabilityRating >= 30) {
    return { group: 2, label: "30-40% service-connected disability" };
  }
  if (input.hasServiceConnectedDisability && input.disabilityRating >= 10) {
    return { group: 3, label: "10-20% service-connected disability" };
  }
  if (input.hasCombatService) {
    return { group: 4, label: "Combat veteran (enhanced enrollment for 10 years post-combat)" };
  }
  if (input.receivingVaPension || input.annualIncome < 35_000) {
    return { group: 5, label: "Low income or receiving VA pension" };
  }
  if (input.annualIncome < 50_000) {
    return { group: 6, label: "Below geographic means test threshold" };
  }
  if (input.annualIncome < 80_000) {
    return { group: 7, label: "Above means test, agrees to copay" };
  }
  return { group: 8, label: "Above means test, no service-connected disability" };
}

function estimateCopay(group: number): number {
  if (group <= 3) return 0;
  if (group <= 5) return 15;
  return 50;
}

function buildVaHealthcareBundle(input: VaHealthcareInput): WorkflowBundle {
  const priority = determinePriorityGroup(input);
  const copayPerVisit = estimateCopay(priority.group);

  const evidence = [
    buildEvidenceItem("dd214", "DD-214 (Certificate of Release or Discharge)", true, true),
    buildEvidenceItem("income-verification", "Income verification", true, input.annualIncome > 0),
    buildEvidenceItem("disability-rating", "Disability rating documentation", input.hasServiceConnectedDisability, input.hasServiceConnectedDisability),
  ];

  const flags: ValidationFlag[] = [];
  if (priority.group >= 7) {
    flags.push(makeFlag("priorityGroup", "review", `Priority Group ${priority.group} — enrollment may be subject to available resources and copay requirements.`));
  }

  const checks = [
    makeCheck("income-documented", "Income documented", input.annualIncome > 0, "warning", "Income documentation helps determine priority group and copay obligations."),
  ];

  return {
    workflowId: "veterans/va-healthcare",
    domain: "veterans",
    title: "VA healthcare enrollment",
    summary: "VA healthcare priority group determination and copay estimation. PigeonGov does not enroll veterans in VA healthcare.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      priorityGroup: priority.group,
      priorityGroupLabel: priority.label,
      copayPerVisit,
      hasServiceConnectedDisability: input.hasServiceConnectedDisability,
      disabilityRating: input.disabilityRating,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "VA Healthcare enrollment",
      `Priority Group ${priority.group}`,
      evidence,
      flags,
      [
        `Veteran: ${input.veteranName}. Disability rating: ${input.disabilityRating}%.`,
        `VA Healthcare: Priority Group ${priority.group}. ${priority.label}.`,
        `VA Healthcare: Priority Group ${priority.group}. Copay: ${currency(copayPerVisit)} per visit.`,
      ],
    ),
    outputArtifacts: genericArtifacts("veterans-va-healthcare", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const veteransWorkflows = {
  "veterans/disability-claim": {
    summary: {
      id: "veterans/disability-claim",
      domain: "veterans",
      title: "VA disability compensation claim",
      summary: "Build a VA disability claim with combined rating estimation using VA math and evidence checklist.",
      status: "active",
      audience: "individual",
      tags: ["va", "disability", "veterans", "compensation", "rating"],
    },
    inputSchema: vaDisabilityInputSchema,
    starterData: {
      veteranName: "",
      serviceStartDate: "",
      serviceEndDate: "",
      dischargeType: "honorable",
      conditions: [],
      hasBuddyStatements: false,
      hasMedicalRecords: false,
    } satisfies VaDisabilityInput,
    sections: [
      {
        id: "service-info",
        title: "Service Information",
        fields: [
          { key: "veteranName", label: "Veteran name", type: "text" },
          { key: "serviceStartDate", label: "Service start date", type: "date" },
          { key: "serviceEndDate", label: "Service end date", type: "date" },
          { key: "dischargeType", label: "Discharge type", type: "text" },
        ],
      },
      {
        id: "conditions",
        title: "Conditions",
        description: "List all conditions being claimed for service connection.",
        fields: [
          { key: "hasMedicalRecords", label: "Medical records available", type: "confirm" },
          { key: "hasBuddyStatements", label: "Buddy statements available", type: "confirm" },
        ],
      },
      {
        id: "evidence",
        title: "Evidence",
        fields: [],
      },
    ],
    buildBundle: buildDisabilityClaimBundle,
  } satisfies WorkflowDefinition<VaDisabilityInput>,

  "veterans/gi-bill": {
    summary: {
      id: "veterans/gi-bill",
      domain: "veterans",
      title: "Post-9/11 GI Bill benefits",
      summary: "Estimate GI Bill entitlement, monthly housing allowance, and remaining benefits months.",
      status: "active",
      audience: "individual",
      tags: ["va", "gi-bill", "education", "veterans", "housing-allowance"],
    },
    inputSchema: giBillInputSchema,
    starterData: {
      veteranName: "",
      serviceType: "active",
      totalServiceMonths: 0,
      postServiceMonths: 0,
      schoolName: "",
      programType: "undergraduate",
      zipCode: "",
      monthsUsed: 0,
    } satisfies GiBillInput,
    sections: [
      {
        id: "service-info",
        title: "Service Information",
        fields: [
          { key: "veteranName", label: "Veteran name", type: "text" },
          {
            key: "serviceType",
            label: "Service type",
            type: "select",
            options: [
              { label: "Active duty", value: "active" },
              { label: "Reserve", value: "reserve" },
              { label: "National Guard", value: "guard" },
            ],
          },
          { key: "totalServiceMonths", label: "Total months of service", type: "number" },
          { key: "postServiceMonths", label: "Months since separation", type: "number" },
        ],
      },
      {
        id: "school-selection",
        title: "School Selection",
        fields: [
          { key: "schoolName", label: "School name", type: "text" },
          {
            key: "programType",
            label: "Program type",
            type: "select",
            options: [
              { label: "Undergraduate", value: "undergraduate" },
              { label: "Graduate", value: "graduate" },
              { label: "Vocational / trade", value: "vocational" },
            ],
          },
          { key: "zipCode", label: "School ZIP code", type: "text" },
        ],
      },
      {
        id: "benefits",
        title: "Benefits",
        fields: [
          { key: "monthsUsed", label: "Months of entitlement already used", type: "number" },
        ],
      },
    ],
    buildBundle: buildGiBillBundle,
  } satisfies WorkflowDefinition<GiBillInput>,

  "veterans/va-healthcare": {
    summary: {
      id: "veterans/va-healthcare",
      domain: "veterans",
      title: "VA healthcare enrollment",
      summary: "Determine VA healthcare priority group and estimate copay obligations based on service and income.",
      status: "active",
      audience: "individual",
      tags: ["va", "healthcare", "veterans", "priority-group", "enrollment"],
    },
    inputSchema: vaHealthcareInputSchema,
    starterData: {
      veteranName: "",
      disabilityRating: 0,
      annualIncome: 0,
      hasServiceConnectedDisability: false,
      receivingVaPension: false,
      hasCombatService: false,
    } satisfies VaHealthcareInput,
    sections: [
      {
        id: "service-info",
        title: "Service Information",
        fields: [
          { key: "veteranName", label: "Veteran name", type: "text" },
          { key: "hasCombatService", label: "Has combat service", type: "confirm" },
        ],
      },
      {
        id: "health-income",
        title: "Health & Income",
        fields: [
          { key: "disabilityRating", label: "VA disability rating (%)", type: "number" },
          { key: "hasServiceConnectedDisability", label: "Has service-connected disability", type: "confirm" },
          { key: "receivingVaPension", label: "Receiving VA pension", type: "confirm" },
          { key: "annualIncome", label: "Annual income", type: "currency" },
        ],
      },
    ],
    buildBundle: buildVaHealthcareBundle,
  } satisfies WorkflowDefinition<VaHealthcareInput>,
} as const;
