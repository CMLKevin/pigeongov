/**
 * OCR module stub.
 *
 * Provides an interface for Tesseract.js-based OCR as a fallback when
 * text-layer PDF extraction returns nothing useful. Tesseract.js is NOT
 * an installed dependency yet -- this module checks availability at
 * runtime and throws a clear error if it is absent.
 */

let _tesseractAvailable: boolean | undefined;

/**
 * Check whether `tesseract.js` can be dynamically imported in the
 * current environment. The result is cached after the first call.
 */
export function hasTesseract(): boolean {
  if (_tesseractAvailable !== undefined) {
    return _tesseractAvailable;
  }

  try {
    // Attempt a synchronous require-resolve check.
    // We intentionally avoid top-level import so the rest of the PDF
    // pipeline never blows up when Tesseract is missing.
    require.resolve("tesseract.js");
    _tesseractAvailable = true;
  } catch {
    _tesseractAvailable = false;
  }

  return _tesseractAvailable;
}

/**
 * Extract text from an image buffer using Tesseract.js OCR.
 *
 * @throws If `tesseract.js` is not installed.
 */
export async function ocrExtractText(imageBytes: Uint8Array): Promise<string> {
  if (!hasTesseract()) {
    throw new Error(
      "tesseract.js is not installed. Add it as a dependency (`pnpm add tesseract.js`) to enable OCR extraction.",
    );
  }

  // Dynamic import so the module is only loaded when actually called.
  // The module may not be installed, so we use a runtime-only path.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const Tesseract = (await Function('return import("tesseract.js")')()) as {
    createWorker: (lang: string) => Promise<{
      recognize: (input: Uint8Array) => Promise<{ data: { text: string } }>;
      terminate: () => Promise<void>;
    }>;
  };
  const worker = await Tesseract.createWorker("eng");
  try {
    const { data } = await worker.recognize(imageBytes);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
