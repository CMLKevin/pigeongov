import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import chalk from "chalk";
import type { Command } from "commander";
import { z } from "zod";

import { buildReturnBundle, type BuildReturnBundleInput } from "../../engine/field-mapper.js";
import { validateReturnBundle } from "../../engine/validator.js";
import { readPdfDocument } from "../../pdf/reader.js";
import {
  buildReviewFooter,
  createReviewPdf,
  summarizeReviewSections,
} from "../../pdf/writer.js";
import type { ImportedDocument, ReviewSummary } from "../../types.js";
import { renderCalculationSummary } from "../display/summary.js";
import { renderReview } from "../display/review.js";
import { renderValidation } from "../display/validation.js";
import { collectDependents } from "../prompts/credits.js";
import { collectDeductions } from "../prompts/deductions.js";
import { collectIdentity } from "../prompts/identity.js";
import { collectIncome, mergeImportedIncome } from "../prompts/income.js";
import {
  defaultPromptClient,
  formatCurrency,
  type PromptClient,
} from "../prompts/common.js";
import { collectWorkflowData } from "../prompts/workflow.js";
import { emitJson, setExitCodeFromFlags, summarizeBundleForMachine } from "../support.js";
import { isJsonMode } from "../output.js";
import { shouldUseTui, tryLaunchTuiFill } from "../tui.js";
import {
  buildWorkflowBundle,
  describeWorkflow,
  getWorkflowStarterData,
  normalizeWorkflowId,
} from "../../workflows/registry.js";
import { loadWorkflowBundle, saveWorkflowBundle } from "../../workflows/io.js";

export const fillDataSchema = z
  .object({
    taxpayer: z.any(),
    spouse: z.any().optional(),
    dependents: z.array(z.any()).default([]),
    taxInput: z.any(),
    importedDocuments: z.array(z.any()).default([]),
  })
  .strict();

const legacyTaxInputDataSchema = z
  .object({
    filingStatus: z.enum([
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
      "qualifying_surviving_spouse",
    ]),
    wages: z.coerce.number().default(0),
    taxableInterest: z.coerce.number().default(0),
    ordinaryDividends: z.coerce.number().default(0),
    scheduleCNet: z.coerce.number().default(0),
    otherIncome: z.coerce.number().default(0),
    adjustments: z
      .object({
        educatorExpenses: z.coerce.number().default(0),
        hsaDeduction: z.coerce.number().default(0),
        selfEmploymentTaxDeduction: z.coerce.number().default(0),
        iraDeduction: z.coerce.number().default(0),
        studentLoanInterest: z.coerce.number().default(0),
      })
      .strict()
      .default({
        educatorExpenses: 0,
        hsaDeduction: 0,
        selfEmploymentTaxDeduction: 0,
        iraDeduction: 0,
        studentLoanInterest: 0,
      }),
    useItemizedDeductions: z.boolean().default(false),
    itemizedDeductions: z.coerce.number().default(0),
    dependents: z.array(z.any()).default([]),
    federalWithheld: z.coerce.number().default(0),
    estimatedPayments: z.coerce.number().default(0),
    expected: z.unknown().optional(),
  })
  .strict();

export interface FilledReturnFile {
  formId: "1040";
  taxYear: 2025;
  bundle: ReturnType<typeof buildReturnBundle>;
  validation: ReturnType<typeof validateReturnBundle>;
  review: ReviewSummary;
  flaggedFields: ImportedDocument[] | ReturnType<typeof validateReturnBundle>["flaggedFields"];
}

function isLegacy1040WorkflowId(formId: string): boolean {
  return formId === "1040" || formId === "tax/1040";
}

async function loadImportedDocuments(paths: string[]): Promise<ImportedDocument[]> {
  const documents: ImportedDocument[] = [];
  for (const filePath of paths) {
    const result = await readPdfDocument(filePath);
    if (result.detectedType !== "unknown") {
      documents.push(result.document as ImportedDocument);
    }
  }
  return documents;
}

