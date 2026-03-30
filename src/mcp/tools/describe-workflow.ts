import { type InferSchema, type ToolMetadata } from "xmcp";

import { describeWorkflowDefinition, describeWorkflowInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  workflowId: describeWorkflowInputSchema.shape.workflowId,
};

export const metadata: ToolMetadata = {
  name: "describe-workflow",
  description: "Describe a workflow schema, starter data, and guided sections.",
};

export default function describeWorkflowTool(
  args: InferSchema<typeof schema>,
): any {
  return withStructuredContent({
    ...describeWorkflowDefinition(args.workflowId),
    flaggedFields: [],
  });
}
