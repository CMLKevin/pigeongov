import type { Command } from "commander";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { listDomains, listWorkflowSummaries } from "../../workflows/registry.js";

export function registerWorkflowsCommand(program: Command): void {
  const workflows = program
    .command("workflows")
    .description("Browse the PigeonGov workflow catalog");

  workflows
    .command("list")
    .description("List available workflows")
    .option("--domain <domain>", "Filter by domain")
    .action((options) => {
      const items = listWorkflowSummaries(
        options.domain ? { domain: String(options.domain) as never } : undefined,
      );
      if (isJsonMode()) {
        emitJson({ domains: listDomains(), workflows: items });
        return;
      }

      // Group by domain
      const byDomain = new Map<string, typeof items>();
      for (const wf of items) {
        const existing = byDomain.get(wf.domain);
        if (existing) {
          existing.push(wf);
        } else {
          byDomain.set(wf.domain, [wf]);
        }
      }

      const domainCount = byDomain.size;

      console.log("");
      console.log(
        chalk.bold(`  PigeonGov`) +
          chalk.dim(` \u2014 ${items.length} workflows across ${domainCount} domains`),
      );
      console.log("");

      for (const [domain, domainWorkflows] of byDomain) {
        console.log(
          `  ${chalk.cyan.bold(domain)} ${chalk.dim(`(${domainWorkflows.length})`)}`,
        );

        for (const wf of domainWorkflows) {
          const badge =
            wf.status === "active"
              ? chalk.green("\u25cf")
              : wf.status === "preview"
                ? chalk.yellow("\u25cb")
                : chalk.dim("\u25cb");

          const idPart = wf.id.padEnd(36);
          console.log(`    ${badge} ${chalk.white(idPart)} ${chalk.dim(wf.title)}`);
        }

        console.log("");
      }

      console.log(
        chalk.dim(`  ${items.length} workflows available.`) +
          chalk.dim(" Run: ") +
          chalk.cyan("pigeongov fill <id>"),
      );
      console.log("");
    });
}
