/**
 * localStorage helpers for PigeonGov's free-tier persistence layer.
 *
 * No auth required. Everything lives in the browser.
 * Keys are namespaced with `pigeongov-` to avoid collisions.
 *
 * The HouseholdProfile is the central data store — it knows enough about
 * a household to pre-fill 80% of any workflow. Think of it as the
 * government's view of you, except you control it and it actually works.
 */

import type { ScreenerInput } from "@/app/actions";

// ---------------------------------------------------------------------------
// Schema — Legacy (kept for backward compat)
// ---------------------------------------------------------------------------

export interface DraftData {
  workflowId: string;
  title: string;
  answers: Record<string, unknown>;
  currentSection: number;
  totalSections: number;
  lastSaved: string; // ISO date
}

/** @deprecated Use HouseholdProfile instead */
export interface ProfileData {
  householdSize?: number;
  state?: string;
  income?: number;
  isVeteran?: boolean;
  hasDisability?: boolean;
  hasChildren?: boolean;
}

export interface ActivityEntry {
  type: "screener" | "cliff" | "workflow" | "life-event" | "student-loans";
  label: string;
  date: string; // ISO date
  workflowId?: string;
  path?: string;
}

// ---------------------------------------------------------------------------
// Schema — Household Profile (the real deal)
// ---------------------------------------------------------------------------

export type MemberRelationship =
  | "self"
  | "spouse"
  | "child"
  | "parent"
  | "sibling"
  | "other";

export interface HouseholdMember {
  name: string;
  age: number;
  relationship: MemberRelationship;
  /** Never stored in localStorage — lives in a vault (someday) */
  ssn?: string;
  isVeteran?: boolean;
  hasDisability?: boolean;
  isStudent?: boolean;
}

export type FilingStatus =
  | "single"
  | "mfj"
  | "mfs"
  | "hoh"
  | "widow";

export interface CurrentBenefit {
  program: string;
  monthlyValue: number;
  renewalDate?: string;
}

export interface HouseholdProfile {
  // ── People ──────────────────────────────────────────────────
  members: HouseholdMember[];

  // ── Household ───────────────────────────────────────────────
  state: string;
  annualIncome: number;
  monthlyRent: number;
  filingStatus: FilingStatus;

  // ── Benefits currently receiving ────────────────────────────
  currentBenefits: CurrentBenefit[];

  // ── Completed workflows ─────────────────────────────────────
  completedWorkflows: string[];

  // ── Quick flags ─────────────────────────────────────────────
  hasStudentLoans: boolean;

  // ── Computed (cached, derived from members) ─────────────────
  householdSize: number;
  hasChildrenUnder18: boolean;
  hasElderlyMember: boolean;
  isVeteranHousehold: boolean;
  hasDisabledMember: boolean;

