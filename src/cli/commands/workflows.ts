import type { Command } from "commander";

import { emitJson } from "../support.js";
import { listDomains, listWorkflowSummaries } from "../../workflows/registry.js";

export function registerWorkflowsCommand(program: Command): void {
  const workflows = program
    .command("workflows")
    .description("Browse the PigeonGov workflow catalog");

  workflows
    .command("list")
    .description("List available workflows")
    .option("--domain <domain>", "Filter by domain")
    .option("--json", "Print JSON output")
    .action((options) => {
      const items = listWorkflowSummaries(
        options.domain ? { domain: String(options.domain) as never } : undefined,
      );
      if (options.json) {
        emitJson({ domains: listDomains(), workflows: items });
        return;
      }

      for (const item of items) {
        console.log(`${item.id}\t${item.domain}\t${item.status}\t${item.title}`);
      }
    });
}
