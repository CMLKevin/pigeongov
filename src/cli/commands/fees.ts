import type { Command } from "commander";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
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
        emitJson({ fees, total });
        return;
      }

      // Terminal display
      if (fees.length === 0) {
        console.log(chalk.dim("No fees found."));
        return;
      }

      for (const f of fees) {
        const amountStr =
          f.amount === 0
            ? chalk.green("$0")
            : chalk.yellow(`$${f.amount.toFixed(2)}`);
        const badge = chalk.dim(`[${f.type}]`);
        console.log(`${badge} ${chalk.bold(f.label)}  ${amountStr}  ${chalk.dim(f.workflowId)}`);
        if (f.waivable && f.waiverCriteria !== undefined) {
          console.log(`     ${chalk.green("Waivable:")} ${chalk.dim(f.waiverCriteria)}`);
        }
      }

      console.log();
      console.log(
        chalk.bold(`Total fees: ${total === 0 ? chalk.green("$0") : chalk.yellow(`$${total.toFixed(2)}`)}`),
      );
    });
}