  // ── Meta ────────────────────────────────────────────────────
  lastUpdated: string; // ISO date
  setupComplete: boolean;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const PROFILE_KEY = "pigeongov-profile";
const HOUSEHOLD_KEY = "pigeongov-household";
const ACTIVITY_KEY = "pigeongov-activity";
const DRAFT_PREFIX = "pigeongov-draft-";

// ---------------------------------------------------------------------------
// Generic safe read / write
// ---------------------------------------------------------------------------

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded, etc. — degrade silently
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Computed fields — derived from the members array
// ---------------------------------------------------------------------------

function computeProfileFields(
  members: HouseholdMember[]
): Pick<
  HouseholdProfile,
  | "householdSize"
  | "hasChildrenUnder18"
  | "hasElderlyMember"
  | "isVeteranHousehold"
  | "hasDisabledMember"
> {
  return {
    householdSize: members.length,
    hasChildrenUnder18: members.some((m) => m.age < 18),
    hasElderlyMember: members.some((m) => m.age >= 65),
    isVeteranHousehold: members.some((m) => m.isVeteran),
    hasDisabledMember: members.some((m) => m.hasDisability),
  };
}

// ---------------------------------------------------------------------------
// Household Profile CRUD
// ---------------------------------------------------------------------------

export function getHouseholdProfile(): HouseholdProfile | null {
  return safeGet<HouseholdProfile>(HOUSEHOLD_KEY);
}

export function saveHouseholdProfile(profile: HouseholdProfile): void {
  // Always recompute derived fields before saving
  const computed = computeProfileFields(profile.members);
  const updated: HouseholdProfile = {
    ...profile,
    ...computed,
    lastUpdated: new Date().toISOString(),
  };
  safeSet(HOUSEHOLD_KEY, updated);
}

export function deleteHouseholdProfile(): void {
  safeRemove(HOUSEHOLD_KEY);
}

/**
 * Create an empty profile as a starting point for the setup wizard.
 */
export function createEmptyProfile(): HouseholdProfile {
  return {
    members: [],
    state: "",
    annualIncome: 0,
    monthlyRent: 0,
    filingStatus: "single",
    currentBenefits: [],
    completedWorkflows: [],
    hasStudentLoans: false,
    householdSize: 0,
    hasChildrenUnder18: false,
    hasElderlyMember: false,
    isVeteranHousehold: false,
    hasDisabledMember: false,
    lastUpdated: new Date().toISOString(),
    setupComplete: false,
  };
}

// ---------------------------------------------------------------------------
// Standalone query helpers
//
// For when you just need a quick boolean check without thinking about
// the full profile shape. The kind of convenience functions that make
// you feel like the API was designed by someone who's actually used it.
// ---------------------------------------------------------------------------

/**
 * Number of people in the household, or 0 if no profile exists.
 */
export function getHouseholdSize(profile: HouseholdProfile): number {
  return profile.householdSize || profile.members.length;
}

/**
 * Whether any household member is under 18.
 */
export function hasChildrenUnder18(profile: HouseholdProfile): boolean {
  return profile.hasChildrenUnder18 || profile.members.some((m) => m.age < 18);
}

/**
 * Whether anyone in the household is a veteran.
 */
export function isVeteranHousehold(profile: HouseholdProfile): boolean {
  return profile.isVeteranHousehold || profile.members.some((m) => m.isVeteran);
}

// ---------------------------------------------------------------------------
// Profile → Engine input converters
//
// The profile knows enough to pre-fill 80% of any workflow. These
// functions bridge the gap between "what the user told us" and "what
// the engine wants to hear."
// ---------------------------------------------------------------------------

/**
 * Convert a household profile to ScreenerInput for benefit eligibility checks.
 */
export function profileToScreenerInput(
  profile: HouseholdProfile
): ScreenerInput {
  return {
    householdSize: profile.householdSize,
    annualHouseholdIncome: profile.annualIncome,
    state: profile.state,
    citizenshipStatus: "us_citizen", // default — screener doesn't require this
    ages: profile.members.map((m) => m.age),
    hasDisability: profile.hasDisabledMember,
    employmentStatus: "employed", // default — could be inferred from income
    isVeteran: profile.isVeteranHousehold,
    hasHealthInsurance: true, // conservative default
    monthlyRent: profile.monthlyRent,
  };
}

/**
 * Extract cliff analysis input parameters from a household profile.
 */
export function profileToCliffInput(
  profile: HouseholdProfile
): { income: number; household: number; state: string } {
  return {
    income: profile.annualIncome,
    household: profile.householdSize,
    state: profile.state,
  };
}

/**
 * Pre-fill workflow starter data from the household profile.
 *
 * This is the real trick: every workflow has a starterData shape,
 * and the profile contains enough to fill most of it. Returns a
 * Record of key→value pairs that can be merged into starterData.
 */
export function profilePrefillWorkflow(
  profile: HouseholdProfile,
  _workflowId: string
): Record<string, unknown> {
  const self = profile.members.find((m) => m.relationship === "self");
  const spouse = profile.members.find((m) => m.relationship === "spouse");
  const children = profile.members.filter((m) => m.relationship === "child");

  // Common fields that most workflows need
  const common: Record<string, unknown> = {
    householdSize: profile.householdSize,
    state: profile.state,
    annualIncome: profile.annualIncome,
    monthlyRent: profile.monthlyRent,
    filingStatus: profile.filingStatus,
    isVeteran: profile.isVeteranHousehold,
    hasDisability: profile.hasDisabledMember,
  };

  // Add self info
  if (self) {
    common.primaryName = self.name;
    common.primaryAge = self.age;
  }

  // Add spouse info
  if (spouse) {
    common.spouseName = spouse.name;
    common.spouseAge = spouse.age;
  }

  // Add dependent info
  if (children.length > 0) {
    common.dependents = children.map((c) => ({
      name: c.name,
      age: c.age,
      relationship: c.relationship,
    }));
    common.numberOfDependents = children.length;
  }

  // Add current benefits
  if (profile.currentBenefits.length > 0) {
    common.currentBenefits = profile.currentBenefits.map((b) => b.program);
    common.totalMonthlyBenefits = profile.currentBenefits.reduce(
      (sum, b) => sum + b.monthlyValue,
      0
    );
  }

  return common;
}

// ---------------------------------------------------------------------------
// Legacy Profile (backward compat)
// ---------------------------------------------------------------------------

/** @deprecated Use getHouseholdProfile() instead */
export function getProfile(): ProfileData {
  return safeGet<ProfileData>(PROFILE_KEY) ?? {};
}

/** @deprecated Use saveHouseholdProfile() instead */
export function saveProfile(data: Partial<ProfileData>): void {
  const current = getProfile();
  safeSet(PROFILE_KEY, { ...current, ...data });
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export function getDraft(workflowId: string): DraftData | null {
  return safeGet<DraftData>(`${DRAFT_PREFIX}${workflowId}`);
}

export function saveDraft(data: DraftData): void {
  safeSet(`${DRAFT_PREFIX}${data.workflowId}`, {
    ...data,
    lastSaved: new Date().toISOString(),
  });
}

export function deleteDraft(workflowId: string): void {
  safeRemove(`${DRAFT_PREFIX}${workflowId}`);
}

export function listDrafts(): DraftData[] {
  if (typeof window === "undefined") return [];
  const drafts: DraftData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        const draft = safeGet<DraftData>(key);
        if (draft) drafts.push(draft);
      }
    }
  } catch {
    // ignore
  }
  // Most recently saved first
  return drafts.sort(
    (a, b) =>
      new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
  );
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

