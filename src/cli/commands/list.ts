import type { Command } from "commander";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { listWorkflowSummaries } from "../../workflows/registry.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List available PigeonGov workflows")
    .action(() => {
      const workflows = listWorkflowSummaries();
      if (isJsonMode()) {
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
