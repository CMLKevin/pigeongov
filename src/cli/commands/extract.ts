import type { Command } from "commander";

import { readPdfDocument } from "../../pdf/reader.js";
import { PigeonGovError, CLI_EXIT_CODES } from "../support.js";
import { emitError } from "../output.js";

export function registerExtractCommand(program: Command): void {
  program
    .command("extract <pdf>")
    .description("Extract structured data from a W-2 or 1099 PDF")
    .option("--type <type>", "Document type hint")
    .action(async (pdf, options) => {
      try {
        const result = await readPdfDocument(pdf, options.type ? { typeHint: options.type } : {});
        console.log(
          JSON.stringify(
            {
              detectedType: result.detectedType,
              confidence: result.confidence,
              document: result.document,
              flaggedFields: result.flaggedFields,
            },
            null,
            2,
          ),
        );
      } catch (err: unknown) {
        if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
          emitError(
            new PigeonGovError({
              code: "not_found",
              message: `File not found: ${pdf}`,
              exitCode: CLI_EXIT_CODES.notFound,
            }),
          );
        } else {
          throw new PigeonGovError({
            code: "runtime_error",
            message: err instanceof Error ? err.message : String(err),
            exitCode: CLI_EXIT_CODES.runtimeError,
          });
        }
      }
    });
}
