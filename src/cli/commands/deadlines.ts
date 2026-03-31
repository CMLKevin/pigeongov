import type { Command } from "commander";
import { writeFileSync } from "node:fs";
import chalk from "chalk";

import { isJsonMode, emit } from "../output.js";
import {
  DEFAULT_DEADLINES,
  getUpcomingDeadlines,
  generateIcs,
} from "../../workflows/deadlines.js";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): (text: string) => string {
  if (days < 0) return chalk.red.bold;
  if (days <= 7) return chalk.red;
  if (days <= 30) return chalk.yellow;
  return chalk.green;
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days}d`;
}

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
        emit({ deadlines: upcoming });
        return;
      }

      // Terminal display
      if (upcoming.length === 0) {
        console.log(chalk.dim("  No upcoming deadlines."));
        return;
      }

      console.log("");
      console.log(chalk.bold("  Upcoming Deadlines"));
      console.log("");

      // Group by workflow
      const byWorkflow = new Map<string, typeof upcoming>();
      for (const d of upcoming) {
        const existing = byWorkflow.get(d.workflowId);
        if (existing) {
          existing.push(d);
        } else {
          byWorkflow.set(d.workflowId, [d]);
        }
      }

      let first = true;
      for (const [workflowId, items] of byWorkflow) {
        if (!first) {
          console.log(chalk.dim(`  ${"═".repeat(52)}`));
          console.log("");
        }
        first = false;

        console.log(`  ${chalk.cyan.bold(workflowId)}`);
        console.log("");

        for (const d of items) {
          const days = daysUntil(d.date);
          const colorize = urgencyColor(days);

          const typeBadge =
            d.type === "hard"
              ? chalk.red.bold(" HARD ")
              : chalk.yellow(" SOFT ");

          const overdueMark = days < 0 ? chalk.red.bold(" OVERDUE") : "";

          console.log(
            `  ${typeBadge} ${chalk.bold(d.label)}`,
          );
          console.log(
            `         ${colorize(d.date)}  ${colorize(daysLabel(days))}${overdueMark}`,
          );
          console.log(
            `         ${chalk.dim(d.consequence)}`,
          );

          if (d.extensionAvailable) {
            console.log(
              `         ${chalk.green("\u2713 Extension available")}`,
            );
          }
          console.log("");
        }
      }

      console.log(
        chalk.dim(`  ${upcoming.length} deadline${upcoming.length === 1 ? "" : "s"} shown.`) +
          chalk.dim(" Export: ") +
          chalk.cyan("pigeongov deadlines --ics calendar.ics"),
      );
      console.log("");
    });
}
