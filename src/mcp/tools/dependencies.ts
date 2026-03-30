import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";

import { withStructuredContent } from "../result.js";
import { getDependencies } from "../../advisory/dependencies/graph.js";

export const schema = {
  workflowId: z.string().trim().min(1).describe("The workflow ID to look up dependencies for (e.g., immigration/naturalization)"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_get_dependencies",
  description:
    "Returns the cross-agency dependency graph for a given workflow. Shows which workflows are triggered, required, affected, or invalidated — both downstream (what this workflow causes) and upstream (what feeds into this workflow).",
};

export default function getDependenciesTool(
  args: InferSchema<typeof schema>,
): any {
  const chain = getDependencies(args.workflowId);

  return withStructuredContent({
    ok: true,
    ...chain,
  });
}
