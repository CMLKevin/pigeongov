import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";

import { withStructuredContent } from "../result.js";
import {
  estimateCost,
  listAvailableCosts,
} from "../../advisory/cost/estimator.js";

export const schema = {
  workflowId: z.string().trim().min(1).optional(),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_estimate_cost",
  description:
    "Estimate the cost of a government workflow — compares DIY filing fees, PigeonGov (free), and hiring an attorney. Omit workflowId to list available workflows.",
};

export default function estimateCostTool(
  args: InferSchema<typeof schema>,
): any {
  if (!args.workflowId) {
    const available = listAvailableCosts();
    return withStructuredContent({
      ok: true,
      available,
      flaggedFields: [],
    });
  }

  const estimate = estimateCost(args.workflowId);

  if (!estimate) {
    return withStructuredContent({
      ok: false,
      error: `No cost data for workflow: ${args.workflowId}`,
      available: listAvailableCosts(),
      flaggedFields: [],
    });
  }

  return withStructuredContent({
    ok: true,
    estimate,
    flaggedFields: [],
  });
}
