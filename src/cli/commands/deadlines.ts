import type { Command } from "commander";
import { writeFileSync } from "node:fs";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import {
  DEFAULT_DEADLINES,
  getUpcomingDeadlines,
  generateIcs,
} from "../../workflows/deadlines.js";

export function registerDeadlinesCommand(program: Command): void {
  program
    .command("deadlines")
    .description("Show upcoming workflow deadlines")
    .option("--workflow <id>", "Filter by workflow ID")
    .option("--ics <output-path>", "Write ICS calendar file to path")
    .action((options) => {
      let deadlines = DEFAULT_DEADLINES;

      if (options.workflow) {
        deadlines = deadlines.filter(
          (d) => d.workflowId === String(options.workflow),
        );
      }

      const upcoming = getUpcomingDeadlines(deadlines);

      // ICS export mode
      if (options.ics) {
        const icsContent = generateIcs(upcoming);
        writeFileSync(String(options.ics), icsContent, "utf-8");
        console.log(chalk.green(`Saved ICS calendar to ${String(options.ics)}`));
        return;
      }

      // JSON mode
      if (isJsonMode()) {
        emitJson({ deadlines: upcoming });
        return;
      }

      // Terminal display
      if (upcoming.length === 0) {
        console.log(chalk.dim("No upcoming deadlines."));
        return;
      }

      for (const d of upcoming) {
        const typeColor = d.type === "hard" ? chalk.red : chalk.yellow;
        const badge = typeColor(`[${d.type.toUpperCase()}]`);
        console.log(
          `${badge} ${chalk.bold(d.label)}  ${chalk.cyan(d.date)}  ${chalk.dim(d.workflowId)}`,
        );
        console.log(`     ${chalk.dim(d.consequence)}`);
        if (d.extensionAvailable) {
          console.log(`     ${chalk.green("Extension available")}`);
        }
        console.log();
      }
    });
}
