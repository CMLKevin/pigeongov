import type { PigeonGovErrorShape, ValidationFlag, WorkflowBundle } from "../types.js";

export const CLI_EXIT_CODES = {
  success: 0,
  runtimeError: 1,
  hasWarnings: 2,
  hasErrors: 3,
  invalidInput: 4,
  notFound: 5,
  permissionDenied: 6,
  conflict: 7,
  schemaError: 8,
  dependencyMissing: 9,
  timeout: 10,
} as const;

export type ExitCode = (typeof CLI_EXIT_CODES)[keyof typeof CLI_EXIT_CODES];

export class PigeonGovError extends Error {
  public readonly code: string;
  public readonly exitCode: ExitCode;
  public readonly field?: string | undefined;
  public readonly suggestion?: string | undefined;
  public readonly retryable: boolean;
  public readonly docs?: string | undefined;

  constructor(opts: {
    code: string;
    message: string;
    exitCode?: ExitCode;
    field?: string;
    suggestion?: string;
    retryable?: boolean;
    docs?: string;
  }) {
    super(opts.message);
    this.name = "PigeonGovError";
    this.code = opts.code;
    this.exitCode = opts.exitCode ?? CLI_EXIT_CODES.runtimeError;
    this.field = opts.field;
    this.suggestion = opts.suggestion;
    this.retryable = opts.retryable ?? false;
    this.docs = opts.docs;
  }

  toShape(): PigeonGovErrorShape {
    return {
      error: this.code,
      message: this.message,
      field: this.field,
      suggestion: this.suggestion,
      retryable: this.retryable,
      docs: this.docs,
      exitCode: this.exitCode,
    };
  }
}

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

export function emitJsonCompact(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data)}\n`);
}

export function emitJsonl(items: unknown[]): void {
  for (const item of items) {
    process.stdout.write(`${JSON.stringify(item)}\n`);
  }
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
