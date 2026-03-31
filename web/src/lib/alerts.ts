/**
 * Proactive Alerts Engine
 *
 * Generates time-sensitive alerts from a household profile. Each alert
 * represents something the household should know about before it's too late —
 * a deadline, a child aging out of a program, a legislative cliff.
 *
 * The philosophy: government deadlines are the one domain where surprises
 * are never pleasant. Better to know about them 90 days early than 1 day late.
 */

import type { HouseholdProfile, HouseholdMember } from "./local-storage";
import type { WorkflowBundle } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertUrgency = "critical" | "warning" | "info";

export type AlertSource =
  | "deadline"    // Hard deadlines (tax filing, benefit renewals)
  | "profile"     // Profile-derived (child aging out, turning 26/65)
  | "workflow"    // Active workflow deadlines
  | "legislative" // Legislative deadlines (student loan consolidation)
  | "renewal";    // Benefit recertification

export interface Alert {
  id: string;
  urgency: AlertUrgency;
  source: AlertSource;
  headline: string;
  detail?: string;
  date: string;
  daysUntil: number;
  actionUrl?: string;
  actionLabel?: string;
}

// ---------------------------------------------------------------------------
// Static deadlines — the government's idea of a calendar
// ---------------------------------------------------------------------------

interface StaticDeadline {
  date: string;
  headline: string;
  detail: string;
  source: AlertSource;
  urgency: AlertUrgency;
  actionUrl?: string;
  actionLabel?: string;
  /** Only show if this returns true for the profile */
  condition?: (profile: HouseholdProfile) => boolean;
}

const STATIC_DEADLINES: StaticDeadline[] = [
  {
    date: "2026-04-15",
    headline: "Tax return due",
    detail: "Federal income tax return (Form 1040) due. Extensions available until Oct 15.",
    source: "deadline",
    urgency: "critical",
    actionUrl: "/workflows/tax/1040",
    actionLabel: "File taxes",
  },
  {
    date: "2026-07-01",
    headline: "Student loan consolidation deadline",
    detail:
      "Parent PLUS borrowers must consolidate by July 1 to access IDR plans. After this date, consolidation options narrow significantly.",
    source: "legislative",
    urgency: "warning",
    actionUrl: "/student-loans/transition",
    actionLabel: "Check options",
  },
  {
    date: "2026-09-30",
    headline: "SAVE plan transition deadline",
    detail: "Deadline to switch from SAVE plan during forbearance. Months in forbearance do not count toward forgiveness.",
    source: "legislative",
    urgency: "warning",
    actionUrl: "/student-loans/transition",
    actionLabel: "Plan transition",
  },
  {
    date: "2026-10-01",
    headline: "New federal fiscal year",
    detail: "SNAP benefit amounts may be recalculated. Check for changes to your allotment.",
    source: "deadline",
    urgency: "info",
    condition: (p) =>
      p.currentBenefits.some((b) =>
        b.program.toLowerCase().includes("snap")
      ),
  },
  {
    date: "2026-11-01",
    headline: "ACA Open Enrollment begins",
    detail:
      "Healthcare.gov marketplace open enrollment period. Review plans, update income, check for subsidy changes.",
    source: "deadline",
    urgency: "info",
    actionUrl: "/screen",
    actionLabel: "Check eligibility",
  },
];

// ---------------------------------------------------------------------------
// Profile-derived alerts
// ---------------------------------------------------------------------------

