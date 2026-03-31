import type { Command } from "commander";
import chalk from "chalk";

import { isJsonMode, emit } from "../output.js";
import {
  listSupportedStates,
  calculateStateTax,
} from "../../engine/state-tax-integration.js";
import { getStateTaxPlugin } from "../../engine/state/registry.js";

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function registerStateTaxCommand(program: Command): void {
  program
    .command("state-tax [stateCode]")
    .description(
      `Show state tax information, rates, and bracket tables.

  Without a stateCode, lists all supported state tax calculators with
  their tax type (progressive, flat, or none). With a stateCode, shows
  the state's tax brackets, deductions, and special rules.

  Use --income to calculate an example state tax liability.

  Examples:
    $ pigeongov state-tax                        # list all states
    $ pigeongov state-tax list                   # same as above
    $ pigeongov state-tax CA                     # CA info and brackets
    $ pigeongov state-tax CA --income 100000     # calculate CA tax on $100k
    $ pigeongov state-tax CA --json              # structured output`,
    )
    .option("--income <amount>", "Example income to calculate state tax for")
    .option("--filing-status <status>", "Filing status for example calculation", "single")
    .option("--withholding <amount>", "State withholding for example calculation", "0")
    .action((stateCode?: string, options?: { income?: string; filingStatus?: string; withholding?: string }) => {
      // List mode
      if (!stateCode || stateCode.toLowerCase() === "list") {
        const states = listSupportedStates();

        if (isJsonMode()) {
          emit({ states });
          return;
        }

        console.log("");
        console.log(chalk.bold("  Supported State Tax Calculators"));
        console.log("");

        const progressive = states.filter((s) => s.taxType === "progressive");
        const flat = states.filter((s) => s.taxType === "flat");
        const none = states.filter((s) => s.taxType === "none");

        if (progressive.length > 0) {
          console.log(`  ${chalk.cyan.bold("Progressive")} (graduated brackets)`);
          for (const s of progressive) {
            console.log(`    ${chalk.cyan(s.stateCode)}  ${s.stateName}`);
          }
          console.log("");
        }

        if (flat.length > 0) {
          console.log(`  ${chalk.yellow.bold("Flat rate")}`);
          for (const s of flat) {
            console.log(`    ${chalk.yellow(s.stateCode)}  ${s.stateName}`);
          }
          console.log("");
        }

        if (none.length > 0) {
          console.log(`  ${chalk.green.bold("No income tax")}`);
          for (const s of none) {
            console.log(`    ${chalk.green(s.stateCode)}  ${s.stateName}`);
          }
          console.log("");
        }

        console.log(chalk.dim(`  ${states.length} states supported.`));
        console.log(chalk.dim("  Usage: ") + chalk.cyan("pigeongov state-tax <stateCode>"));
        console.log("");
        return;
      }

      const code = stateCode.toUpperCase();
      const plugin = getStateTaxPlugin(code);

      // If user wants a calculation
      if (options?.income) {
        const income = Number(options.income) || 0;
        const filingStatus = (options?.filingStatus ?? "single") as
          "single" | "married_filing_jointly" | "married_filing_separately" | "head_of_household" | "qualifying_surviving_spouse";
        const withholding = Number(options?.withholding) || 0;

        const result = calculateStateTax({
          state: code,
          federalAGI: income,
          federalTaxableIncome: income,
          wages: income,
          filingStatus,
          dependents: 0,
          itemizedDeductions: 0,
          stateWithheld: withholding,
          stateEstimatedPayments: 0,
          propertyTaxPaid: 0,
          mortgageInterest: 0,
          charitableContributions: 0,
        });

        if (isJsonMode()) {
          emit(result);
          return;
        }

        console.log("");
        console.log(chalk.bold(`  ${result.stateName} State Tax Calculation`));
        console.log("");
        console.log(`  Filing status:        ${filingStatus}`);
        console.log(`  Income:               ${fmt(income)}`);
        console.log(`  Taxable income:       ${fmt(result.stateTaxableIncome)}`);
        console.log(`  State tax:            ${chalk.yellow(fmt(result.stateTax))}`);
        console.log(`  Effective rate:       ${pct(result.stateEffectiveRate)}`);

        if (result.brackets.length > 0) {
          console.log("");
          console.log(chalk.dim("  Bracket breakdown:"));
          for (const b of result.brackets) {
            console.log(`    ${pct(b.rate).padEnd(8)} on ${fmt(b.amount).padStart(14)}  =  ${fmt(b.tax)}`);
          }
        }

        if (withholding > 0 || result.stateRefund > 0 || result.stateOwed > 0) {
          console.log("");
          console.log(`  Withholding:          ${fmt(result.stateWithheld)}`);
          if (result.stateRefund > 0) {
            console.log(`  State refund:         ${chalk.green(fmt(result.stateRefund))}`);
          } else if (result.stateOwed > 0) {
            console.log(`  State owed:           ${chalk.red(fmt(result.stateOwed))}`);
          }
        }

        if (result.notes.length > 0) {
          console.log("");
          for (const note of result.notes) {
            console.log(`  ${chalk.dim(note)}`);
          }
        }

        console.log("");
        return;
      }

      // Info mode — show the state's details
      if (!plugin) {
        // May be a no-income-tax state
        const states = listSupportedStates();
        const match = states.find((s) => s.stateCode === code);

        if (match && match.taxType === "none") {
          if (isJsonMode()) {
            emit({
              stateCode: code,
              stateName: match.stateName,
              taxType: "none",
              note: `${match.stateName} does not levy a state income tax.`,
            });
            return;
          }

          console.log("");
          console.log(chalk.bold(`  ${match.stateName} (${code})`));
          console.log(`  Tax type: ${chalk.green("No income tax")}`);
          console.log("");
          console.log(chalk.dim(`  ${match.stateName} does not levy a state income tax.`));
          console.log("");
          return;
        }

        if (isJsonMode()) {
          emit({ ok: false, error: `No state tax data for: ${code}` });
        } else {
          console.error(chalk.red(`  No state tax data for: ${code}`));
          console.log(chalk.dim("  Run ") + chalk.cyan("pigeongov state-tax list") + chalk.dim(" to see available states."));
        }
        process.exitCode = 1;
        return;
      }

      if (isJsonMode()) {
        emit({
          stateCode: plugin.stateCode,
          displayName: plugin.displayName,
          taxType: plugin.taxType,
        });
        return;
      }

      console.log("");
      console.log(chalk.bold(`  ${plugin.displayName} (${plugin.stateCode})`));
      console.log(`  Tax type: ${plugin.taxType === "progressive" ? chalk.cyan(plugin.taxType) : chalk.yellow(plugin.taxType)}`);
      console.log("");
      console.log(chalk.dim("  Use --income <amount> to calculate an example state tax liability."));
      console.log(chalk.dim(`  Example: pigeongov state-tax ${code} --income 100000`));
      console.log("");
    });
}
