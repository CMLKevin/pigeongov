import { extractDocumentFromPath, extractDocumentInputSchema } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = extractDocumentInputSchema.shape;

export const metadata = {
  title: "Extract document",
  description: "Extract W-2 and 1099 source document data from a local PDF.",
};

export default async function extractDocumentTool(input: unknown): Promise<any> {
  const parsed = extractDocumentInputSchema.parse(input);
  const result = await extractDocumentFromPath(parsed.path, parsed.type);

  return withStructuredContent({
    ok: true,
    flaggedFields: result.flaggedFields,
    detectedType: result.documentType,
    confidence: result.confidence,
    document: result.extracted ?? { type: "unknown" },
    textPreview: result.text.slice(0, 500),
  });
}
