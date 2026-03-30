import { type InferSchema, type ToolMetadata } from "xmcp";

import { describeForm, describeFormInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {
  formId: describeFormInputSchema.shape.formId,
  taxYear: describeFormInputSchema.shape.taxYear,
};

export const metadata: ToolMetadata = {
  name: "describe-form",
  description: "Return a field-level description of a supported form schema.",
  annotations: {
    title: "Describe form",
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
  },
};

export default async function describeFormTool(args: InferSchema<typeof schema>): Promise<any> {
  return withStructuredContent({
    ...describeForm(args.formId),
    flaggedFields: [],
  });
}
