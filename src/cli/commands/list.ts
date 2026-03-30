import type { Command } from "commander";

import { emitJson } from "../support.js";
import { listWorkflowSummaries } from "../../workflows/registry.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List available PigeonGov workflows")
    .option("--json", "Print JSON output")
    .action((options) => {
      const workflows = listWorkflowSummaries();
      if (options.json) {
        emitJson({ workflows });
        return;
      }

      for (const workflow of workflows) {
        console.log(
          `${workflow.id}\t${workflow.title}\t${workflow.domain}\t${workflow.status}`,
        );
      }
    });
}
