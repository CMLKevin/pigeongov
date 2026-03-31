import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildReviewFooter, createReviewPdf, summarizeReviewSections } from "../pdf/writer.js";
import { generateForm1040Pdf } from "../pdf/form-filler.js";
import type { ReturnBundle } from "../engine/field-mapper.js";
import type { WorkflowArtifactFormat, WorkflowBundle } from "../types.js";

function workflowBaseName(bundle: WorkflowBundle): string {
  if (bundle.legacyFormId === "1040" && bundle.year === 2025) {
    return "1040-2025-filled";
  }

  return `${bundle.workflowId.replace(/[^\w]+/g, "-")}-bundle`;
}

/**
 * Attempt to extract a ReturnBundle from a WorkflowBundle.
 * The WorkflowBundle stores the ReturnBundle fields at the top level
 * via its `filledForm` and `calculation` properties when the legacy
 * formId is "1040".
 */
function extractReturnBundle(bundle: WorkflowBundle): ReturnBundle | undefined {
  if (bundle.legacyFormId !== "1040") return undefined;

  const filled = bundle.filledForm as Record<string, unknown> | undefined;
  if (!filled || !("form1040" in filled) || !("calculation" in filled)) {
    return undefined;
  }

  return filled as unknown as ReturnBundle;
}

export async function saveWorkflowBundle(
  bundle: WorkflowBundle,
  outputDir: string,
  format: WorkflowArtifactFormat | "both",
): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });
  const saved: string[] = [];
  const baseName = workflowBaseName(bundle);
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);
  const formPdfPath = path.join(outputDir, `${baseName}-form.pdf`);

  if (format === "json" || format === "both") {
    await writeFile(jsonPath, JSON.stringify(bundle, null, 2));
    saved.push(jsonPath);
  }

  if (format === "pdf" || format === "both") {
    // Generate the review PDF (always)
    const pdfBytes = await createReviewPdf({
      headline: bundle.review.headline,
      title: `${bundle.title} review`,
      subtitle: bundle.summary,
      notes: bundle.review.notes,
      flaggedFields: bundle.validation.flaggedFields,
      sections: summarizeReviewSections(bundle.review),
      footer: buildReviewFooter(bundle.validation.flaggedFields),
    });
    await writeFile(pdfPath, pdfBytes);
    saved.push(pdfPath);

    // For 1040 bundles, also generate the Form 1040 PDF
    const returnBundle = extractReturnBundle(bundle);
    if (returnBundle) {
      try {
        const formResult = await generateForm1040Pdf(returnBundle);
        await writeFile(formPdfPath, formResult.pdfBytes);
        saved.push(formPdfPath);
      } catch {
        // Form PDF generation is best-effort; the review PDF is the primary artifact.
        // Silently skip — the user still gets the review PDF and JSON bundle.
      }
    }
  }

  return saved;
}

export async function loadWorkflowBundle(filePath: string): Promise<WorkflowBundle> {
  return JSON.parse(await readFile(filePath, "utf8")) as WorkflowBundle;
}