function getProfileAlerts(profile: HouseholdProfile): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date("2026-04-01"); // matches engine
  let nextId = 100;

  for (const member of profile.members) {
    // Child approaching WIC age-out (turns 5)
    if (member.relationship === "child" && member.age === 4) {
      alerts.push({
        id: `profile-${nextId++}`,
        urgency: "info",
        source: "profile",
        headline: `${member.name} turns 5 — WIC eligibility ends`,
        detail: `When ${member.name} turns 5, WIC benefits will end. Consider SNAP as an alternative if needed.`,
        date: estimateBirthday(member, 5),
        daysUntil: daysUntilAge(member, 5, now),
      });
    }

    // Child approaching CHIP age-out
    if (member.relationship === "child" && member.age >= 17 && member.age < 19) {
      const ageOut = member.age < 18 ? 18 : 19;
      alerts.push({
        id: `profile-${nextId++}`,
        urgency: member.age >= 18 ? "warning" : "info",
        source: "profile",
        headline: `${member.name} turns ${ageOut} — review CHIP eligibility`,
        detail: `CHIP coverage may end. Explore Medicaid or ACA marketplace options.`,
        date: estimateBirthday(member, ageOut),
        daysUntil: daysUntilAge(member, ageOut, now),
        actionUrl: "/screen",
        actionLabel: "Check options",
      });
    }

    // Young adult approaching 26 — ages off parent insurance
    if (member.age >= 24 && member.age < 26) {
      alerts.push({
        id: `profile-${nextId++}`,
        urgency: member.age === 25 ? "warning" : "info",
        source: "profile",
        headline: `${member.name} turns 26 — ages off parent's insurance`,
        detail: `60-day special enrollment window to get own coverage. Missing it means waiting until open enrollment.`,
        date: estimateBirthday(member, 26),
        daysUntil: daysUntilAge(member, 26, now),
        actionUrl: "/screen",
        actionLabel: "Check options",
      });
    }

    // Approaching Medicare eligibility (65)
    if (member.age >= 63 && member.age < 65) {
      alerts.push({
        id: `profile-${nextId++}`,
        urgency: member.age === 64 ? "warning" : "info",
        source: "profile",
        headline: `${member.name} turns 65 — Medicare enrollment window`,
        detail: `Initial enrollment period begins 3 months before turning 65. Late enrollment incurs permanent premium penalties.`,
        date: estimateBirthday(member, 65),
        daysUntil: daysUntilAge(member, 65, now),
      });
    }
  }

  // Benefit renewal alerts
  for (const benefit of profile.currentBenefits) {
    if (benefit.renewalDate) {
      const renewalDate = new Date(benefit.renewalDate);
      const days = Math.ceil(
        (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days > 0 && days < 90) {
        alerts.push({
          id: `renewal-${nextId++}`,
          urgency: days < 30 ? "critical" : "warning",
          source: "renewal",
          headline: `${benefit.program} recertification`,
          detail: `Your ${benefit.program} benefits require recertification by ${benefit.renewalDate}. Missing the deadline may result in loss of benefits.`,
          date: benefit.renewalDate,
          daysUntil: days,
        });
      }
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Workflow-derived alerts
// ---------------------------------------------------------------------------

function getWorkflowAlerts(bundles: WorkflowBundle[]): Alert[] {
  const alerts: Alert[] = [];
  let nextId = 200;

  for (const bundle of bundles) {
    // Check for computed deadlines in the bundle
    if (bundle.derived?.deadlines && Array.isArray(bundle.derived.deadlines)) {
      for (const deadline of bundle.derived.deadlines as Array<{
        date: string;
        label: string;
        daysRemaining: number;
      }>) {
        alerts.push({
          id: `workflow-${nextId++}`,
          urgency: deadline.daysRemaining < 14 ? "critical" : "warning",
          source: "workflow",
          headline: deadline.label,
          date: deadline.date,
          daysUntil: deadline.daysRemaining,
          actionUrl: `/workflows/${bundle.workflowId}`,
          actionLabel: "Continue workflow",
        });
      }
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Main: compute all alerts for a profile
// ---------------------------------------------------------------------------

export function computeAlerts(
  profile: HouseholdProfile,
  activeWorkflows?: WorkflowBundle[]
): Alert[] {
  const now = new Date("2026-04-01");
  const alerts: Alert[] = [];

  // 1. Static deadlines
  for (const sd of STATIC_DEADLINES) {
    if (sd.condition && !sd.condition(profile)) continue;

    const target = new Date(sd.date);
    const daysUntil = Math.ceil(
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) continue; // past

    // Upgrade urgency based on proximity
    let urgency = sd.urgency;
    if (daysUntil <= 7) urgency = "critical";
    else if (daysUntil <= 30 && urgency === "info") urgency = "warning";

    alerts.push({
      id: `static-${sd.date}`,
      urgency,
      source: sd.source,
      headline: sd.headline,
      detail: sd.detail,
      date: sd.date,
      daysUntil,
      actionUrl: sd.actionUrl,
      actionLabel: sd.actionLabel,
    });
  }

  // 2. Profile-derived alerts
  alerts.push(...getProfileAlerts(profile));

  // 3. Workflow-derived alerts
  if (activeWorkflows) {
    alerts.push(...getWorkflowAlerts(activeWorkflows));
  }

  // Sort: most urgent first, then by days until
  return alerts.sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, info: 2 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.daysUntil - b.daysUntil;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rough estimate of when a member reaches a target age.
 * Since we only know current age (not exact birthday), we approximate.
 */
function estimateBirthday(member: HouseholdMember, targetAge: number): string {
  const yearsUntil = targetAge - member.age;
  const now = new Date("2026-04-01");
  const estimate = new Date(now);
  estimate.setFullYear(estimate.getFullYear() + yearsUntil);
  return estimate.toISOString().slice(0, 10);
}

function daysUntilAge(
  member: HouseholdMember,
  targetAge: number,
  now: Date
): number {
  const yearsUntil = targetAge - member.age;
  return Math.max(0, yearsUntil * 365);
}
