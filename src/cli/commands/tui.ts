import type { Command } from "commander";

import { launchTui } from "../tui.js";

export function registerTuiCommand(program: Command): void {
  program
    .command("tui [workflowId]")
    .description("Launch the full-screen PigeonGov terminal UI")
    .option("--output <path>", "Output directory", ".")
    .option("--format <format>", "Output format", "json")
    .option("--accessible", "Enable screen-reader friendly prompts")
    .option("--no-alt-screen", "Disable the full-screen terminal UI mode")
    .option("--cwd <path>", "Project root for the PigeonGov engine", process.cwd())
    .action(async (workflowId, options) => {
      await launchTui({
        formId: workflowId ? String(workflowId) : "",
        cwd: String(options.cwd),
        output: options.output ? String(options.output) : ".",
        format: options.format ? String(options.format) : "json",
        accessible: Boolean(options.accessible),
        noAltScreen: options.altScreen === false,
      });
    });
}
