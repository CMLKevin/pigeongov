import type { Command } from "commander";

import { readPdfDocument } from "../../pdf/reader.js";

export function registerExtractCommand(program: Command): void {
  program
    .command("extract <pdf>")
    .description("Extract structured data from a W-2 or 1099 PDF")
    .option("--type <type>", "Document type hint")
    .action(async (pdf, options) => {
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
    });
}
