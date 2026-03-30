import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildReviewFooter, createReviewPdf, summarizeReviewSections } from "../pdf/writer.js";
import type { WorkflowArtifactFormat, WorkflowBundle } from "../types.js";

function workflowBaseName(bundle: WorkflowBundle): string {
  if (bundle.legacyFormId === "1040" && bundle.year === 2025) {
    return "1040-2025-filled";
  }

  return `${bundle.workflowId.replace(/[^\w]+/g, "-")}-bundle`;
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

  if (format === "json" || format === "both") {
    await writeFile(jsonPath, JSON.stringify(bundle, null, 2));
    saved.push(jsonPath);
  }

  if (format === "pdf" || format === "both") {
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
  }

  return saved;
}

export async function loadWorkflowBundle(filePath: string): Promise<WorkflowBundle> {
  return JSON.parse(await readFile(filePath, "utf8")) as WorkflowBundle;
}
