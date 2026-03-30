import {
  reviewTaxInput,
  calculateTaxInputSchema,
} from "../shared.js";
import { withStructuredContent } from "../result.js";
import { buildValidated1040Bundle } from "../return-bundle.js";

export const schema = calculateTaxInputSchema.shape;

export const metadata = {
  title: "Review form",
  description: "Generate a human-readable review summary for a filled form.",
};

export default function reviewFormTool(input: unknown): any {
  const parsed = calculateTaxInputSchema.parse(input);
  const taxReview = reviewTaxInput(parsed.data);
  const validationBundle = buildValidated1040Bundle(parsed.data);

  return withStructuredContent({
    ok: true,
    flaggedFields: validationBundle.validation.flaggedFields,
    summary: {
      headline: taxReview.headline,
      notes: taxReview.notes,
      flaggedFields: validationBundle.validation.flaggedFields,
    },
    validationChecks: validationBundle.validation.checks,
    calculation: taxReview.calculation,
    parsed: parsed.data,
  });
}
