import { type InferSchema, type ToolMetadata } from "xmcp";

import { startWorkflow, startWorkflowInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  workflowId: startWorkflowInputSchema.shape.workflowId,
};

export const metadata: ToolMetadata = {
  name: "start-workflow",
  description: "Return starter data for a workflow so an agent can begin collecting inputs.",
};

export default function startWorkflowTool(args: InferSchema<typeof schema>): any {
  return withStructuredContent({
    ok: true,
    ...startWorkflow(args.workflowId),
    flaggedFields: [],
  });
}
