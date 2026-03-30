import type { CaseStatus } from "../../types.js";
import { getProcessingTime } from "./types.js";

const RECEIPT_PATTERN = /^[A-Z]{3}\d{10}$/;

/**
 * Infer form type from a USCIS receipt number prefix.
 * The 3-letter prefix identifies the service center, not the form --
 * but we can pair it with any user-supplied form type hint.
 */
function inferFormType(receiptNumber: string, formTypeHint?: string): string {
  if (formTypeHint) return formTypeHint.toUpperCase().trim();
  // Without a hint we can't determine the form from the receipt alone
  return "UNKNOWN";
}

/**
 * Build an offline-mode CaseStatus with processing time estimates.
 */
function offlineFallback(receiptNumber: string, formType: string): CaseStatus {
  const pt = getProcessingTime(formType);
  return {
    receiptNumber,
    formType,
    status: "OFFLINE",
    statusDescription:
      "Unable to reach USCIS servers. Showing offline processing time estimates instead.",
    lastUpdated: new Date().toISOString(),
    processingTime: pt
      ? {
          percentile50: pt.percentile50,
          percentile75: pt.percentile75,
          percentile90: pt.percentile90,
        }
      : undefined,
  };
}

/**
 * Check the status of a USCIS case by receipt number.
 *
 * This is the only function in PigeonGov that makes a real network call.
 * On any failure (timeout, bad response, network error) it falls back
 * to offline mode with processing time estimates.
 */
export async function checkCaseStatus(
  receiptNumber: string,
  formTypeHint?: string,
): Promise<CaseStatus> {
  const normalized = receiptNumber.toUpperCase().trim();
  const formType = inferFormType(normalized, formTypeHint);

  if (!RECEIPT_PATTERN.test(normalized)) {
    throw new Error(
      `Invalid receipt number "${receiptNumber}". Must be 3 uppercase letters followed by 10 digits (e.g., EAC2590012345).`,
    );
  }

  try {
    const response = await fetch("https://egov.uscis.gov/csol-api/case-statuses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        caseStatusRequest: {
          receiptNumber: normalized,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return offlineFallback(normalized, formType);
    }

    const data = (await response.json()) as Record<string, unknown>;

    // The USCIS API nests the status inside CaseStatusResponse
    const caseData = (data?.CaseStatusResponse ?? data) as Record<string, unknown>;
    const detailsArray = caseData?.detailsEng as Record<string, unknown>[] | undefined;
    const details = detailsArray?.[0] ?? caseData;

    const status = String(details?.actionCodeText ?? details?.status ?? "UNKNOWN");
    const description = String(
      details?.actionCodeDesc ?? details?.statusDescription ?? "",
    );

    const pt = getProcessingTime(formType);

    return {
      receiptNumber: normalized,
      formType,
      status,
      statusDescription: description,
      lastUpdated: new Date().toISOString(),
      processingTime: pt
        ? {
            percentile50: pt.percentile50,
            percentile75: pt.percentile75,
            percentile90: pt.percentile90,
          }
        : undefined,
    };
  } catch {
    // Network error, timeout, parse error -- fall back gracefully
    return offlineFallback(normalized, formType);
  }
}

/**
 * Get processing time estimates for a form type (offline only, no network).
 */
export function getProcessingTimeEstimate(
  formType: string,
): {
  formType: string;
  formTitle: string;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  lastUpdated: string;
} | null {
  return getProcessingTime(formType);
}
