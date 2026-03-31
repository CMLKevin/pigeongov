import { readFile } from "node:fs/promises";

import type { Command } from "commander";
import { z } from "zod";

import {
  buildReview,
  fillDataSchema,
  loadWorkflowInput,
} from "./fill.js";
import { buildReturnBundle } from "../../engine/field-mapper.js";
import { validateReturnBundle } from "../../engine/validator.js";
import { summarizeBundleForMachine } from "../support.js";
import { emit } from "../output.js";
import {
  buildWorkflowBundle,
  describeWorkflow,
  getWorkflowStarterData,
  listWorkflowSummaries,
  normalizeWorkflowId,
} from "../../workflows/registry.js";
import { saveWorkflowBundle } from "../../workflows/io.js";

export function registerMachineCommand(program: Command): void {
  const machine = program
    .command("machine")
    .description("Machine-oriented PigeonGov commands for local adapters");

  machine
    .command("render-1040")
    .description("Render a 1040 bundle, validation, and review JSON without saving files")
    .requiredOption("--data <path>", "JSON file with pre-filled data")
    .action(async (options: { data: string }) => {
      const workflowInput = await loadWorkflowInput(options.data);
      const bundle = buildReturnBundle(workflowInput);
      const validation = validateReturnBundle(bundle);
      const review = buildReview(bundle, validation);

      console.log(
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
    });

  machine
    .command("validate-json")
    .description("Validate a filled PigeonGov JSON file and return the raw validation payload")
    .requiredOption("--file <path>", "Filled JSON file")
    .action(async (options: { file: string }) => {
      const parsed = JSON.parse(await readFile(options.file, "utf8")) as {
        validation: unknown;
      };
      console.log(JSON.stringify(parsed.validation, null, 2));
    });

  machine
    .command("schema-fill-input")
    .description("Print the expected JSON shape for non-interactive 1040 fill")
    .action(() => {
      console.log(JSON.stringify(z.toJSONSchema(fillDataSchema), null, 2));
    });

  machine
    .command("workflow-catalog")
    .description("Print the workflow catalog for TUI and browser adapters")
    .action(() => {
      emit({ workflows: listWorkflowSummaries() });
    });

  machine
    .command("describe-workflow")
    .description("Describe a workflow schema and starter data")
    .requiredOption("--workflow <id>", "Workflow ID")
    .action((options: { workflow: string }) => {
      const workflowId = normalizeWorkflowId(options.workflow);
      emit(describeWorkflow(workflowId));
    });

  machine
    .command("start-workflow")
    .description("Emit starter data for a workflow")
    .requiredOption("--workflow <id>", "Workflow ID")
    .action((options: { workflow: string }) => {
      const workflowId = normalizeWorkflowId(options.workflow);
      emit({
        workflowId,
        starterData: getWorkflowStarterData(workflowId),
      });
    });

  machine
    .command("render-workflow")
    .description("Render a workflow bundle from JSON input without saving files")
    .requiredOption("--workflow <id>", "Workflow ID")
    .requiredOption("--data <path>", "Path to JSON data")
    .action(async (options: { workflow: string; data: string }) => {
      const workflowId = normalizeWorkflowId(options.workflow);
      const parsed = JSON.parse(await readFile(options.data, "utf8")) as unknown;
      const bundle = buildWorkflowBundle(
        workflowId,
        typeof parsed === "object" && parsed !== null && "data" in parsed
          ? (parsed as { data: unknown }).data
          : parsed,
      );
      emit(summarizeBundleForMachine(bundle));
    });

  machine
    .command("save-workflow")
    .description("Build and save a workflow bundle from JSON input")
    .requiredOption("--workflow <id>", "Workflow ID")
    .requiredOption("--data <path>", "Path to JSON data")
    .requiredOption("--output <path>", "Output directory")
    .option("--format <format>", "Output format", "json")
    .action(
      async (options: {
        workflow: string;
        data: string;
        output: string;
        format: "json" | "pdf" | "both";
      }) => {
        const workflowId = normalizeWorkflowId(options.workflow);
        const parsed = JSON.parse(await readFile(options.data, "utf8")) as unknown;
        const bundle = buildWorkflowBundle(
          workflowId,
          typeof parsed === "object" && parsed !== null && "data" in parsed
            ? (parsed as { data: unknown }).data
            : parsed,
        );
        const saved = await saveWorkflowBundle(bundle, options.output, options.format);
        emit({ saved, bundle: summarizeBundleForMachine(bundle) });
      },
    );
}
