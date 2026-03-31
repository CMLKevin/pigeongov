import { fillFormInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";
import { buildValidated1040Bundle } from "../return-bundle.js";
import { generateForm1040Pdf } from "../../pdf/form-filler.js";

export const schema = fillFormInputSchema.shape;

export const metadata = {
  title: "Generate form PDF",
  description:
    "Generate a filled PDF for a government form (currently Form 1040). " +
    "Takes the same tax input as fill-form, builds the ReturnBundle, and " +
    "produces a PDF with all line items populated. Returns the PDF as a " +
    "base64-encoded string alongside metadata about filled/skipped fields.",
};

export default async function generateFormPdfTool(input: unknown): Promise<any> {
  const parsed = fillFormInputSchema.parse(input);

  if (parsed.formId !== "1040") {
    return withStructuredContent({
      ok: false,
      error: `PDF generation is currently only supported for Form 1040. Got: ${parsed.formId}`,
      formId: parsed.formId,
    });
  }

  const { bundle } = buildValidated1040Bundle(parsed.data);
  const result = await generateForm1040Pdf(bundle);

  return withStructuredContent({
    ok: true,
    formId: result.formId,
    mode: result.mode,
    filledFieldCount: result.filledFieldCount,
    skippedFieldCount: result.skippedFieldCount,
    flaggedFields: result.flaggedFields,
    pdfBase64: Buffer.from(result.pdfBytes).toString("base64"),
    pdfSizeBytes: result.pdfBytes.length,
  });
}
