import { Command } from "commander";
import chalk from "chalk";
import { readFileSync } from "node:fs";

import { isJsonMode, emit } from "../output.js";
import {
  analyzeSaveTransition,
  type SaveTransitionInput,
} from "../../advisory/student-loans/save-transition.js";
import { trackPSLF, type PSLFTrackerInput } from "../../advisory/student-loans/pslf-tracker.js";

function readInputFile<T>(filePath: string): T {
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function registerStudentLoansCommand(program: Command): void {
  const cmd = program
    .command("student-loans")
    .description(
      `Student loan crisis tools — SAVE transition, PSLF tracking, plan comparison.

  The SAVE plan permanently ended March 10, 2026. 7.5M borrowers in
  forbearance must transition by September 30, 2026.

  Subcommands:
    transition   Analyze SAVE transition options and urgent actions
    pslf         Track PSLF progress, risk, and buyback opportunities
    compare      Side-by-side plan comparison table

  Examples:
    $ pigeongov student-loans transition --input data.json
    $ pigeongov student-loans pslf --input tracker.json --json
    $ pigeongov student-loans compare --input data.json`,
    );

  // -------------------------------------------------------------------------
  // student-loans transition
  // -------------------------------------------------------------------------
  cmd
    .command("transition")
    .description("Analyze SAVE transition options, urgent actions, and plan comparison")
    .requiredOption("--input <file>", "Path to JSON input file (SaveTransitionInput)")
    .action((options: { input: string }) => {
      const input = readInputFile<SaveTransitionInput>(options.input);
      const result = analyzeSaveTransition(input);

      if (isJsonMode()) {
        emit(result);
        return;
      }

      console.log("");
      console.log(chalk.bold.red("  SAVE Transition Analysis"));
      console.log(chalk.dim(`  Balance: $${input.loanBalance.toLocaleString()} | Income: $${input.annualIncome.toLocaleString()}/yr`));
      console.log("");

      // Urgent actions
      if (result.urgentActions.length > 0) {
        console.log(chalk.red.bold("  Urgent Actions"));
        for (const action of result.urgentActions) {
          console.log(`    ${chalk.red("!")} ${action.action}`);
          console.log(`      ${chalk.dim(`Deadline: ${action.deadline}`)}`);
          console.log(`      ${chalk.dim(action.consequence)}`);
          console.log("");
        }
      }

      // Plan comparison table
      console.log(chalk.cyan.bold("  Plan Comparison"));
      console.log(
        chalk.dim(
          `    ${"Plan".padEnd(30)} ${"Monthly".padStart(10)} ${"Total".padStart(14)} ${"Forgiven".padStart(14)} ${"Years".padStart(6)}`,
        ),
      );
      console.log(chalk.dim(`    ${"─".repeat(78)}`));
      for (const plan of result.planComparison) {
        const monthly = `$${plan.monthlyPayment.toLocaleString()}`;
        const total = `$${plan.totalPaid.toLocaleString()}`;
        const forgiven = plan.forgivenessAmount > 0
          ? chalk.green(`$${plan.forgivenessAmount.toLocaleString()}`)
          : chalk.dim("—");
        const years = `${plan.yearsToPayoff}`;
        console.log(
          `    ${plan.plan.padEnd(30)} ${monthly.padStart(10)} ${total.padStart(14)} ${forgiven.padStart(14)} ${years.padStart(6)}`,
        );
      }
      console.log("");

      // PSLF assessment
      if (result.pslf.eligible) {
        console.log(chalk.bold("  PSLF Status"));
        console.log(`    Payments remaining: ${chalk.bold(String(result.pslf.paymentsRemaining))} of 120`);
        if (result.pslf.estimatedForgivenessDate) {
          console.log(`    Estimated forgiveness: ${chalk.green(result.pslf.estimatedForgivenessDate)}`);
        }
        if (result.pslf.atRisk) {
          console.log(`    ${chalk.yellow("Risk:")} ${result.pslf.riskReason}`);
        }
        console.log("");
      }

      // Consolidation deadline
      if (result.consolidationDeadline) {
        console.log(chalk.red.bold(`  Consolidation Deadline: ${result.consolidationDeadline}`));
        console.log(chalk.dim("    Parent PLUS loans must be consolidated before this date to access IDR."));
        console.log("");
      }

      // Recommendation
      console.log(chalk.bold("  Recommendation"));
      console.log(`    ${result.recommendation}`);
      console.log("");
    });

  // -------------------------------------------------------------------------
  // student-loans pslf
  // -------------------------------------------------------------------------
  cmd
    .command("pslf")
    .description("Track PSLF progress, employer risk, and buyback opportunities")
    .requiredOption("--input <file>", "Path to JSON input file (PSLFTrackerInput)")
    .action((options: { input: string }) => {
      const rawInput = readInputFile<Record<string, unknown>>(options.input);

      // Adapt SaveTransitionInput fields to PSLFTrackerInput if needed
      let input: PSLFTrackerInput;
      if ('monthsOfPSLFEmployment' in rawInput && !('qualifyingPaymentsMade' in rawInput)) {
        const monthsOfPSLFEmployment = Number(rawInput.monthsOfPSLFEmployment) || 0;
        const monthsInSaveForbearance = Number(rawInput.monthsInSaveForbearance) || 0;
        const loanBalance = Number(rawInput.loanBalance) || 0;
        const annualIncome = Number(rawInput.annualIncome) || 0;
        const householdSize = Number(rawInput.householdSize) || 1;
        const employerType = (rawInput.employerType as PSLFTrackerInput["employerType"]) || "nonprofit";
        const currentPlan = String(rawInput.currentPlan ?? "standard");
        input = {
          qualifyingPaymentsMade: monthsOfPSLFEmployment - monthsInSaveForbearance,
          employerType,
          monthsInForbearance: monthsInSaveForbearance,
          monthsInDeferment: 0,
          loanBalance,
          annualIncome,
          householdSize,
          isOnIDRPlan: currentPlan !== "standard",
          currentMonthlyPayment: 0,
        };
      } else if ('qualifyingPaymentsMade' in rawInput) {
        input = rawInput as unknown as PSLFTrackerInput;
      } else {
        const msg = 'Input must be a PSLFTrackerInput (with qualifyingPaymentsMade) or SaveTransitionInput (with monthsOfPSLFEmployment).';
        if (isJsonMode()) {
          emit({ error: "invalid_input", message: msg });
        } else {
          console.error(msg);
        }
        process.exitCode = 4;
        return;
      }

      const result = trackPSLF(input);

      if (isJsonMode()) {
        emit(result);
        return;
      }

      console.log("");
      console.log(chalk.bold("  PSLF Progress Tracker"));
      console.log("");

      // Progress bar
      const barWidth = 40;
      const filled = Math.round((result.progressPercent / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = chalk.green("█".repeat(filled)) + chalk.dim("░".repeat(empty));
      console.log(`    ${bar} ${result.progressPercent}%`);
      console.log(`    ${result.qualifyingPayments}/${result.paymentsNeeded} qualifying payments`);
      console.log("");

      if (result.estimatedForgivenessDate) {
        console.log(`    Estimated forgiveness: ${chalk.green.bold(result.estimatedForgivenessDate)}`);
      }

      // Risk assessment
      const riskColor =
        result.riskAssessment.level === "low"
          ? chalk.green
          : result.riskAssessment.level === "medium"
            ? chalk.yellow
            : result.riskAssessment.level === "high"
              ? chalk.red
              : chalk.red.bold;
      console.log(`    Employer risk: ${riskColor(result.riskAssessment.level)}`);
      console.log(`    ${chalk.dim(result.riskAssessment.reason)}`);
      console.log("");

      // Buyback
      if (result.buybackOpportunity.eligible) {
        console.log(chalk.bold("  Buyback Opportunity"));
        console.log(`    Months available: ${result.buybackOpportunity.monthsAvailable}`);
        console.log(`    Estimated cost: $${result.buybackOpportunity.estimatedCost.toLocaleString()}`);
        console.log(`    ${chalk.dim(result.buybackOpportunity.benefitDescription)}`);
        console.log("");
      }

      // Recommendations
      if (result.recommendations.length > 0) {
        console.log(chalk.bold("  Recommendations"));
        for (const rec of result.recommendations) {
          console.log(`    ${chalk.dim("•")} ${rec}`);
        }
        console.log("");
      }
    });

  // -------------------------------------------------------------------------
  // student-loans compare
  // -------------------------------------------------------------------------
  cmd
    .command("compare")
    .description("Side-by-side repayment plan comparison table")
    .requiredOption("--input <file>", "Path to JSON input file (SaveTransitionInput)")
    .action((options: { input: string }) => {
      const input = readInputFile<SaveTransitionInput>(options.input);
      const result = analyzeSaveTransition(input);

      if (isJsonMode()) {
        emit({
          input: {
            loanBalance: input.loanBalance,
            interestRate: input.interestRate,
            annualIncome: input.annualIncome,
            householdSize: input.householdSize,
          },
          plans: result.planComparison,
          recommendation: result.recommendation,
        });
        return;
      }

      console.log("");
      console.log(chalk.bold("  Repayment Plan Comparison"));
      console.log(
        chalk.dim(
          `  Loan: $${input.loanBalance.toLocaleString()} @ ${(input.interestRate * 100).toFixed(1)}% | ` +
            `Income: $${input.annualIncome.toLocaleString()}/yr | Household: ${input.householdSize}`,
        ),
      );
      console.log("");

      console.log(
        chalk.dim(
          `    ${"Plan".padEnd(30)} ${"Monthly".padStart(10)} ${"Total Paid".padStart(14)} ${"Forgiven".padStart(14)} ${"Years".padStart(6)}`,
        ),
      );
      console.log(chalk.dim(`    ${"─".repeat(78)}`));

      let lowestMonthly = Infinity;
      let lowestTotal = Infinity;
      for (const plan of result.planComparison) {
        if (plan.monthlyPayment < lowestMonthly) lowestMonthly = plan.monthlyPayment;
        if (plan.totalPaid < lowestTotal) lowestTotal = plan.totalPaid;
      }

      for (const plan of result.planComparison) {
        const monthlyStr = `$${plan.monthlyPayment.toLocaleString()}`;
        const totalStr = `$${plan.totalPaid.toLocaleString()}`;
        const forgivenStr = plan.forgivenessAmount > 0
          ? `$${plan.forgivenessAmount.toLocaleString()}`
          : "—";
        const yearsStr = `${plan.yearsToPayoff}`;

        const monthlyFmt = plan.monthlyPayment === lowestMonthly ? chalk.green.bold(monthlyStr) : monthlyStr;
        const totalFmt = plan.totalPaid === lowestTotal ? chalk.green.bold(totalStr) : totalStr;
        const forgivenFmt = plan.forgivenessAmount > 0 ? chalk.cyan(forgivenStr) : chalk.dim(forgivenStr);

        console.log(
          `    ${plan.plan.padEnd(30)} ${monthlyFmt.padStart(10)} ${totalFmt.padStart(14)} ${forgivenFmt.padStart(14)} ${yearsStr.padStart(6)}`,
        );
      }
      console.log("");
      console.log(`  ${chalk.bold("Recommendation:")} ${result.recommendation}`);
      console.log("");
    });
}
