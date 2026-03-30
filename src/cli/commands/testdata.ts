import type { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { generateRandomInput } from "../../testing/synthetic.js";

export function registerTestdataCommand(program: Command): void {
  program
    .command("testdata <workflow-id>")
    .description("Generate synthetic test fixtures for a workflow")
    .option("-n, --count <n>", "Number of fixtures to generate", "5")
    .option("-s, --seed <seed>", "PRNG seed for reproducibility", "42")
    .option("-o, --output <dir>", "Output directory for JSON files")
    .option("--json", "Print fixtures to stdout as JSON")
    .action((workflowId: string, options) => {
      const count = Number(options.count) || 5;
      const baseSeed = Number(options.seed) || 42;

      const fixtures: Record<string, unknown>[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const input = generateRandomInput(workflowId, baseSeed + i);
          fixtures.push(input);
        } catch (err) {
          console.error(
            chalk.red(
              `Failed to generate fixture ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
          process.exitCode = 1;
          return;
        }
      }

      // JSON mode: print to stdout
      if (options.json) {
        emitJson({ workflowId, seed: baseSeed, count, fixtures });
        return;
      }

      // File output mode
      if (options.output) {
        const outDir = path.resolve(options.output as string);
        if (!existsSync(outDir)) {
          mkdirSync(outDir, { recursive: true });
        }

        const safeId = workflowId.replace(/\//g, "-");
        for (let i = 0; i < fixtures.length; i++) {
          const filename = `${safeId}-fixture-${String(i + 1).padStart(3, "0")}.json`;
          const filePath = path.join(outDir, filename);
          writeFileSync(filePath, JSON.stringify(fixtures[i], null, 2), "utf-8");
        }

        console.log(
          chalk.green(
            `Generated ${fixtures.length} fixture${fixtures.length === 1 ? "" : "s"} in ${outDir}`,
          ),
        );
        return;
      }

      // Default: print summary to terminal
      console.log(
        chalk.bold(
          `Generated ${fixtures.length} test fixture${fixtures.length === 1 ? "" : "s"} for ${workflowId}`,
        ),
      );
      console.log(chalk.dim(`Seed: ${baseSeed}, Count: ${count}`));
      console.log();

      for (let i = 0; i < fixtures.length; i++) {
        console.log(chalk.cyan(`--- Fixture ${i + 1} ---`));
        console.log(JSON.stringify(fixtures[i], null, 2));
        console.log();
      }
    });
}
