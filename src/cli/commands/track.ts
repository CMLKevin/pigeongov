import type { Command } from "commander";
import chalk from "chalk";

import { isJsonMode, emit } from "../output.js";
import { checkCaseStatus, getProcessingTimeEstimate } from "../../advisory/tracker/uscis.js";

export function registerTrackCommand(program: Command): void {
  program
    .command("track <receiptNumber>")
    .description(
      `Check USCIS case status by receipt number (makes a network call).

  Queries the USCIS API for case status and processing time estimates.
  Receipt numbers are 13 characters: 3-letter service center code + 10
  digits (e.g., EAC2590012345, WAC2490054321).

  Use --offline with --form to skip the API call and only show processing
  time estimates for a form type.

  Examples:
    $ pigeongov track EAC2590012345
    $ pigeongov track EAC2590012345 --form I-485 --json
    $ pigeongov track EAC2590012345 --offline --form I-485 --json`,
    )
    .option("--form <type>", "USCIS form type (e.g., I-485, N-400)")
    .option("--offline", "Skip API call, show processing time estimates only")
    .action(async (receiptNumber: string, options: { form?: string; offline?: boolean }) => {
      const formType = options.form?.toUpperCase().trim();

      // Offline-only mode: skip the network call entirely
      if (options.offline && formType) {
        const estimate = getProcessingTimeEstimate(formType);

        if (isJsonMode()) {
          emit({
            receiptNumber,
            formType,
            mode: "offline",
            processingTime: estimate ?? null,
          });
          return;
        }

        console.log("");
        console.log(chalk.bold("  Processing Time Estimates"));
        console.log(chalk.dim(`  Form: ${formType}`));
        console.log("");

        if (estimate) {
          console.log(`  ${chalk.cyan("50th percentile:")} ${estimate.percentile50} months`);
          console.log(`  ${chalk.cyan("75th percentile:")} ${estimate.percentile75} months`);
          console.log(`  ${chalk.cyan("90th percentile:")} ${estimate.percentile90} months`);
          console.log(chalk.dim(`\n  Last updated: ${estimate.lastUpdated}`));
        } else {
          console.log(chalk.dim(`  No processing time data available for ${formType}.`));
        }

        console.log("");
        return;
      }

      // Live mode: call the USCIS API (with offline fallback on error)
      try {
        const result = await checkCaseStatus(receiptNumber, formType);

        if (isJsonMode()) {
          emit(result);
          return;
        }

        console.log("");
        console.log(chalk.bold("  USCIS Case Status"));
        console.log("");
        console.log(`  ${chalk.cyan("Receipt:")}     ${result.receiptNumber}`);
        console.log(`  ${chalk.cyan("Form:")}        ${result.formType}`);

        if (result.status === "OFFLINE") {
          console.log(`  ${chalk.yellow("Status:")}      ${chalk.yellow("OFFLINE (API unreachable)")}`);
        } else {
          console.log(`  ${chalk.cyan("Status:")}      ${result.status}`);
        }

        if (result.statusDescription) {
          console.log(`  ${chalk.cyan("Description:")} ${result.statusDescription}`);
        }

        if (result.processingTime) {
          console.log("");
          console.log(chalk.bold("  Processing Time Estimates"));
          console.log(`  ${chalk.dim("50th percentile:")} ${result.processingTime.percentile50} months`);
          console.log(`  ${chalk.dim("75th percentile:")} ${result.processingTime.percentile75} months`);
          console.log(`  ${chalk.dim("90th percentile:")} ${result.processingTime.percentile90} months`);
        }

        console.log("");
      } catch (err) {
        if (isJsonMode()) {
          emit({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        } else {
          console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        }
        process.exitCode = 4;
      }
    });
}