export async function fill1040Workflow(
  prompts: PromptClient = defaultPromptClient,
  importedPaths: string[] = [],
): Promise<BuildReturnBundleInput> {
  const identity = await collectIdentity(prompts);
  const income = await collectIncome(prompts);
  const importedDocuments = await loadImportedDocuments([...importedPaths, ...income.importedPaths]);
  const importedTotals = mergeImportedIncome(importedDocuments);
  const deductions = await collectDeductions(prompts);
  const dependents = await collectDependents(prompts);
  const scheduleCNet =
    importedTotals.scheduleCGrossReceipts +
    income.scheduleCGrossReceipts -
    income.scheduleCExpenses;

  const workflowInput: BuildReturnBundleInput = {
    formId: "1040",
    taxYear: 2025,
    filingStatus: identity.filingStatus,
    taxpayer: identity.taxpayer,
    dependents,
    importedDocuments,
    taxInput: {
      filingStatus: identity.filingStatus,
      wages: importedTotals.wages,
      taxableInterest: importedTotals.taxableInterest + income.taxableInterest,
      ordinaryDividends: income.ordinaryDividends,
      scheduleCNet,
      otherIncome: income.otherIncome,
      adjustments: deductions.adjustments,
      useItemizedDeductions: deductions.useItemizedDeductions,
      itemizedDeductions: deductions.itemizedDeductions,
      dependents,
      federalWithheld: importedTotals.federalWithheld,
      estimatedPayments: 0,
    },
  };

  if (identity.spouse) {
    workflowInput.spouse = identity.spouse;
  }

  return workflowInput;
}

export function buildReview(
  bundle: ReturnType<typeof buildReturnBundle>,
  validation: ReturnType<typeof validateReturnBundle>,
): ReviewSummary {
  return {
    headline:
      bundle.calculation.refund > 0
        ? `Refund expected: ${formatCurrency(bundle.calculation.refund)}`
        : `Amount owed: ${formatCurrency(bundle.calculation.amountOwed)}`,
    notes: [
      `Gross income ${formatCurrency(bundle.calculation.grossIncome)}`,
      `Taxable income ${formatCurrency(bundle.calculation.taxableIncome)}`,
      `Federal tax ${formatCurrency(bundle.calculation.federalTax)}`,
    ],
    flaggedFields: validation.flaggedFields,
  };
}

async function saveOutputs(
  outputDir: string,
  format: "json" | "pdf" | "both",
  bundle: ReturnType<typeof buildReturnBundle>,
  validation: ReturnType<typeof validateReturnBundle>,
  review: ReviewSummary,
): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });
  const saved: string[] = [];
  const baseName = `${bundle.formId}-${bundle.taxYear}-filled`;
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);

  if (format === "json" || format === "both") {
    await writeFile(
      jsonPath,
      JSON.stringify(
        {
          formId: bundle.formId,
          taxYear: bundle.taxYear,
          bundle,
          validation,
          review,
          flaggedFields: validation.flaggedFields,
        },
        null,
        2,
      ),
    );
    saved.push(jsonPath);
  }

  if (format === "pdf" || format === "both") {
    const pdfBytes = await createReviewPdf({
      headline: review.headline,
      title: `PigeonGov ${bundle.formId} review`,
      subtitle: `${bundle.taxYear} tax year`,
      notes: review.notes,
      flaggedFields: validation.flaggedFields,
      sections: summarizeReviewSections(review),
      footer: buildReviewFooter(validation.flaggedFields),
    });
    await writeFile(pdfPath, pdfBytes);
    saved.push(pdfPath);
  }

  return saved;
}

