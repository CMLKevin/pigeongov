import type { WorkflowDeadline } from "../types.js";

/**
 * Filter deadlines to those in the future (relative to asOfDate) and sort ascending.
 */
export function getUpcomingDeadlines(
  deadlines: WorkflowDeadline[],
  asOfDate?: Date,
): WorkflowDeadline[] {
  const now = asOfDate ?? new Date();
  return deadlines
    .filter((d) => new Date(d.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Format a Date as an ICS DTSTART value: YYYYMMDDTHHMMSSZ
 */
function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}T000000Z`;
}

/**
 * Generate an ICS calendar file string from an array of deadlines.
 */
export function generateIcs(deadlines: WorkflowDeadline[]): string {
  const events = deadlines
    .map(
      (d) =>
        `BEGIN:VEVENT\r\nDTSTART:${formatIcsDate(d.date)}\r\nSUMMARY:${d.label}\r\nDESCRIPTION:${d.consequence}\r\nEND:VEVENT`,
    )
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PigeonGov//Deadlines//EN",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Hardcoded deadline data for existing workflows.
 */
export const DEFAULT_DEADLINES: WorkflowDeadline[] = [
  {
    workflowId: "tax/1040",
    label: "Tax filing deadline",
    date: "2026-04-15",
    type: "hard",
    consequence: "Late filing penalty of 5% per month on unpaid taxes",
    extensionAvailable: true,
  },
  {
    workflowId: "tax/1040",
    label: "Extension deadline",
    date: "2026-10-15",
    type: "hard",
    consequence: "No further extensions; penalties and interest accrue",
    extensionAvailable: false,
  },
  {
    workflowId: "immigration/family-visa-intake",
    label: "Apply as soon as eligible",
    date: "2099-12-31",
    type: "soft",
    consequence: "Processing times increase with backlogs; no fixed statutory deadline",
    extensionAvailable: false,
  },
  {
    workflowId: "healthcare/aca-enrollment",
    label: "Open Enrollment start",
    date: "2026-11-01",
    type: "hard",
    consequence: "Cannot enroll in marketplace plan outside open enrollment without a QLE",
    extensionAvailable: false,
  },
  {
    workflowId: "healthcare/aca-enrollment",
    label: "Open Enrollment end",
    date: "2027-01-15",
    type: "hard",
    consequence: "Cannot enroll in marketplace plan outside open enrollment without a QLE",
    extensionAvailable: false,
  },
  {
    workflowId: "unemployment/claim-intake",
    label: "File within 7 days of last day of work",
    date: "2026-12-31",
    type: "soft",
    consequence: "Benefits may be delayed or reduced if filed late; state-specific rules apply",
    extensionAvailable: false,
  },
];
