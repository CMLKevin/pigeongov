"use server";

/**
 * Server Actions for the student-loans pages.
 *
 * Each action writes input to a temp file, shells out to the engine CLI,
 * parses the JSON result, and cleans up. Same pattern as engine.ts but
 * specialised for the advisory commands.
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type {
  SaveTransitionInput,
  SaveTransitionResult,
  PSLFTrackerInput,
  PSLFTrackerResult,
  CompareResult,
} from "./student-loans-types";

const CLI_PATH = join(process.cwd(), "..", "dist", "bin", "pigeongov.js");

function runCli(args: string): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, PIGEONGOV_JSON: "1" },
    cwd: join(process.cwd(), ".."),
  });
}

function withTempFile<T>(data: unknown, fn: (filePath: string) => T): T {
  const tempDir = mkdtempSync(join(tmpdir(), "pigeongov-sl-"));
  const filePath = join(tempDir, "input.json");
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    return fn(filePath);
  } finally {
    try {
      unlinkSync(filePath);
    } catch {
      // best-effort cleanup
    }
  }
}

// ---------------------------------------------------------------------------
// Transition advisor
// ---------------------------------------------------------------------------

export type TransitionActionResult =
  | { ok: true; data: SaveTransitionResult }
  | { ok: false; error: string };

export async function analyzeTransition(
  input: SaveTransitionInput,
): Promise<TransitionActionResult> {
  try {
    return withTempFile(input, (filePath) => {
      const raw = runCli(`student-loans transition --input ${filePath} --json`);
      const data = JSON.parse(raw) as SaveTransitionResult;
      return { ok: true as const, data };
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error running transition analysis";
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// PSLF tracker
// ---------------------------------------------------------------------------

export type PSLFActionResult =
  | { ok: true; data: PSLFTrackerResult }
  | { ok: false; error: string };

export async function trackPSLFAction(
  input: PSLFTrackerInput,
): Promise<PSLFActionResult> {
  try {
    return withTempFile(input, (filePath) => {
      const raw = runCli(`student-loans pslf --input ${filePath} --json`);
      const data = JSON.parse(raw) as PSLFTrackerResult;
      return { ok: true as const, data };
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error running PSLF tracker";
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Plan comparison
// ---------------------------------------------------------------------------

export type CompareActionResult =
  | { ok: true; data: CompareResult }
  | { ok: false; error: string };

export async function comparePlansAction(
  input: SaveTransitionInput,
): Promise<CompareActionResult> {
  try {
    return withTempFile(input, (filePath) => {
      const raw = runCli(`student-loans compare --input ${filePath} --json`);
      const data = JSON.parse(raw) as CompareResult;
      return { ok: true as const, data };
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error running plan comparison";
    return { ok: false, error: message };
  }
}
