import type { Command } from "commander";
import chalk from "chalk";

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

      // Group workflows by domain
      const byDomain = new Map<string, typeof workflows>();
      for (const wf of workflows) {
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
          chalk.dim(` \u2014 ${workflows.length} workflows across ${domainCount} domains`),
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
        chalk.dim(`  ${workflows.length} workflows available.`) +
          chalk.dim(" Run: ") +
          chalk.cyan("pigeongov fill <id>"),
      );
      console.log("");
    });
}
