import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { checkCaseStatus, getProcessingTimeEstimate } from "../../advisory/tracker/uscis.js";

export const schema = {
  receiptNumber: z
    .string()
    .trim()
    .min(1)
    .describe("USCIS receipt number (3 uppercase letters + 10 digits, e.g., EAC2590012345)"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_track_case",
  description:
    "Check the status of a USCIS immigration case by receipt number. This is the ONLY tool in PigeonGov that makes a network call — it contacts the USCIS case status API and falls back to offline processing time estimates on failure.",
};

export default async function trackCaseTool(args: { receiptNumber: string }) {
  try {
    const result = await checkCaseStatus(args.receiptNumber);

    return withStructuredContent({
      ok: true,
      ...result,
    });
  } catch (err) {
    // Validation error (bad receipt format)
    return withStructuredContent({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      receiptNumber: args.receiptNumber,
    });
  }
}
