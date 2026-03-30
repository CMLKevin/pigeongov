import { type InferSchema, type ToolMetadata } from "xmcp";

import { explainFlag, explainFlagInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  bundle: explainFlagInputSchema.shape.bundle,
  field: explainFlagInputSchema.shape.field,
};

export const metadata: ToolMetadata = {
  name: "explain-flag",
  description: "Explain a flagged field from a workflow bundle and suggest a next step.",
};

export default function explainFlagTool(args: InferSchema<typeof schema>): any {
  const result = explainFlag(args.bundle, args.field);
  return withStructuredContent({
    ok: result.found,
    flaggedFields: [],
    ...result,
  });
}
