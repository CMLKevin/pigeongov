/**
 * OCR module backed by Tesseract.js.
 *
 * Provides text extraction from images as a fallback when a PDF's text
 * layer is empty or too short to be useful. Tesseract.js is a real
 * dependency — the availability check exists so callers can gracefully
 * degrade if the post-install build was skipped or something went awry.
 */

import type Tesseract from "tesseract.js";

let tesseractAvailable: boolean | null = null;

/**
 * Check whether `tesseract.js` can be dynamically imported in the
 * current environment. The result is cached after the first call.
 */
export function hasTesseract(): boolean {
  if (tesseractAvailable !== null) return tesseractAvailable;
  try {
    // tesseract.js is now a real dependency — this should always succeed
    // unless something catastrophic happened during install.
    require.resolve("tesseract.js");
    tesseractAvailable = true;
  } catch {
    tesseractAvailable = false;
  }
  return tesseractAvailable;
}

/**
 * Extract text from an image buffer using Tesseract.js OCR.
 *
 * Creates a short-lived worker, runs recognition, and tears it down.
 * Callers should check `hasTesseract()` first if they want to avoid
 * the error path, but this also throws a clear message if the module
 * is somehow missing.
 */
export async function ocrExtractText(imageBytes: Uint8Array): Promise<string> {
  if (!hasTesseract()) {
    throw new Error(
      "tesseract.js is not installed. Add it as a dependency (`pnpm add tesseract.js`) to enable OCR extraction.",
    );
  }

  // Dynamic import so the (fairly large) WASM payload only loads when
  // OCR is actually invoked — not on every CLI startup.
  const { createWorker } = (await import("tesseract.js")) as typeof Tesseract;
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(imageBytes);
    return text;
  } finally {
    await worker.terminate();
  }
}
