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

/**
 * Find the single array property in a wrapper object like `{ workflows: [...] }`.
 * Returns the array if found, otherwise null.
 */
function unwrapSingleArray(data: unknown): unknown[] | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 1 && Array.isArray(entries[0]![1])) {
    return entries[0]![1] as unknown[];
  }
  return null;
}

export function emit(data: unknown): void {
  const opts = currentOptions;

  // For --fields: apply to each item in a single-array wrapper (e.g. { workflows: [...] })
  if (opts.fields && typeof data === "object" && data !== null && !Array.isArray(data)) {
    const innerArray = unwrapSingleArray(data);
    if (innerArray) {
      const filtered = innerArray.map((item) =>
        typeof item === "object" && item !== null && !Array.isArray(item)
          ? selectFields(item as Record<string, unknown>, opts.fields!)
          : item,
      );
      const key = Object.keys(data as Record<string, unknown>)[0]!;
      data = { [key]: filtered };
    } else {
      data = selectFields(data as Record<string, unknown>, opts.fields);
    }
  }

  // For --jsonl: emit items from a single-array wrapper as JSONL
  if (opts.jsonl) {
    const items = Array.isArray(data) ? data : unwrapSingleArray(data);
    if (items) {
      emitJsonl(items);
      return;
    }
  }

  if (opts.json || opts.jsonl) {
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
