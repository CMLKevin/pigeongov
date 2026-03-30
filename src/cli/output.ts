import { PigeonGovError, CLI_EXIT_CODES, emitJson, emitJsonCompact, emitJsonl } from "./support.js";

export interface OutputOptions {
  json: boolean;
  jsonl: boolean;
  compact: boolean;
  full: boolean;
  fields: string | undefined;
  nonInteractive: boolean;
  dryRun: boolean;
  quiet: boolean;
}

let currentOptions: OutputOptions = {
  json: false,
  jsonl: false,
  compact: false,
  full: false,
  fields: undefined,
  nonInteractive: false,
  dryRun: false,
  quiet: false,
};

export function initOutputContext(opts: Partial<OutputOptions>): void {
  const isNonTtyStdout = !process.stdout.isTTY;
  const isNonTtyStdin = !process.stdin.isTTY;

  currentOptions = {
    json: opts.json ?? isNonTtyStdout,
    jsonl: opts.jsonl ?? false,
    compact: opts.compact ?? false,
    full: opts.full ?? false,
    fields: opts.fields,
    nonInteractive: opts.nonInteractive ?? (isNonTtyStdin && isNonTtyStdout),
    dryRun: opts.dryRun ?? false,
    quiet: opts.quiet ?? false,
  };
}

export function getOutputOptions(): Readonly<OutputOptions> {
  return currentOptions;
}

export function isJsonMode(): boolean {
  return currentOptions.json || currentOptions.jsonl;
}

export function isNonInteractive(): boolean {
  return currentOptions.nonInteractive;
}

export function isDryRun(): boolean {
  return currentOptions.dryRun;
}

export function selectFields(
  data: Record<string, unknown>,
  fields: string,
): Record<string, unknown> {
  const keys = fields.split(",").map((k) => k.trim());
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in data) {
      result[key] = data[key];
    }
  }
  return result;
}

export function emit(data: unknown): void {
  const opts = currentOptions;

  if (opts.fields && typeof data === "object" && data !== null && !Array.isArray(data)) {
    data = selectFields(data as Record<string, unknown>, opts.fields);
  }

  if (opts.jsonl && Array.isArray(data)) {
    emitJsonl(data);
  } else if (opts.json || opts.jsonl) {
    if (opts.compact) {
      emitJsonCompact(data);
    } else {
      emitJson(data);
    }
  } else {
    emitJson(data);
  }
}

export function emitError(error: unknown): void {
  const pgError =
    error instanceof PigeonGovError
      ? error
      : new PigeonGovError({
          code: "runtime_error",
          message: error instanceof Error ? error.message : String(error),
          exitCode: CLI_EXIT_CODES.runtimeError,
        });

  process.exitCode = pgError.exitCode;

  if (isJsonMode()) {
    process.stderr.write(`${JSON.stringify(pgError.toShape())}\n`);
  } else {
    process.stderr.write(`Error: ${pgError.message}\n`);
    if (pgError.suggestion) {
      process.stderr.write(`Suggestion: ${pgError.suggestion}\n`);
    }
  }
}

export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}

export async function readStdinJson<T = unknown>(): Promise<T> {
  const raw = await readStdin();
  return JSON.parse(raw) as T;
}

export async function readStdinJsonl<T = unknown>(): Promise<T[]> {
  const raw = await readStdin();
  return raw
    .trim()
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}
