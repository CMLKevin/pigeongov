import { type InferSchema, type ToolMetadata } from "xmcp";

import { reviewWorkflow, reviewWorkflowInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  workflowId: reviewWorkflowInputSchema.shape.workflowId,
  bundle: reviewWorkflowInputSchema.shape.bundle,
};

export const metadata: ToolMetadata = {
  name: "review-workflow",
  description: "Generate a human-readable review summary for a workflow bundle or structured input.",
};

export default function reviewWorkflowTool(args: InferSchema<typeof schema>): any {
  const result =
    typeof args.bundle.workflowId === "string"
      ? {
          bundle: args.bundle,
          review: (args.bundle as { review: unknown }).review,
          validation: (args.bundle as { validation: unknown }).validation,
        }
      : reviewWorkflow(args.workflowId ?? "tax/1040", args.bundle);

  return withStructuredContent({
    ok: true,
    summary: result.review,
    validation: result.validation,
    flaggedFields: (result.validation as { flaggedFields: unknown[] }).flaggedFields,
    bundle: result.bundle,
  });
}
