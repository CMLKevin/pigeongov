/**
 * Share link encoding / decoding.
 *
 * The premise: you should be able to share your action plan with a friend,
 * a caseworker, or a very patient relative without accidentally revealing
 * your SSN, exact income, or home address. The link encodes the shape of
 * your plan — deadlines, program names, phase labels — but strips
 * everything that would make an identity thief's day.
 *
 * Since we have no backend, the data lives in the URL hash as base64-encoded
 * JSON. Crude? Yes. But it means zero server infrastructure and the share
 * link works entirely client-side. In production you'd use lz-string for
 * compression, but base64 is perfectly adequate for a prototype.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShareableActionItem {
  id: string;
  label: string;
  deadline?: string;
  status: "urgent" | "active" | "pending" | "complete";
  phase: number;
  phaseLabel: string;
}

export interface ShareableData {
  /** Display title (e.g., "Job Loss Action Plan") */
  title: string;
  /** Which workflow / life event produced this */
  source: string;
  /** Action items — the core of what's being shared */
  items: ShareableActionItem[];
  /** Benefit program names (no dollar amounts) */
  programs?: string[];
  /** Flags / labels (e.g., "urgent", "cliff detected") */
  flags?: string[];
  /** When the share was created */
  createdAt: string;
  /** Display name or "Anonymous" */
  sharedBy: string;
  /** Expiration date (ISO string) */
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Sensitive field patterns — anything matching these gets stripped
// ---------------------------------------------------------------------------

const SENSITIVE_PATTERNS = [
  /ssn/i,
  /social.?security/i,
  /tax.?id/i,
  /ein/i,
  /itin/i,
  /address/i,
  /street/i,
  /zip/i,
  /phone/i,
  /email/i,
  /bank/i,
  /account/i,
  /routing/i,
  /password/i,
  /income/i,
  /salary/i,
  /wage/i,
  /agi/i,
  /gross/i,
  /net.?pay/i,
];

/**
 * Returns true if a key name looks like it might contain sensitive data.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

// ---------------------------------------------------------------------------
// Strip sensitive data from an arbitrary object
// ---------------------------------------------------------------------------

export function stripSensitive(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) continue;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = stripSensitive(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Encode / Decode
// ---------------------------------------------------------------------------

export function encodeShareData(data: ShareableData): string {
  const json = JSON.stringify(data);
  // In production: use lz-string for compression
  if (typeof window !== "undefined") {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, "utf-8").toString("base64");
}

export function decodeShareData(encoded: string): ShareableData | null {
  try {
    let json: string;
    if (typeof window !== "undefined") {
      json = decodeURIComponent(escape(atob(encoded)));
    } else {
      json = Buffer.from(encoded, "base64").toString("utf-8");
    }
    const parsed = JSON.parse(json) as ShareableData;

    // Validate expiration
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      return null; // expired
    }

    // Basic shape validation
    if (!parsed.title || !Array.isArray(parsed.items)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generate share URL
// ---------------------------------------------------------------------------

export function generateShareUrl(data: ShareableData): string {
  const encoded = encodeShareData(data);
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://pigeongov.vercel.app";
  return `${base}/share#${encoded}`;
}

// ---------------------------------------------------------------------------
// Format expiration
// ---------------------------------------------------------------------------

export function formatExpiration(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Create a default expiration date (7 days from now).
 */
export function defaultExpiration(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}
