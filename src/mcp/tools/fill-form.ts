import {
  fillFormInputSchema,
} from "../shared.js";
import { withStructuredContent } from "../result.js";
import { buildValidated1040Bundle } from "../return-bundle.js";

export const schema = fillFormInputSchema.shape;

export const metadata = {
  title: "Fill form",
  description: "Build a validated form bundle from structured data and optional source documents.",
};

export default function fillFormTool(input: unknown): any {
  const parsed = fillFormInputSchema.parse(input);
  const validationBundle =
    parsed.formId === "1040" ? buildValidated1040Bundle(parsed.data) : undefined;

  if (parsed.formId !== "1040") {
    return withStructuredContent({
      ok: true,
      formId: parsed.formId,
      taxYear: parsed.taxYear ?? 2025,
      flaggedFields: [],
      calculation: undefined,
      validation: {
        validationChecks: [],
        flaggedFields: [],
      },
      filledForm: {
        formId: parsed.formId,
        taxYear: parsed.taxYear ?? 2025,
        data: parsed.data,
      },
    });
  }

  const { calculation, bundle, validation } = validationBundle!;

  return withStructuredContent({
    ok: true,
    formId: parsed.formId,
    taxYear: parsed.taxYear ?? 2025,
    flaggedFields: validation.flaggedFields,
    calculation,
    validation: {
      validationChecks: validation.checks,
      flaggedFields: validation.flaggedFields,
    },
    filledForm: {
      ...bundle,
      calculation,
    },
  });
}
