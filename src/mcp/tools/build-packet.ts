import { type InferSchema, type ToolMetadata } from "xmcp";

import { fillWorkflow, buildPacketInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  workflowId: buildPacketInputSchema.shape.workflowId,
  data: buildPacketInputSchema.shape.data,
};

export const metadata: ToolMetadata = {
  name: "build-packet",
  description: "Build a workflow packet summary with output artifact metadata for local saving.",
};

export default function buildPacketTool(args: InferSchema<typeof schema>): any {
  const bundle = fillWorkflow(args.workflowId, args.data);

  return withStructuredContent({
    ok: true,
    workflowId: bundle.workflowId,
    outputArtifacts: bundle.outputArtifacts,
    review: bundle.review,
    validation: bundle.validation,
    flaggedFields: bundle.validation.flaggedFields,
    bundle,
  });
}
