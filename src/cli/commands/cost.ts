import type { Command } from "commander";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { estimateCost, listAvailableCosts } from "../../advisory/cost/estimator.js";

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function range(min: number, max: number): string {
  if (min === max) return fmt(min);
  return `${fmt(min)}–${fmt(max)}`;
}

export function registerCostCommand(program: Command): void {
  program
    .command("cost [workflowId]")
    .description("Estimate costs for a government workflow — DIY vs attorney")
    .action((workflowId?: string) => {
      // No workflow specified — list available
      if (!workflowId) {
        const available = listAvailableCosts();

        if (isJsonMode()) {
          emitJson({ available });
          return;
        }

        console.log("");
        console.log(chalk.bold("  Available Cost Estimates"));
        console.log("");
        for (const id of available) {
          console.log(`    ${chalk.cyan(id)}`);
        }
        console.log("");
        console.log(chalk.dim(`  ${available.length} workflows with cost data.`));
        console.log(chalk.dim("  Usage: ") + chalk.cyan("pigeongov cost <workflowId>"));
        console.log("");
        return;
      }

      const estimate = estimateCost(workflowId);

      if (!estimate) {
        if (isJsonMode()) {
          emitJson({ ok: false, error: `No cost data for workflow: ${workflowId}` });
        } else {
          console.error(chalk.red(`  No cost data for workflow: ${workflowId}`));
          console.log(chalk.dim("  Run ") + chalk.cyan("pigeongov cost") + chalk.dim(" to list available workflows."));
        }
        process.exitCode = 1;
        return;
      }

      if (isJsonMode()) {
        emitJson(estimate);
        return;
      }

      // Terminal display
      console.log("");
      console.log(chalk.bold(`  Cost Estimate: ${workflowId}`));
      console.log("");

      // DIY breakdown
      console.log(`  ${chalk.green.bold("DIY")} ${chalk.dim("(filing fees only)")}`);
      for (const item of estimate.diyTotal.breakdown) {
        const amountStr = item.amount === 0
          ? chalk.green("$0".padStart(10))
          : chalk.yellow(fmt(item.amount).padStart(10));
        console.log(`    ${chalk.dim(`[${item.type}]`.padEnd(16))} ${item.item.padEnd(32)} ${amountStr}`);
      }
      console.log(chalk.dim(`    ${"─".repeat(58)}`));
      console.log(`    ${chalk.bold("DIY total".padEnd(48))} ${chalk.bold(range(estimate.diyTotal.min, estimate.diyTotal.max))}`);
      console.log("");

      // Attorney breakdown
      console.log(`  ${chalk.red.bold("With Attorney")}`);
      for (const item of estimate.withAttorneyTotal.breakdown) {
        const amountStr = item.amount === 0
          ? chalk.green("$0".padStart(10))
          : chalk.yellow(fmt(item.amount).padStart(10));
        console.log(`    ${chalk.dim(`[${item.type}]`.padEnd(16))} ${item.item.padEnd(32)} ${amountStr}`);
      }
      console.log(chalk.dim(`    ${"─".repeat(58)}`));
      console.log(`    ${chalk.bold("Attorney total".padEnd(48))} ${chalk.bold(range(estimate.withAttorneyTotal.min, estimate.withAttorneyTotal.max))}`);
      console.log("");

      // Savings
      console.log(chalk.dim(`  ${"═".repeat(60)}`));
      console.log(`  ${chalk.green.bold(`Savings with PigeonGov: ~${fmt(estimate.savings.vsAttorney)}`)} vs attorney`);
      console.log(`  ${chalk.dim(estimate.savings.description)}`);
      console.log("");
    });
}
