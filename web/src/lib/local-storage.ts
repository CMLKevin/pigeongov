/**
 * localStorage helpers for PigeonGov's free-tier persistence layer.
 *
 * No auth required. Everything lives in the browser.
 * Keys are namespaced with `pigeongov-` to avoid collisions.
 */

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface DraftData {
  workflowId: string;
  title: string;
  answers: Record<string, unknown>;
  currentSection: number;
  totalSections: number;
  lastSaved: string; // ISO date
}

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
// Keys
// ---------------------------------------------------------------------------

const PROFILE_KEY = "pigeongov-profile";
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

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function getProfile(): ProfileData {
  return safeGet<ProfileData>(PROFILE_KEY) ?? {};
}

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
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${workflowId}`);
  } catch {
    // ignore
  }
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
    (a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime(),
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
    { date: "2026-04-15", label: "Federal tax return", daysRemaining: 0, urgency: "critical" },
    { date: "2026-07-01", label: "Student loan consolidation deadline (Parent PLUS)", daysRemaining: 0, urgency: "warning" },
    { date: "2026-09-30", label: "SAVE transition deadline", daysRemaining: 0, urgency: "warning" },
  ];

  for (const d of deadlines) {
    const target = new Date(d.date);
    d.daysRemaining = Math.max(
      0,
      Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
    if (d.daysRemaining <= 14) d.urgency = "critical";
    else if (d.daysRemaining <= 60) d.urgency = "warning";
    else d.urgency = "info";
  }

  return deadlines.filter((d) => d.daysRemaining >= 0).sort((a, b) => a.daysRemaining - b.daysRemaining);
}
