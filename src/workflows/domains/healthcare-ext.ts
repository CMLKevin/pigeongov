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
import { medicareEnrollmentInputSchema } from "../schemas/healthcare-ext.js";
import type { MedicareEnrollmentInput } from "../schemas/healthcare-ext.js";

// ---------------------------------------------------------------------------
// IRMAA (Income-Related Monthly Adjustment Amount) 2025
// ---------------------------------------------------------------------------

interface IrmaaBracket {
  singleThreshold: number;
  mfjThreshold: number;
  surcharge: number;
}

const IRMAA_BRACKETS: IrmaaBracket[] = [
  { singleThreshold: 103_000, mfjThreshold: 206_000, surcharge: 0 },
  { singleThreshold: 129_000, mfjThreshold: 258_000, surcharge: 70.90 },
  { singleThreshold: 161_000, mfjThreshold: 322_000, surcharge: 176.40 },
  { singleThreshold: 193_000, mfjThreshold: 386_000, surcharge: 281.90 },
  { singleThreshold: 500_000, mfjThreshold: 750_000, surcharge: 387.40 },
  // Above $500k single / $750k MFJ
  { singleThreshold: Infinity, mfjThreshold: Infinity, surcharge: 419.30 },
];

const PART_B_BASE_PREMIUM_2025 = 185;

function calculateIrmaa(income: number, filingStatus: "single" | "married_filing_jointly"): number {
  for (const bracket of IRMAA_BRACKETS) {
    const threshold = filingStatus === "single" ? bracket.singleThreshold : bracket.mfjThreshold;
    if (income <= threshold) {
      return bracket.surcharge;
    }
  }
  // Above highest bracket
  return IRMAA_BRACKETS[IRMAA_BRACKETS.length - 1]!.surcharge;
}

function buildMedicareEnrollmentBundle(input: MedicareEnrollmentInput): WorkflowBundle {
  const eligible = input.age >= 65;
  const irmaaSurcharge = calculateIrmaa(input.annualIncome, input.filingStatus);
  const monthlyPremium = PART_B_BASE_PREMIUM_2025 + irmaaSurcharge;

  // Late enrollment penalty: 10% per 12-month period without coverage after initial enrollment
  // Only applies if age > 65 and no Part B and no current creditable coverage
  const hasCredibleCoverage = input.currentCoverage !== "none";
  const yearsLate = eligible && !input.hasPartB && !hasCredibleCoverage
    ? Math.max(0, input.age - 65)
    : 0;
  const lateEnrollmentPenalty = yearsLate * 0.10 * PART_B_BASE_PREMIUM_2025;

  const totalMonthlyWithPenalty = monthlyPremium + lateEnrollmentPenalty;

  const evidence = [
    buildEvidenceItem("ss-statement", "Social Security statement", true, eligible),
    buildEvidenceItem("current-insurance", "Current insurance information", true, hasCredibleCoverage),
  ];

  const flags: ValidationFlag[] = [];
  if (yearsLate > 0) {
    flags.push(makeFlag("lateEnrollment", "warning", `Late enrollment penalty: ${currency(lateEnrollmentPenalty)}/month (${yearsLate} year(s) late at 10% penalty per year). This penalty is permanent.`));
  }
  if (irmaaSurcharge > 0) {
    flags.push(makeFlag("irmaa", "review", `IRMAA surcharge of ${currency(irmaaSurcharge)}/month applies based on income of ${currency(input.annualIncome)}.`));
  }
  if (!eligible) {
    flags.push(makeFlag("age", "review", `Age ${input.age} — not yet eligible for Medicare (65+). Consider marketplace or employer coverage.`));
  }

  const checks = [
    makeCheck("age-eligible", "Age 65 or older", eligible, "warning", "Medicare eligibility begins at age 65."),
    makeCheck("part-b-enrolled", "Part B enrollment", input.hasPartB, "warning", "Part B covers outpatient care. Late enrollment incurs permanent penalties."),
  ];

  return {
    workflowId: "healthcare/medicare-enrollment",
    domain: "healthcare",
    title: "Medicare enrollment planner",
    summary: "Medicare eligibility assessment with IRMAA calculation and late enrollment penalty estimation. PigeonGov does not enroll in Medicare.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      eligible,
      partBBasePremium: PART_B_BASE_PREMIUM_2025,
      irmaaSurcharge,
      monthlyPremium,
      yearsLate,
      lateEnrollmentPenalty,
      totalMonthlyWithPenalty,
      hasCredibleCoverage,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "Medicare enrollment",
      eligible ? `eligible — ${currency(totalMonthlyWithPenalty)}/month total` : "not yet eligible",
      evidence,
      flags,
      [
        `Applicant: ${input.applicantName}. Age: ${input.age}. DOB: ${input.dob}.`,
        `Eligibility: ${eligible ? "eligible (65+)" : "not yet eligible"}.`,
        `Part B base premium (2025): ${currency(PART_B_BASE_PREMIUM_2025)}/month.`,
        irmaaSurcharge > 0 ? `IRMAA surcharge: ${currency(irmaaSurcharge)}/month.` : "No IRMAA surcharge.",
        yearsLate > 0 ? `Late enrollment penalty: ${currency(lateEnrollmentPenalty)}/month (${yearsLate} year(s) × 10%).` : "",
        `Total estimated monthly premium: ${currency(totalMonthlyWithPenalty)}.`,
        `Part A: ${input.hasPartA ? "enrolled" : "not enrolled"}. Part B: ${input.hasPartB ? "enrolled" : "not enrolled"}.`,
      ].filter(Boolean),
    ),
    outputArtifacts: genericArtifacts("healthcare-medicare-enrollment", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const healthcareExtWorkflows = {
  "healthcare/medicare-enrollment": {
    summary: {
      id: "healthcare/medicare-enrollment",
      domain: "healthcare",
      title: "Medicare enrollment planner",
      summary: "Assess Medicare eligibility, calculate IRMAA surcharges, and estimate late enrollment penalties.",
      status: "active",
      audience: "individual",
      tags: ["medicare", "healthcare", "irmaa", "enrollment", "retirement"],
    },
    inputSchema: medicareEnrollmentInputSchema,
    starterData: {
      applicantName: "",
      dob: "",
      age: 0,
      hasPartA: false,
      hasPartB: false,
      currentCoverage: "none",
      annualIncome: 0,
      filingStatus: "single",
    } satisfies MedicareEnrollmentInput,
    sections: [
      {
        id: "eligibility",
        title: "Eligibility",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "dob", label: "Date of birth", type: "date" },
          { key: "age", label: "Current age", type: "number" },
          { key: "hasPartA", label: "Currently enrolled in Part A", type: "confirm" },
          { key: "hasPartB", label: "Currently enrolled in Part B", type: "confirm" },
        ],
      },
      {
        id: "current-coverage",
        title: "Current Coverage",
        fields: [
          { key: "currentCoverage", label: "Current health coverage", type: "text", helpText: "Enter 'none' if uninsured" },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "annualIncome", label: "Annual income (MAGI)", type: "currency" },
          {
            key: "filingStatus",
            label: "Filing status",
            type: "select",
            options: [
              { label: "Single", value: "single" },
              { label: "Married filing jointly", value: "married_filing_jointly" },
            ],
          },
        ],
      },
    ],
    buildBundle: buildMedicareEnrollmentBundle,
  } satisfies WorkflowDefinition<MedicareEnrollmentInput>,
} as const;
