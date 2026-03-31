/**
 * Cross-Domain Intelligence Engine
 *
 * The government makes you fill out the same information seventeen times across
 * twelve agencies, each blissfully unaware that the others exist. This module
 * does what none of them will: connects the dots.
 *
 * Given a completed workflow bundle and a household profile, it surfaces
 * connections across benefit programs, tax implications, student loans,
 * immigration status, and benefit cliffs. The kind of thing a good social
 * worker would tell you — if you happened to have one.
 */

import type { WorkflowBundle } from "./types";
import type { HouseholdProfile, HouseholdMember } from "./local-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InsightCategory =
  | "benefits"
  | "cliff"
  | "student-loans"
  | "tax"
  | "immigration"
  | "healthcare"
  | "aging";

export type InsightConfidence = "high" | "medium" | "low";

export interface BenefitInsight {
  program: string;
  estimatedMonthly: number;
  eligible: "likely" | "possible" | "check";
  action: string;
  note?: string;
}

export interface CliffInsight {
  currentIncome: number;
  cutoffIncome: number;
  program: string;
  annualLoss: number;
  margin: number; // dollars below cutoff
}

export interface StudentLoanInsight {
  currentPayment: number;
  idrPayment: number;
  monthlySavings: number;
  note: string;
}

export interface AgingInsight {
  memberName: string;
  event: string;
  date: string;
  consequence: string;
  daysUntil: number;
}

export interface CrossDomainInsight {
  id: string;
  category: InsightCategory;
  headline: string;
  confidence: InsightConfidence;
  benefits?: BenefitInsight[];
  cliff?: CliffInsight;
  studentLoan?: StudentLoanInsight;
  aging?: AgingInsight;
  estimatedAnnualValue?: number;
  urgency: "high" | "medium" | "low";
}

