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
import { ssaEstimatorInputSchema } from "../schemas/retirement.js";
import type { SsaEstimatorInput } from "../schemas/retirement.js";

// ---------------------------------------------------------------------------
// SSA PIA calculation (simplified)
// ---------------------------------------------------------------------------

// 2025 bend points (approximate)
const BEND_POINT_1 = 1_174;
const BEND_POINT_2 = 7_078;

function calculatePia(aime: number): number {
  let pia = 0;
  if (aime <= BEND_POINT_1) {
    pia = aime * 0.9;
  } else if (aime <= BEND_POINT_2) {
    pia = BEND_POINT_1 * 0.9 + (aime - BEND_POINT_1) * 0.32;
  } else {
    pia = BEND_POINT_1 * 0.9 + (BEND_POINT_2 - BEND_POINT_1) * 0.32 + (aime - BEND_POINT_2) * 0.15;
  }
  return Math.round(pia * 100) / 100;
}

function calculateAime(earningsHistory: Array<{ year: number; earnings: number }>, currentAnnualEarnings: number): number {
  // Collect all earnings including current year, take highest 35 years
  const allEarnings = [
    ...earningsHistory.map((e) => e.earnings),
    currentAnnualEarnings,
  ].sort((a, b) => b - a);

  // Pad with zeros if fewer than 35 years
  while (allEarnings.length < 35) {
    allEarnings.push(0);
  }

  const top35 = allEarnings.slice(0, 35);
  const totalEarnings = top35.reduce((sum, e) => sum + e, 0);
  return Math.round(totalEarnings / (35 * 12));
}

function buildSsaEstimatorBundle(input: SsaEstimatorInput): WorkflowBundle {
  const aime = calculateAime(input.earningsHistory, input.currentAnnualEarnings);
  const pia = calculatePia(aime);

  // Age 62: ~70% of PIA, Age 67 (FRA): 100%, Age 70: ~124%
  const benefitAt62 = Math.round(pia * 0.7);
  const benefitAt67 = Math.round(pia);
  const benefitAt70 = Math.round(pia * 1.24);

  // Spousal benefit: up to 50% of higher-earning spouse's PIA
  let spousalBenefit: number | undefined;
  if (input.spouseName && input.spouseEarnings !== undefined) {
    spousalBenefit = Math.round(pia * 0.5);
  }

  // Break-even analysis: collecting at 62 vs 67
  // Monthly difference: benefitAt67 - benefitAt62
  // Cumulative collected at 62 during 5 years: benefitAt62 * 60
  // Break-even months after 67: (benefitAt62 * 60) / (benefitAt67 - benefitAt62)
  const monthlyDifference = benefitAt67 - benefitAt62;
  const cumulativeAt62During5Years = benefitAt62 * 60;
  const breakEvenMonthsAfter67 = monthlyDifference > 0
    ? Math.round(cumulativeAt62During5Years / monthlyDifference)
    : 0;
  const breakEvenAge = 67 + Math.round(breakEvenMonthsAfter67 / 12);

  const evidence = [
    buildEvidenceItem("ssa-statement", "Social Security Administration statement", true, input.earningsHistory.length > 0),
    buildEvidenceItem("w2-history", "W-2 history (last 10+ years)", false, input.earningsHistory.length >= 10),
  ];

  const flags: ValidationFlag[] = [];
  if (input.earningsHistory.length < 10) {
    flags.push(makeFlag("earningsHistory", "warning", "Fewer than 10 years of earnings history provided — estimate accuracy is limited."));
  }

  const checks = [
    makeCheck("earnings-history", "Sufficient earnings history", input.earningsHistory.length >= 10, "warning", "At least 10 years of earnings history is recommended for accurate estimation."),
  ];

  const notes = [
    `Applicant: ${input.applicantName}. Date of birth: ${input.dob}.`,
    `AIME (Average Indexed Monthly Earnings): ${currency(aime)}.`,
    `PIA (Primary Insurance Amount): ${currency(pia)}.`,
    `Estimated monthly benefit: ${currency(benefitAt62)} at 62, ${currency(benefitAt67)} at 67, ${currency(benefitAt70)} at 70.`,
    `Break-even analysis: collecting at 62 vs 67 breaks even at approximately age ~${breakEvenAge}.`,
  ];

  if (spousalBenefit !== undefined && input.spouseName) {
    notes.push(`Spousal benefit (${input.spouseName}): up to ${currency(spousalBenefit)}/month (50% of worker PIA).`);
  }

  return {
    workflowId: "retirement/ssa-estimator",
    domain: "retirement",
    title: "Social Security retirement benefit estimator",
    summary: "Simplified SSA retirement benefit estimation using AIME/PIA formula. PigeonGov is not affiliated with SSA.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      aime,
      pia,
      benefitAt62,
      benefitAt67,
      benefitAt70,
      spousalBenefit,
      breakEvenAge,
      yearsOfEarnings: input.earningsHistory.length,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "SSA retirement estimate",
      `${currency(benefitAt62)} at 62 / ${currency(benefitAt67)} at 67 / ${currency(benefitAt70)} at 70`,
      evidence,
      flags,
      notes,
    ),
    outputArtifacts: genericArtifacts("retirement-ssa-estimator", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const retirementWorkflows = {
  "retirement/ssa-estimator": {
    summary: {
      id: "retirement/ssa-estimator",
      domain: "retirement",
      title: "Social Security retirement benefit estimator",
      summary: "Estimate Social Security retirement benefits at ages 62, 67, and 70 using simplified AIME/PIA calculation.",
      status: "active",
      audience: "individual",
      tags: ["ssa", "retirement", "social-security", "pia", "aime", "benefits"],
    },
    inputSchema: ssaEstimatorInputSchema,
    starterData: {
      applicantName: "",
      dob: "",
      earningsHistory: [],
      currentAnnualEarnings: 0,
    } satisfies SsaEstimatorInput,
    sections: [
      {
        id: "personal-info",
        title: "Personal Information",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "dob", label: "Date of birth", type: "date" },
          { key: "spouseName", label: "Spouse name (optional)", type: "text" },
          { key: "spouseDob", label: "Spouse date of birth (optional)", type: "date" },
        ],
      },
      {
        id: "earnings-history",
        title: "Earnings History",
        description: "Enter annual earnings for as many years as available. More history produces better estimates.",
        fields: [
          { key: "currentAnnualEarnings", label: "Current annual earnings", type: "currency" },
          { key: "spouseEarnings", label: "Spouse annual earnings (optional)", type: "currency" },
        ],
      },
      {
        id: "retirement-planning",
        title: "Retirement Planning",
        description: "Benefits are estimated at ages 62 (early), 67 (full retirement age), and 70 (delayed).",
        fields: [],
      },
    ],
    buildBundle: buildSsaEstimatorBundle,
  } satisfies WorkflowDefinition<SsaEstimatorInput>,
} as const;
