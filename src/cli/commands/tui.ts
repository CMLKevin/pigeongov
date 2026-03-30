import type { Command } from "commander";

import { launchTui } from "../tui.js";

export function registerTuiCommand(program: Command): void {
  program
    .command("tui [workflowId]")
    .description("Launch the full-screen PigeonGov terminal UI")
    .option("--year <year>", "Tax year", "2025")
    .option("--output <path>", "Output directory", ".")
    .option("--format <format>", "Output format", "json")
    .option("--import <paths...>", "Pre-import W-2/1099 PDFs before prompting")
    .option("--accessible", "Enable screen-reader friendly prompts")
    .option("--no-alt-screen", "Disable the full-screen terminal UI mode")
    .option("--cwd <path>", "Project root for the PigeonGov engine", process.cwd())
    .action(async (workflowId, options) => {
      await launchTui({
        formId: workflowId ? String(workflowId) : "",
        year: String(options.year),
        cwd: String(options.cwd),
        output: options.output ? String(options.output) : ".",
        format: options.format ? String(options.format) : "json",
        importPaths: (options.import ?? []).map((value: string) => String(value)),
        accessible: Boolean(options.accessible),
        noAltScreen: options.altScreen === false,
      });
    });
}
