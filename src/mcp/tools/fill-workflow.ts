import { type InferSchema, type ToolMetadata } from "xmcp";

import { fillWorkflow, fillWorkflowInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  workflowId: fillWorkflowInputSchema.shape.workflowId,
  data: fillWorkflowInputSchema.shape.data,
};

export const metadata: ToolMetadata = {
  name: "fill-workflow",
  description: "Build a validated workflow bundle from structured workflow data.",
};

export default function fillWorkflowTool(args: InferSchema<typeof schema>): any {
  const bundle = fillWorkflow(args.workflowId, args.data);

  return withStructuredContent({
    ok: !bundle.validation.flaggedFields.some((flag) => flag.severity === "error"),
    workflowId: bundle.workflowId,
    domain: bundle.domain,
    review: bundle.review,
    validation: bundle.validation,
    flaggedFields: bundle.validation.flaggedFields,
    outputArtifacts: bundle.outputArtifacts,
    bundle,
  });
}
