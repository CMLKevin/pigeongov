import type { Command } from "commander";

import { isJsonMode, emit } from "../output.js";
import {
  normalizeWorkflowId,
  getWorkflowStarterData,
  buildWorkflowBundle,
} from "../../workflows/registry.js";

/**
 * Realistic example data keyed by workflow ID. Each entry is a filled-out
 * version of the starter data that an agent can study to understand the
 * expected format and values.
 */
const EXAMPLE_DATA: Record<string, Record<string, unknown>> = {
  "tax/1040": {
    taxpayer: {
      firstName: "Jane",
      lastName: "Doe",
      ssn: "123-45-6789",
      address: {
        street1: "742 Evergreen Terrace",
        city: "Springfield",
        state: "IL",
        zipCode: "62704",
      },
    },
    dependents: [
      {
        name: "Bart Doe",
        ssn: "987-65-4321",
        relationship: "son",
        childTaxCreditEligible: true,
      },
    ],
    filingStatus: "head_of_household",
    wages: 62000,
    taxableInterest: 340,
    ordinaryDividends: 120,
    scheduleCNet: 0,
    otherIncome: 0,
    adjustments: {
      educatorExpenses: 0,
      hsaDeduction: 1200,
      selfEmploymentTaxDeduction: 0,
      iraDeduction: 3000,
      studentLoanInterest: 0,
    },
    useItemizedDeductions: false,
    itemizedDeductions: 0,
    federalWithheld: 7800,
    estimatedPayments: 0,
  },
};

export function registerExampleCommand(program: Command): void {
  program
    .command("example [workflowId]")
    .description(
      `Show a complete worked example for a workflow with realistic data.

  Displays a fully filled-out data file that an agent can study to
  understand the expected format and field values. When used with
  --json, returns a structured object with the example input data
  and the resulting workflow bundle.

  Without a workflowId, lists workflows that have examples available.

  Examples:
    $ pigeongov example                       # list available examples
    $ pigeongov example tax/1040 --json       # full worked example
    $ pigeongov example tax/1040 --json | jq .exampleInput > input.json`,
    )
    .action((workflowId?: string) => {
      if (!workflowId) {
        const available = Object.keys(EXAMPLE_DATA);
        if (isJsonMode()) {
          emit({ availableExamples: available });
          return;
        }

        process.stdout.write("\nAvailable examples:\n");
        for (const id of available) {
          process.stdout.write(`  ${id}\n`);
        }
        process.stdout.write(`\nRun: pigeongov example <workflowId> --json\n\n`);
        return;
      }

      let normalizedId: string;
      try {
        normalizedId = normalizeWorkflowId(workflowId);
      } catch {
        if (isJsonMode()) {
          emit({ error: `Unknown workflow: ${workflowId}` });
        } else {
          process.stderr.write(`Unknown workflow: ${workflowId}\n`);
        }
        process.exitCode = 5;
        return;
      }

      const exampleInput = EXAMPLE_DATA[normalizedId];

      if (!exampleInput) {
        // Fall back to starter data with a note
        const starterData = getWorkflowStarterData(normalizedId) as Record<string, unknown>;

        if (isJsonMode()) {
          emit({
            workflowId: normalizedId,
            note: "No curated example exists for this workflow yet. Showing starter data template instead. Fill in the fields and use with: pigeongov fill " + normalizedId + " --data <file> --json",
            exampleInput: starterData,
          });
          return;
        }

        process.stdout.write(`\nNo curated example for '${normalizedId}' yet.\n`);
        process.stdout.write(`Showing starter data template instead:\n\n`);
        process.stdout.write(JSON.stringify(starterData, null, 2));
        process.stdout.write(`\n\nFill in the fields and run:\n`);
        process.stdout.write(`  pigeongov fill ${normalizedId} --data <file> --json\n\n`);
        return;
      }

      // Build the bundle from the example data to show the full output
      const bundle = buildWorkflowBundle(normalizedId, exampleInput);

      if (isJsonMode()) {
        emit({
          workflowId: normalizedId,
          exampleInput,
          resultBundle: {
            workflowId: bundle.workflowId,
            domain: bundle.domain,
            title: bundle.title,
            review: bundle.review,
            validation: bundle.validation,
            calculation: bundle.calculation,
          },
        });
        return;
      }

      process.stdout.write(`\nExample: ${normalizedId}\n`);
      process.stdout.write(`${"=".repeat(40)}\n\n`);
      process.stdout.write(`Input data:\n`);
      process.stdout.write(JSON.stringify(exampleInput, null, 2));
      process.stdout.write(`\n\nResult:\n`);
      process.stdout.write(`  ${bundle.review.headline}\n`);
      for (const note of bundle.review.notes) {
        process.stdout.write(`  ${note}\n`);
      }
      if (bundle.validation.flaggedFields.length > 0) {
        process.stdout.write(`\n  ${bundle.validation.flaggedFields.length} flagged field(s)\n`);
      }
      process.stdout.write(`\nRun with --json for full structured output.\n\n`);
    });
}
