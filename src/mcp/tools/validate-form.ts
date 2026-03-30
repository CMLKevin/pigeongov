import {
  validateFormInputSchema,
} from "../shared.js";
import { withStructuredContent } from "../result.js";
import { buildValidated1040Bundle } from "../return-bundle.js";

export const schema = validateFormInputSchema.shape;

export const metadata = {
  title: "Validate form",
  description: "Validate a filled form payload and return checks plus flagged fields.",
};

export default function validateFormTool(input: unknown): any {
  const parsed = validateFormInputSchema.parse(input);
  const validationBundle =
    parsed.formId === "1040" ? buildValidated1040Bundle(parsed.data) : undefined;

  if (parsed.formId !== "1040") {
    return withStructuredContent({
      ok: true,
      valid: true,
      validationChecks: [],
      flaggedFields: [],
      parsed: parsed.data,
    });
  }

  const { validation } = validationBundle!;

  return withStructuredContent({
    ok: validation.flaggedFields.every((flag) => flag.severity !== "error"),
    valid: validation.flaggedFields.every((flag) => flag.severity !== "error"),
    validationChecks: validation.checks,
    flaggedFields: validation.flaggedFields,
    parsed: parsed.data,
  });
}
