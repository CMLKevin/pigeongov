import type { PdfReadOptions, PdfReadResult } from "./shared.js";
import { readPdfDocument } from "./reader.js";

export interface BatchExtractResult {
  path: string;
  status: "ok" | "error";
  result?: PdfReadResult;
  error?: string;
}

export async function batchExtract(
  paths: string[],
  options?: Omit<PdfReadOptions, "fileName">,
): Promise<BatchExtractResult[]> {
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(path);
      const result = await readPdfDocument(bytes, { ...options, fileName: path });
      return { path, status: "ok" as const, result };
    }),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { path: paths[i]!, status: "error" as const, error: String(r.reason) };
  });
}
