import type { Command } from "commander";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { calculateCliff } from "../../advisory/cliff/calculator.js";

export function registerCliffCommand(program: Command): void {
  program
    .command("cliff")
    .description("Benefits cliff calculator — shows where benefits drop off as income rises")
    .requiredOption("--income <amount>", "Annual household income (before taxes)")
    .requiredOption("--household <size>", "Number of people in household")
    .option("--state <code>", "Two-letter state code", "CA")
    .action((options: { income: string; household: string; state: string }) => {
      const annualIncome = parseFloat(options.income);
      const householdSize = parseInt(options.household, 10);
      const state = options.state.toUpperCase();

      if (isNaN(annualIncome) || annualIncome < 0) {
        console.error(chalk.red("--income must be a non-negative number"));
        process.exitCode = 4;
        return;
      }
      if (isNaN(householdSize) || householdSize < 1) {
        console.error(chalk.red("--household must be a positive integer"));
        process.exitCode = 4;
        return;
      }

      const result = calculateCliff({ annualIncome, householdSize, state });

      if (isJsonMode()) {
        emitJson(result);
        return;
      }

      // --- Human-readable output ---

      console.log("");
      console.log(chalk.bold("  Benefits Cliff Analysis"));
      console.log(
        chalk.dim(
          `  Household of ${householdSize} | $${annualIncome.toLocaleString()}/year | ${state}`,
        ),
      );
      console.log("");

      // Current benefits
      if (result.currentBenefits.length === 0) {
        console.log(chalk.dim("  No current benefit eligibility at this income level."));
      } else {
        console.log(chalk.cyan.bold("  Current Benefits"));
        for (const b of result.currentBenefits) {
          const amt = chalk.green(`$${b.monthlyValue.toLocaleString()}/mo`);
          console.log(`    ${b.program.padEnd(35)} ${amt}`);
        }
        const totalMonthly = result.currentBenefits.reduce((s, b) => s + b.monthlyValue, 0);
        console.log(chalk.dim(`  ${"─".repeat(50)}`));
        console.log(
          `    ${"Total".padEnd(35)} ${chalk.green.bold(`$${totalMonthly.toLocaleString()}/mo`)}`,
        );
      }

      console.log("");

      // Cliff points
      if (result.cliffPoints.length > 0) {
        console.log(chalk.yellow.bold("  Cliff Points"));
        for (const cp of result.cliffPoints) {
          const incomeStr = `$${cp.income.toLocaleString()}/yr`;
          const lossStr = chalk.red(`-$${cp.annualLoss.toLocaleString()}/yr`);
          console.log(`    At ${incomeStr.padEnd(18)} lose ${cp.programLost.padEnd(25)} ${lossStr}`);
        }
      } else {
        console.log(chalk.dim("  No upcoming benefit cliffs."));
      }

      console.log("");

      // Safe raise threshold
      if (result.safeRaiseThreshold > annualIncome) {
        const raiseNeeded = result.safeRaiseThreshold - annualIncome;
        console.log(
          chalk.bold("  Safe Raise Target: ") +
            chalk.green.bold(`$${result.safeRaiseThreshold.toLocaleString()}/year`) +
            chalk.dim(` (+$${raiseNeeded.toLocaleString()})`),
        );
      }

      console.log("");
      console.log(chalk.dim(`  ${result.recommendation}`));
      console.log("");
    });
}
