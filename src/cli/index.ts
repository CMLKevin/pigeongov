import { Command } from "commander";

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

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("pigeongov")
    .description("Local-first CLI for government workflows, packets, and forms")
    .version("0.1.0");

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

  await program.parseAsync(argv);
}
