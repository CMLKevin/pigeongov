import type { ValidationFlag, WorkflowBundle } from "../types.js";

export const CLI_EXIT_CODES = {
  success: 0,
  runtimeError: 1,
  hasWarnings: 2,
  hasErrors: 3,
} as const;

export function determineExitCode(flags: ValidationFlag[]): number {
  if (flags.some((flag) => flag.severity === "error")) {
    return CLI_EXIT_CODES.hasErrors;
  }
  if (flags.length > 0) {
    return CLI_EXIT_CODES.hasWarnings;
  }
  return CLI_EXIT_CODES.success;
}

export function setExitCodeFromFlags(flags: ValidationFlag[]): void {
  process.exitCode = determineExitCode(flags);
}

export function emitJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function summarizeBundleForMachine(bundle: WorkflowBundle) {
  return {
    workflowId: bundle.workflowId,
    domain: bundle.domain,
    title: bundle.title,
    review: bundle.review,
    validation: bundle.validation,
    flaggedFields: bundle.validation.flaggedFields,
    derived: bundle.derived,
    outputArtifacts: bundle.outputArtifacts,
    calculation: bundle.calculation,
    filledForm: bundle.filledForm,
  };
}