function renderGenericWorkflowSummary(bundle: ReturnType<typeof buildWorkflowBundle>): string {
  const titleLine = ` ${bundle.title} `;
  const W = Math.max(titleLine.length + 4, 44);
  const top = chalk.dim(`\u250c${"═".repeat(W)}\u2510`);
  const bottom = chalk.dim(`\u2514${"═".repeat(W)}\u2518`);

  const lines = [
    "",
    top,
    `${chalk.dim("\u2502")} ${chalk.bold(titleLine)}${" ".repeat(Math.max(0, W - titleLine.length - 1))}${chalk.dim("\u2502")}`,
    bottom,
    "",
  ];

  // Review headline with color
  const isRefund = bundle.review.headline.toLowerCase().includes("refund");
  const headlineColor = isRefund ? chalk.green.bold : chalk.yellow.bold;
  lines.push(headlineColor(bundle.review.headline));

  for (const note of bundle.review.notes) {
    lines.push(`  ${chalk.dim("\u2502")} ${note}`);
  }

  return lines.join("\n");
}

async function loadFillInputForWorkflow(workflowId: string, dataPath: string): Promise<unknown> {
  if (isLegacy1040WorkflowId(workflowId)) {
    return loadWorkflowInput(dataPath);
  }

  const rawInput = JSON.parse(await readFile(dataPath, "utf8")) as unknown;
  if (typeof rawInput === "object" && rawInput !== null && "data" in rawInput) {
    return (rawInput as { data: unknown }).data;
  }
  return rawInput;
}

export async function loadWorkflowInput(dataPath: string): Promise<BuildReturnBundleInput> {
  const rawInput = JSON.parse(await readFile(dataPath, "utf8")) as unknown;
  const parsedEnvelope = fillDataSchema.safeParse(rawInput);
  if (!parsedEnvelope.success) {
    const parsedLegacy = legacyTaxInputDataSchema.safeParse(rawInput);
    if (parsedLegacy.success) {
      return {
        formId: "1040",
        taxYear: 2025,
        filingStatus: parsedLegacy.data.filingStatus,
        taxpayer: {
          firstName: "PigeonGov",
          lastName: "Taxpayer",
          ssn: "000-00-0000",
          address: {
            street1: "Unknown",
            city: "Unknown",
            state: "CA",
            zipCode: "00000",
          },
        },
        dependents: parsedLegacy.data.dependents,
        importedDocuments: [],
        taxInput: {
          filingStatus: parsedLegacy.data.filingStatus,
          wages: parsedLegacy.data.wages,
          taxableInterest: parsedLegacy.data.taxableInterest,
          ordinaryDividends: parsedLegacy.data.ordinaryDividends,
          scheduleCNet: parsedLegacy.data.scheduleCNet,
          otherIncome: parsedLegacy.data.otherIncome,
          adjustments: parsedLegacy.data.adjustments,
          useItemizedDeductions: parsedLegacy.data.useItemizedDeductions,
          itemizedDeductions: parsedLegacy.data.itemizedDeductions,
          dependents: parsedLegacy.data.dependents,
          federalWithheld: parsedLegacy.data.federalWithheld,
          estimatedPayments: parsedLegacy.data.estimatedPayments,
        },
      };
    }

    // Try the starterData / TaxWorkflowInput format (flat object with both taxpayer
    // and tax fields at the top level — produced by `pigeongov start tax/1040`)
    if (
      typeof rawInput === "object" &&
      rawInput !== null &&
      "taxpayer" in rawInput &&
      "filingStatus" in rawInput
    ) {
      const flat = rawInput as Record<string, unknown>;
      const taxpayer = flat.taxpayer as BuildReturnBundleInput["taxpayer"];
      const dependents = Array.isArray(flat.dependents) ? flat.dependents : [];
      const filingStatus = flat.filingStatus as BuildReturnBundleInput["filingStatus"];
      const num = (key: string) => Number(flat[key]) || 0;
      const adjustments = (flat.adjustments ?? {}) as Record<string, number>;

      const result: BuildReturnBundleInput = {
        formId: "1040",
        taxYear: 2025,
        filingStatus,
        taxpayer,
        dependents,
        importedDocuments: [],
        taxInput: {
          filingStatus,
          wages: num("wages"),
          taxableInterest: num("taxableInterest"),
          ordinaryDividends: num("ordinaryDividends"),
          scheduleCNet: num("scheduleCNet"),
          otherIncome: num("otherIncome"),
          adjustments: {
            educatorExpenses: Number(adjustments.educatorExpenses) || 0,
            hsaDeduction: Number(adjustments.hsaDeduction) || 0,
            selfEmploymentTaxDeduction: Number(adjustments.selfEmploymentTaxDeduction) || 0,
            iraDeduction: Number(adjustments.iraDeduction) || 0,
            studentLoanInterest: Number(adjustments.studentLoanInterest) || 0,
          },
          useItemizedDeductions: Boolean(flat.useItemizedDeductions),
          itemizedDeductions: num("itemizedDeductions"),
          dependents,
          federalWithheld: num("federalWithheld"),
          estimatedPayments: num("estimatedPayments"),
        },
      };

      if (flat.spouse) {
        result.spouse = flat.spouse as NonNullable<BuildReturnBundleInput["spouse"]>;
      }

      return result;
    }

    throw parsedEnvelope.error;
  }

  const parsed = parsedEnvelope.data;
  const workflowInput: BuildReturnBundleInput = {
    formId: "1040",
    taxYear: 2025,
    filingStatus: parsed.taxInput.filingStatus,
    taxpayer: parsed.taxpayer,
    dependents: parsed.dependents,
    importedDocuments: parsed.importedDocuments,
    taxInput: parsed.taxInput,
  };

  if (parsed.spouse) {
    workflowInput.spouse = parsed.spouse;
  }

  return workflowInput;
}