export interface InsightsResult {
  insights: CrossDomainInsight[];
  totalEstimatedUnclaimed: number;
  connectionCount: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Federal Poverty Level (2026 estimates — 48 contiguous states + DC)
// ---------------------------------------------------------------------------

const FPL_BASE = 15_650; // base for household of 1
const FPL_PER_PERSON = 5_530; // additional per person

function federalPovertyLevel(householdSize: number): number {
  return FPL_BASE + FPL_PER_PERSON * Math.max(0, householdSize - 1);
}

// ---------------------------------------------------------------------------
// Program thresholds (expressed as % of FPL)
// ---------------------------------------------------------------------------

interface ProgramThreshold {
  program: string;
  fplPercent: number;
  estimatedMonthly: number;
  requiresChildren?: boolean;
  requiresChildUnder?: number;
  requiresDisability?: boolean;
  requiresVeteran?: boolean;
}

const PROGRAM_THRESHOLDS: ProgramThreshold[] = [
  { program: "SNAP", fplPercent: 130, estimatedMonthly: 290 },
  { program: "Medicaid", fplPercent: 138, estimatedMonthly: 500 },
  {
    program: "WIC",
    fplPercent: 185,
    estimatedMonthly: 75,
    requiresChildUnder: 5,
  },
  { program: "CHIP", fplPercent: 200, estimatedMonthly: 250, requiresChildren: true },
  { program: "LIHEAP", fplPercent: 150, estimatedMonthly: 150 },
  { program: "Section 8", fplPercent: 50, estimatedMonthly: 800 },
  { program: "TANF", fplPercent: 100, estimatedMonthly: 450, requiresChildren: true },
  { program: "SSI", fplPercent: 100, estimatedMonthly: 940, requiresDisability: true },
  { program: "ACA Subsidies", fplPercent: 400, estimatedMonthly: 400 },
  { program: "VA Healthcare", fplPercent: 200, estimatedMonthly: 400, requiresVeteran: true },
];

// ---------------------------------------------------------------------------
// Screener: which programs could this household qualify for?
// ---------------------------------------------------------------------------

function screenBenefits(
  income: number,
  householdSize: number,
  members: HouseholdMember[],
  currentBenefits: string[]
): BenefitInsight[] {
  const fpl = federalPovertyLevel(householdSize);
  const incomePercent = (income / fpl) * 100;
  const hasChildUnder5 = members.some(
    (m) => m.relationship === "child" && m.age < 5
  );
  const hasChildren = members.some(
    (m) => m.relationship === "child" && m.age < 18
  );
  const hasDisability = members.some((m) => m.hasDisability);
  const hasVeteran = members.some((m) => m.isVeteran);

  const insights: BenefitInsight[] = [];

  for (const threshold of PROGRAM_THRESHOLDS) {
    // Skip if already receiving
    const alreadyReceiving = currentBenefits.some(
      (b) => b.toLowerCase().includes(threshold.program.toLowerCase())
    );
    if (alreadyReceiving) continue;

    // Check category-specific requirements
    if (threshold.requiresChildren && !hasChildren) continue;
    if (threshold.requiresChildUnder && !hasChildUnder5) continue;
    if (threshold.requiresDisability && !hasDisability) continue;
    if (threshold.requiresVeteran && !hasVeteran) continue;

    if (incomePercent <= threshold.fplPercent) {
      const margin = threshold.fplPercent - incomePercent;
      insights.push({
        program: threshold.program,
        estimatedMonthly: threshold.estimatedMonthly,
        eligible: margin > 20 ? "likely" : margin > 5 ? "possible" : "check",
        action: `Check eligibility`,
        note:
          margin < 10
            ? `You're close to the income limit`
            : undefined,
      });
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Cliff checker: is the income dangerously near a benefit cutoff?
// ---------------------------------------------------------------------------

function checkCliffs(
  income: number,
  householdSize: number,
  members: HouseholdMember[],
  currentBenefitNames: string[]
): CliffInsight | null {
  const fpl = federalPovertyLevel(householdSize);
  const hasChildren = members.some(
    (m) => m.relationship === "child" && m.age < 18
  );
  const hasDisability = members.some((m) => m.hasDisability);
  const hasVeteran = members.some((m) => m.isVeteran);

  // Check each program the household might be receiving or qualify for
  let nearestCliff: CliffInsight | null = null;
  let smallestMargin = Infinity;

  for (const threshold of PROGRAM_THRESHOLDS) {
    if (threshold.requiresChildren && !hasChildren) continue;
    if (threshold.requiresDisability && !hasDisability) continue;
    if (threshold.requiresVeteran && !hasVeteran) continue;

    const cutoff = (threshold.fplPercent / 100) * fpl;
    const margin = cutoff - income;

    // Only flag if we're below the cutoff and within $3,000
    if (margin > 0 && margin < 3000 && margin < smallestMargin) {
      // Check if they're actually getting this benefit or likely qualify
      const isReceiving = currentBenefitNames.some(
        (b) => b.toLowerCase().includes(threshold.program.toLowerCase())
      );
      const incomePercent = (income / fpl) * 100;
      const likelyQualifies = incomePercent <= threshold.fplPercent;

      if (isReceiving || likelyQualifies) {
        smallestMargin = margin;
        nearestCliff = {
          currentIncome: income,
          cutoffIncome: Math.round(cutoff),
          program: threshold.program,
          annualLoss: threshold.estimatedMonthly * 12,
          margin: Math.round(margin),
        };
      }
    }
  }

  return nearestCliff;
}

// ---------------------------------------------------------------------------
// Student loan IDR check
// ---------------------------------------------------------------------------

function checkStudentLoans(
  income: number,
  householdSize: number,
  hasStudentLoans: boolean
): StudentLoanInsight | null {
  if (!hasStudentLoans) return null;

  const fpl = federalPovertyLevel(householdSize);

  // SAVE plan: 10% of discretionary income (income - 225% FPL) / 12
  const discretionary = Math.max(0, income - fpl * 2.25);
  const idrMonthly = Math.round((discretionary * 0.1) / 12);
  const standardPayment = 331; // typical standard 10-year payment on ~$30k balance

  if (idrMonthly < standardPayment * 0.75) {
    return {
      currentPayment: standardPayment,
      idrPayment: idrMonthly,
      monthlySavings: standardPayment - idrMonthly,
      note: `At ${formatIncome(income)} income (household of ${householdSize}), income-driven repayment could significantly reduce your monthly payment.`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Aging events: members approaching eligibility boundaries
// ---------------------------------------------------------------------------

function checkAgingEvents(members: HouseholdMember[]): AgingInsight[] {
  const now = new Date("2026-04-01"); // matches engine's "now"
  const insights: AgingInsight[] = [];

  for (const member of members) {
    // Child turning 5 -> WIC ends
    if (member.relationship === "child" && member.age === 4) {
      insights.push({
        memberName: member.name,
        event: "Turns 5",
        date: "Within next year",
        consequence: "WIC eligibility ends",
        daysUntil: 365,
      });
    }

    // Child turning 6 -> some childcare subsidies end
    if (member.relationship === "child" && member.age === 5) {
      insights.push({
        memberName: member.name,
        event: "Turns 6",
        date: "Within next year",
        consequence: "WIC eligibility ends; review childcare subsidy",
        daysUntil: 365,
      });
    }

    // Child approaching 18 -> CHIP, SNAP household count, child tax credit
    if (member.relationship === "child" && member.age >= 16 && member.age < 18) {
      insights.push({
        memberName: member.name,
        event: "Turns 18",
        date: `In ~${18 - member.age} year(s)`,
        consequence:
          "CHIP eligibility ends; may affect SNAP household size; child tax credit ends",
        daysUntil: (18 - member.age) * 365,
      });
    }

    // Turning 26 -> ages off parent insurance
    if (member.age >= 24 && member.age < 26) {
      insights.push({
        memberName: member.name,
        event: "Turns 26",
        date: `In ~${26 - member.age} year(s)`,
        consequence:
          "Ages off parent's health insurance; 60-day special enrollment window",
        daysUntil: (26 - member.age) * 365,
      });
    }

    // Approaching 65 -> Medicare
    if (member.age >= 63 && member.age < 65) {
      insights.push({
        memberName: member.name,
        event: "Turns 65",
        date: `In ~${65 - member.age} year(s)`,
        consequence:
          "Medicare enrollment window opens; late enrollment penalties are permanent",
        daysUntil: (65 - member.age) * 365,
      });
    }
  }

  return insights.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ---------------------------------------------------------------------------
// Main intelligence engine
// ---------------------------------------------------------------------------

export function getCrossDomainInsights(
  bundle: WorkflowBundle,
  profile: HouseholdProfile
): InsightsResult {
  const insights: CrossDomainInsight[] = [];
  let nextId = 1;

  const income =
    profile.annualIncome ||
    (bundle.derived?.agi as number) ||
    (bundle.derived?.taxableIncome as number) ||
    (bundle.answers?.annualIncome as number) ||
    0;

  const householdSize = profile.householdSize || bundle.household.length || 1;
  const members = profile.members.length > 0
    ? profile.members
    : bundle.household.map((h) => ({
        name: h.name,
        age: h.age ?? 30,
        relationship: (h.relationship === "self" ||
          h.relationship === "spouse" ||
          h.relationship === "child" ||
          h.relationship === "parent" ||
          h.relationship === "sibling"
          ? h.relationship
          : "other") as HouseholdMember["relationship"],
      }));

  const currentBenefitNames = profile.currentBenefits.map((b) => b.program);

  // Has student loans? Check both profile and bundle answers
  const hasStudentLoans =
    members.some((m) => (m as Record<string, unknown>).isStudent) ||
    Boolean(bundle.answers?.hasStudentLoans) ||
    bundle.domain === "education" ||
    profile.completedWorkflows.some((w) => w.includes("student"));

  // ── 1. Benefit screening ──────────────────────────────────────
  if (income > 0) {
    const benefitResults = screenBenefits(
      income,
      householdSize,
      members,
      currentBenefitNames
    );

    if (benefitResults.length > 0) {
      const totalAnnual = benefitResults.reduce(
        (sum, b) => sum + b.estimatedMonthly * 12,
        0
      );

      insights.push({
        id: `insight-${nextId++}`,
        category: "benefits",
        headline: `Your ${bundle.domain === "tax" ? "AGI" : "income"} of ${formatIncome(income)} (household of ${householdSize}) qualifies for:`,
        confidence: "medium",
        benefits: benefitResults,
        estimatedAnnualValue: totalAnnual,
        urgency: benefitResults.some((b) => b.eligible === "likely")
          ? "high"
          : "medium",
      });
    }
  }

  // ── 2. Cliff detection ────────────────────────────────────────
  if (income > 0) {
    const cliff = checkCliffs(income, householdSize, members, currentBenefitNames);
    if (cliff) {
      insights.push({
        id: `insight-${nextId++}`,
        category: "cliff",
        headline: `You're $${cliff.margin.toLocaleString()} below the ${cliff.program} cutoff at ${formatIncome(cliff.cutoffIncome)}/yr`,
        confidence: "high",
        cliff,
        urgency: cliff.margin < 1000 ? "high" : "medium",
      });
    }
  }

  // ── 3. Student loan IDR check ─────────────────────────────────
  if (income > 0) {
    const loanInsight = checkStudentLoans(income, householdSize, hasStudentLoans);
    if (loanInsight) {
      insights.push({
        id: `insight-${nextId++}`,
        category: "student-loans",
        headline: `At this income, your IDR payment: ~$${loanInsight.idrPayment}/month`,
        confidence: "medium",
        studentLoan: loanInsight,
        estimatedAnnualValue: loanInsight.monthlySavings * 12,
        urgency: "medium",
      });
    }
  }

  // ── 4. Domain-specific cross-links ────────────────────────────

  // Tax -> benefits
  if (bundle.domain === "tax") {
    const agi = (bundle.derived?.agi as number) ?? income;
    const eitcAmount = (bundle.derived?.eitcAmount as number) ?? 0;
    if (eitcAmount === 0 && agi > 0 && agi < 60000 && members.some((m) => m.relationship === "child")) {
      insights.push({
        id: `insight-${nextId++}`,
        category: "tax",
        headline:
          "You may qualify for the Earned Income Tax Credit (EITC)",
        confidence: "low",
        estimatedAnnualValue: 3000,
        urgency: "medium",
      });
    }
  }

  // Immigration -> tax implications
  if (
    bundle.domain === "immigration" ||
    bundle.workflowId.includes("immigration")
  ) {
    insights.push({
      id: `insight-${nextId++}`,
      category: "immigration",
      headline:
        "Status changes may affect tax filing requirements and benefit eligibility",
      confidence: "medium",
      urgency: "medium",
    });
  }

  // Benefits -> cross-check other programs
  if (bundle.domain === "benefits") {
    const otherPrograms = PROGRAM_THRESHOLDS.filter(
      (p) =>
        !bundle.workflowId.toLowerCase().includes(p.program.toLowerCase()) &&
        !currentBenefitNames.some((b) =>
          b.toLowerCase().includes(p.program.toLowerCase())
        )
    );
    const fpl = federalPovertyLevel(householdSize);
    const incomePercent = (income / fpl) * 100;
    const additional = otherPrograms.filter(
      (p) => incomePercent <= p.fplPercent
    );

    if (additional.length > 0) {
      insights.push({
        id: `insight-${nextId++}`,
        category: "benefits",
        headline: `Since you qualify for ${bundle.title}, you may also qualify for ${additional.length} other program(s)`,
        confidence: "medium",
        benefits: additional.map((p) => ({
          program: p.program,
          estimatedMonthly: p.estimatedMonthly,
          eligible: "possible" as const,
          action: "Check eligibility",
        })),
        urgency: "medium",
      });
    }
  }

  // ── 5. Aging events ───────────────────────────────────────────
  const agingEvents = checkAgingEvents(members);
  for (const aging of agingEvents.slice(0, 3)) {
    insights.push({
      id: `insight-${nextId++}`,
      category: "aging",
      headline: `${aging.memberName} ${aging.event.toLowerCase()} — ${aging.consequence}`,
      confidence: "high",
      aging,
      urgency: aging.daysUntil < 365 ? "medium" : "low",
    });
  }

  // ── Compute totals ────────────────────────────────────────────
  const totalEstimatedUnclaimed = insights.reduce(
    (sum, i) => sum + (i.estimatedAnnualValue ?? 0),
    0
  );

  return {
    insights,
    totalEstimatedUnclaimed,
    connectionCount: insights.length,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatIncome(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
