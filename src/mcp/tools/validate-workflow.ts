import { type InferSchema, type ToolMetadata } from "xmcp";

import { fillWorkflow, validateWorkflowInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  workflowId: validateWorkflowInputSchema.shape.workflowId,
  bundle: validateWorkflowInputSchema.shape.bundle,
};

export const metadata: ToolMetadata = {
  name: "validate-workflow",
  description: "Validate a workflow bundle or workflow answers and return checks plus flagged fields.",
};

export default function validateWorkflowTool(args: InferSchema<typeof schema>): any {
  const bundle =
    typeof args.bundle.workflowId === "string"
      ? (args.bundle as never)
      : fillWorkflow(args.workflowId ?? "tax/1040", args.bundle);

  const validation = bundle.validation;

  return withStructuredContent({
    ok: !validation.flaggedFields.some((flag) => flag.severity === "error"),
    valid: !validation.flaggedFields.some((flag) => flag.severity === "error"),
    validationChecks: validation.checks,
    flaggedFields: validation.flaggedFields,
    bundle,
  });
}