export function registerFillCommand(program: Command): void {
  program
    .command("fill <workflowId>")
    .description(
      `Fill a workflow with data and produce a validated bundle.

  This is the main command for completing government workflows. It accepts
  a workflow ID (e.g., tax/1040, immigration/family-visa-intake) and either
  launches an interactive questionnaire or processes a JSON data file.

  Pipeline:  list → start → fill → validate → review

  Non-interactive usage (for agents):
    1. Run 'pigeongov start <id> --json' to get the data template
    2. Fill in the template fields
    3. Run 'pigeongov fill <id> --data <file> --json'

  The --data flag expects a JSON file matching the starter data shape from
  'pigeongov start'. For tax/1040, this includes taxpayer info, income
  fields, adjustments, and deductions. Use 'pigeongov start <id> --json'
  to see the exact schema with field descriptions.

  Exit codes: 0 = success, 2 = warnings, 3 = validation errors

  Examples:
    $ pigeongov fill tax/1040                           # interactive TUI
    $ pigeongov fill tax/1040 --data input.json --json  # non-interactive
    $ pigeongov fill immigration/i-130 --data i130.json --json`,
    )
    .option("--year <year>", "Workflow year", "2025")
    .option("--output <path>", "Output directory", ".")
    .option("--format <format>", "Output format", "json")
    .option("--import <paths...>", "Pre-import W-2/1099 PDFs before prompting")
    .option("--no-interactive", "Skip prompts and require --data")
    .option("--no-tui", "Disable the Go TUI and use Node prompts instead")
    .option("--quiet", "Suppress human-oriented console output")
    .option("--resume <path>", "Resume from an existing workflow bundle JSON")
    .option("--from-bundle <path>", "Use a saved workflow bundle as the input source")
    .option("--data <path>", "JSON file with pre-filled data")
    .action(async (workflowId, options) => {
      const normalizedWorkflowId = normalizeWorkflowId(String(workflowId));

      // When --data is provided, skip interactive/TUI entirely
      const hasDataFile = Boolean(options.data);
      const hasResume = Boolean(options.resume || options.fromBundle);

      if (
        !hasDataFile &&
        !hasResume &&
        shouldUseTui(
          {
            formId: isLegacy1040WorkflowId(normalizedWorkflowId) ? "1040" : normalizedWorkflowId,
            interactive: options.interactive !== false,
            tui: options.tui !== false,
          },
          {
            stdinIsTty: Boolean(process.stdin.isTTY),
            stdoutIsTty: Boolean(process.stdout.isTTY),
          },
        )
      ) {
        const launched = await tryLaunchTuiFill({
          formId: normalizedWorkflowId,
          cwd: process.cwd(),
          output: options.output,
          format: options.format,
        });
        if (launched) {
          return;
        }
      }

      // --data implies non-interactive
      const isInteractive = options.interactive !== false && !hasDataFile;

      if (!options.quiet && !isJsonMode()) {
        console.log(chalk.bold(`PigeonGov v0.2.2 — ${normalizedWorkflowId}`));
      }

      if (isLegacy1040WorkflowId(normalizedWorkflowId)) {
        const workflowInput =
          hasResume
            ? await loadWorkflowBundle(String(options.resume ?? options.fromBundle))
            : hasDataFile
              ? await loadWorkflowInput(String(options.data))
              : await fill1040Workflow(defaultPromptClient, options.import ?? []);

        const bundle =
          "workflowId" in (workflowInput as object)
            ? (workflowInput as Awaited<ReturnType<typeof loadWorkflowBundle>>)
            : buildWorkflowBundle(normalizedWorkflowId, {
                taxpayer: (workflowInput as BuildReturnBundleInput).taxpayer,
                spouse: (workflowInput as BuildReturnBundleInput).spouse,
                dependents: (workflowInput as BuildReturnBundleInput).dependents,
                ...((workflowInput as BuildReturnBundleInput).taxInput as object),
              });

        if (isJsonMode()) {
          emitJson(summarizeBundleForMachine(bundle));
          setExitCodeFromFlags(bundle.validation.flaggedFields);
          return;
        }

        if (!options.quiet) {
          if (bundle.calculation) {
            console.log(renderCalculationSummary(bundle.calculation as never));
            console.log("");
          }
          console.log(renderValidation(bundle.validation as never));
          console.log("");
          console.log(renderReview(bundle.review));
        }

        const saveFormat =
          !isInteractive
            ? (options.format as "json" | "pdf" | "both")
            : await defaultPromptClient.select("Save as", [
                { name: "json", value: "json" },
                { name: "pdf", value: "pdf" },
                { name: "both", value: "both" },
              ]);

        const saved = await saveWorkflowBundle(bundle, String(options.output), saveFormat);
        if (!options.quiet) {
          for (const filePath of saved) {
            console.log(chalk.green(`\u2713 Saved: ${filePath}`));
          }
          console.log("Review your return before filing.");
          console.log("PigeonGov does not submit to the IRS.");
        }
        setExitCodeFromFlags(bundle.validation.flaggedFields);
        return;
      }

      const definition = describeWorkflow(normalizedWorkflowId);
      const workflowData =
        hasResume
          ? (await loadWorkflowBundle(String(options.resume ?? options.fromBundle))).answers
          : hasDataFile
            ? await loadFillInputForWorkflow(normalizedWorkflowId, String(options.data))
            : await collectWorkflowData(
                defaultPromptClient,
                definition.sections,
                getWorkflowStarterData(normalizedWorkflowId),
              );

      const workflowBundle = buildWorkflowBundle(normalizedWorkflowId, workflowData);

      if (isJsonMode()) {
        emitJson(summarizeBundleForMachine(workflowBundle));
        setExitCodeFromFlags(workflowBundle.validation.flaggedFields);
        return;
      }

      if (!options.quiet) {
        console.log(renderGenericWorkflowSummary(workflowBundle));
        console.log("");
        console.log(renderValidation(workflowBundle.validation as never));
        console.log("");
        console.log(renderReview(workflowBundle.review));
      }

      const saved = await saveWorkflowBundle(
        workflowBundle,
        String(options.output),
        !isInteractive
          ? (options.format as "json" | "pdf" | "both")
          : await defaultPromptClient.select("Save as", [
              { name: "json", value: "json" },
              { name: "pdf", value: "pdf" },
              { name: "both", value: "both" },
            ]),
      );

      if (!options.quiet) {
        for (const filePath of saved) {
          console.log(chalk.green(`\u2713 Saved: ${filePath}`));
        }
        console.log("Review the workflow packet before submitting anything to an agency.");
        console.log("PigeonGov never submits on your behalf.");
      }
      setExitCodeFromFlags(workflowBundle.validation.flaggedFields);
    });
}
