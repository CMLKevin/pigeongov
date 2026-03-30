import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";

import { withStructuredContent } from "../result.js";
import {
  DEFAULT_FEES,
  getWorkflowFees,
  calculateTotalFees,
} from "../../workflows/fees.js";

export const schema = {
  workflowId: z.string().trim().min(1).optional(),
};

export const metadata: ToolMetadata = {
  name: "pigeongov-list-fees",
  description:
    "List fees associated with government workflows. Optionally filter by workflow ID.",
};

export default function listFeesTool(
  args: InferSchema<typeof schema>,
): any {
  let fees = DEFAULT_FEES;

  if (args.workflowId) {
    fees = getWorkflowFees(fees, args.workflowId);
  }

  const total = calculateTotalFees(fees);

  return withStructuredContent({
    ok: true,
    fees,
    total,
    flaggedFields: [],
  });
}
