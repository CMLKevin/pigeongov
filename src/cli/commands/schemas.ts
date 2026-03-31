import type { Command } from "commander";

import { emit } from "../output.js";
import { describeWorkflow, normalizeWorkflowId } from "../../workflows/registry.js";

export function registerSchemasCommand(program: Command): void {
  const schemas = program.command("schemas").description("Inspect workflow schemas");

  schemas
    .command("describe <workflowId>")
    .description("Describe the workflow schema, sections, and starter data")
    .action((workflowId) => {
      const normalizedId = normalizeWorkflowId(String(workflowId));
      emit(describeWorkflow(normalizedId));
    });
}
