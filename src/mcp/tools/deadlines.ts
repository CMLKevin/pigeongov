import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";

import { withStructuredContent } from "../result.js";
import {
  DEFAULT_DEADLINES,
  getUpcomingDeadlines,
} from "../../workflows/deadlines.js";

export const schema = {
  workflowId: z.string().trim().min(1).optional(),
};

export const metadata: ToolMetadata = {
  name: "pigeongov-list-deadlines",
  description:
    "List upcoming deadlines for government workflows. Optionally filter by workflow ID.",
};

export default function listDeadlinesTool(
  args: InferSchema<typeof schema>,
): any {
  let deadlines = DEFAULT_DEADLINES;

  if (args.workflowId) {
    deadlines = deadlines.filter((d) => d.workflowId === args.workflowId);
  }

  const upcoming = getUpcomingDeadlines(deadlines);

  return withStructuredContent({
    ok: true,
    deadlines: upcoming,
    flaggedFields: [],
  });
}