const MAX_ACTIVITY = 50;

export function getActivity(): ActivityEntry[] {
  return safeGet<ActivityEntry[]>(ACTIVITY_KEY) ?? [];
}

export function logActivity(entry: Omit<ActivityEntry, "date">): void {
  const log = getActivity();
  log.unshift({ ...entry, date: new Date().toISOString() });
  // Keep only the most recent N entries
  safeSet(ACTIVITY_KEY, log.slice(0, MAX_ACTIVITY));
}

// ---------------------------------------------------------------------------
// Deadlines (static for now; engine call is stretch)
// ---------------------------------------------------------------------------

export interface Deadline {
  date: string;
  label: string;
  daysRemaining: number;
  urgency: "critical" | "warning" | "info";
}

export function getUpcomingDeadlines(): Deadline[] {
  const now = new Date("2026-03-31"); // matches engine's hardcoded "now"
  const deadlines: Deadline[] = [
    {
      date: "2026-04-15",
      label: "Federal tax return",
      daysRemaining: 0,
      urgency: "critical",
    },
    {
      date: "2026-07-01",
      label: "Student loan consolidation deadline (Parent PLUS)",
      daysRemaining: 0,
      urgency: "warning",
    },
    {
      date: "2026-09-30",
      label: "SAVE transition deadline",
      daysRemaining: 0,
      urgency: "warning",
    },
  ];

  for (const d of deadlines) {
    const target = new Date(d.date);
    d.daysRemaining = Math.max(
      0,
      Math.ceil(
        (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    if (d.daysRemaining <= 14) d.urgency = "critical";
    else if (d.daysRemaining <= 60) d.urgency = "warning";
    else d.urgency = "info";
  }

  return deadlines
    .filter((d) => d.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
