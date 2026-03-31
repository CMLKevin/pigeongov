import type { Command } from "commander";
import chalk from "chalk";

import { isJsonMode, emit } from "../output.js";
import {
  DEFAULT_FEES,
  getWorkflowFees,
  calculateTotalFees,
} from "../../workflows/fees.js";

export function registerFeesCommand(program: Command): void {
  program
    .command("fees")
    .description("Show fee breakdown for a workflow")
    .option("--workflow <id>", "Filter by workflow ID")
    .action((options) => {
      let fees = DEFAULT_FEES;

      if (options.workflow) {
        fees = getWorkflowFees(fees, String(options.workflow));
      }

      const total = calculateTotalFees(fees);

      // JSON mode
      if (isJsonMode()) {
        emit({ fees, total });
        return;
      }

      // Terminal display
      if (fees.length === 0) {
        console.log(chalk.dim("  No fees found."));
        return;
      }

      console.log("");
      console.log(chalk.bold("  Fee Breakdown"));
      console.log("");

      // Group by workflow
      const byWorkflow = new Map<string, typeof fees>();
      for (const f of fees) {
        const existing = byWorkflow.get(f.workflowId);
        if (existing) {
          existing.push(f);
        } else {
          byWorkflow.set(f.workflowId, [f]);
        }
      }

      for (const [workflowId, workflowFees] of byWorkflow) {
        console.log(`  ${chalk.cyan.bold(workflowId)}`);

        for (const f of workflowFees) {
          const amountStr =
            f.amount === 0
              ? chalk.green("$0.00".padStart(10))
              : chalk.yellow(`$${f.amount.toFixed(2)}`.padStart(10));

          const typeBadge = chalk.dim(`[${f.type}]`.padEnd(12));

          console.log(`    ${typeBadge} ${chalk.bold(f.label.padEnd(30))} ${amountStr}`);

          if (f.waivable && f.waiverCriteria !== undefined) {
            console.log(`    ${"".padEnd(12)} ${chalk.green("\u2713 Waivable:")} ${chalk.dim(f.waiverCriteria)}`);
          }
        }

        console.log("");
      }

      // Total line with box drawing
      console.log(chalk.dim(`  ${"─".repeat(56)}`));
      const totalStr =
        total === 0
          ? chalk.green.bold("$0.00")
          : chalk.yellow.bold(`$${total.toFixed(2)}`);
      console.log(`  ${chalk.bold("Total")}${" ".repeat(49)}${totalStr}`);
      console.log("");
    });
}
