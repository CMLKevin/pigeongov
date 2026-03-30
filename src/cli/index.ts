import { Command, Option } from "commander";
import { initOutputContext } from "./output.js";

import { registerExtractCommand } from "./commands/extract.js";
import { registerFillCommand } from "./commands/fill.js";
import { registerListCommand } from "./commands/list.js";
import { registerMachineCommand } from "./commands/machine.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerReviewCommand } from "./commands/review.js";
import { registerSchemasCommand } from "./commands/schemas.js";
import { registerServeCommand } from "./commands/serve.js";
import { registerStartCommand } from "./commands/start.js";
import { registerTuiCommand } from "./commands/tui.js";
import { registerValidateCommand } from "./commands/validate.js";
import { registerWorkflowsCommand } from "./commands/workflows.js";
import { registerDraftsCommand } from "./commands/drafts.js";
import { registerVaultCommand } from "./commands/vault.js";
import { registerProfileCommand } from "./commands/profile.js";
import { registerDeadlinesCommand } from "./commands/deadlines.js";
import { registerFeesCommand } from "./commands/fees.js";
import { registerGlossaryCommand } from "./commands/glossary.js";
import { registerPluginCommand } from "./commands/plugin.js";
import { registerScaffoldCommand } from "./commands/scaffold.js";
import { registerTestdataCommand } from "./commands/testdata.js";
import { registerCompletionsCommand } from "./commands/completions.js";
import { registerStatsCommand } from "./commands/stats.js";
import { registerLifeEventCommand } from "./commands/life-event.js";
import { registerScreenCommand } from "./commands/screen.js";
import { registerMergeCommand } from "./commands/merge.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("pigeongov")
    .description("Local-first CLI for government workflows, packets, and forms")
    .version("0.2.0");

  // Global output options
  program.addOption(new Option("--json", "Output structured JSON to stdout").default(false));
  program.addOption(new Option("--jsonl", "Output one JSON object per line (streaming)").default(false));
  program.addOption(new Option("--compact", "Minimal JSON output (no pretty-printing)").default(false));
  program.addOption(new Option("--full", "Include all fields in output (no truncation)").default(false));
  program.addOption(new Option("--fields <fields>", "Comma-separated fields to include in output"));
  program.addOption(new Option("--non-interactive", "Disable all interactive prompts").default(false));
  program.addOption(new Option("--yes", "Auto-confirm all prompts").default(false));
  program.addOption(new Option("--dry-run", "Show what would happen without doing it").default(false));
  program.addOption(new Option("--quiet", "Suppress non-essential output").default(false));
  program.addOption(new Option("--stdin", "Read input from stdin").default(false));
  program.addOption(new Option("--locale <locale>", "Set locale (en, es, zh-CN)").default("en"));

  // Initialize output context before any command runs
  program.hook("preAction", (_thisCommand, actionCommand) => {
    const opts = actionCommand.optsWithGlobals();
    initOutputContext({
      json: opts.json,
      jsonl: opts.jsonl,
      compact: opts.compact,
      full: opts.full,
      fields: opts.fields,
      nonInteractive: opts.nonInteractive || opts.yes,
      dryRun: opts.dryRun,
      quiet: opts.quiet,
    });
  });

  registerFillCommand(program);
  registerValidateCommand(program);
  registerReviewCommand(program);
  registerListCommand(program);
  registerExtractCommand(program);
  registerMachineCommand(program);
  registerStartCommand(program);
  registerWorkflowsCommand(program);
  registerSchemasCommand(program);
  registerDoctorCommand(program);
  registerTuiCommand(program);
  registerServeCommand(program);
  registerDraftsCommand(program);
  registerVaultCommand(program);
  registerProfileCommand(program);
  registerDeadlinesCommand(program);
  registerFeesCommand(program);
  registerGlossaryCommand(program);
  registerPluginCommand(program);
  registerScaffoldCommand(program);
  registerTestdataCommand(program);
  registerCompletionsCommand(program);
  registerStatsCommand(program);
  registerLifeEventCommand(program);
  registerScreenCommand(program);
  registerMergeCommand(program);

  await program.parseAsync(argv);
}
