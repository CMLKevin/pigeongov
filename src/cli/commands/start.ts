import type { Command } from "commander";

import { emitJson } from "../support.js";
import { describeWorkflow, getWorkflowStarterData, normalizeWorkflowId } from "../../workflows/registry.js";

export function registerStartCommand(program: Command): void {
  program
    .command("start <workflowId>")
    .description("Print starter data and metadata for a workflow")
    .action((workflowId) => {
      const normalizedId = normalizeWorkflowId(String(workflowId));
      emitJson({
        workflow: describeWorkflow(normalizedId),
        starterData: getWorkflowStarterData(normalizedId),
      });
    });
}
