import { readFile, writeFile } from "node:fs/promises";
import type { Command } from "commander";

import { mergePdfs } from "../../pdf/merge.js";
import type { MergeInput } from "../../pdf/merge.js";

export function registerMergeCommand(program: Command): void {
  program
    .command("merge <files...>")
    .description("Merge multiple PDF files into a single document")
    .requiredOption("--output <path>", "Output file path")
    .option("--title <title>", "Cover page title")
    .option("--subtitle <subtitle>", "Cover page subtitle")
    .action(async (files: string[], options: { output: string; title?: string; subtitle?: string }) => {
      const inputs: MergeInput[] = await Promise.all(
        files.map(async (filePath) => {
          const bytes = new Uint8Array(await readFile(filePath));
          const label = filePath.split(/[\\/]/).at(-1) ?? filePath;
          return { label, bytes };
        }),
      );

      const merged = await mergePdfs(inputs, {
        coverTitle: options.title,
        coverSubtitle: options.subtitle,
      });

      await writeFile(options.output, merged);
      console.log(`Merged ${files.length} PDFs into ${options.output}`);
    });
}
