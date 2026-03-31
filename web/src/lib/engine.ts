/**
 * Server-side bridge to the PigeonGov CLI engine.
 *
 * Rather than importing the engine's TypeScript modules directly (which would
 * require wiring zod and a bunch of Node-only code into the Next.js module
 * graph), we shell out to the compiled CLI. A bit slower, but guaranteed to
 * work and keeps the web app decoupled from engine internals.
 *
 * Every function here is async and meant for Server Components / Server Actions.
 *
 * Workflow descriptions and the workflow list are cached in-memory because they
 * never change at runtime — the registry is baked into the CLI build. This
 * turns subsequent reads into Map lookups instead of child-process spawns.
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type {
  WorkflowSummary,
  WorkflowDescription,
  WorkflowBundle,
} from "./types";

const CLI_PATH = join(process.cwd(), "..", "dist", "bin", "pigeongov.js");

function runCli(args: string): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    encoding: "utf-8",
    timeout: 30_000,
    cwd: join(process.cwd(), ".."),
  });
}

// ---------------------------------------------------------------------------
// In-memory caches — safe because workflow definitions are immutable at runtime
// ---------------------------------------------------------------------------

const listCache = new Map<string, WorkflowSummary[]>();
const descriptionCache = new Map<string, WorkflowDescription>();

/**
 * List all available workflows.
 */
export function listWorkflows(domain?: string): WorkflowSummary[] {
  const cacheKey = domain ?? "__all__";
  if (listCache.has(cacheKey)) {
    return listCache.get(cacheKey)!;
  }

  const domainFlag = domain ? ` --domain ${domain}` : "";
  const raw = runCli(`list --json${domainFlag}`);
  const parsed = JSON.parse(raw) as { workflows: WorkflowSummary[] };
  listCache.set(cacheKey, parsed.workflows);
  return parsed.workflows;
}

/**
 * Get the full description of a workflow including sections, fields, and starter data.
 */
export function describeWorkflow(workflowId: string): WorkflowDescription {
  if (descriptionCache.has(workflowId)) {
    return descriptionCache.get(workflowId)!;
  }

  const raw = runCli(`start ${workflowId} --json`);
  const parsed = JSON.parse(raw) as {
    workflow: WorkflowDescription;
    starterData: Record<string, unknown>;
  };
  const result: WorkflowDescription = {
    ...parsed.workflow,
    starterData: parsed.starterData,
  };
  descriptionCache.set(workflowId, result);
  return result;
}

/**
 * Fill a workflow with data and return the validated bundle.
 *
 * Writes the answers to a temp file, invokes the CLI, parses the result,
 * and cleans up.
 *
 * The CLI exits non-zero (2 = warnings, 3 = validation errors) but still
 * outputs a valid JSON bundle to stdout. We catch the exec error and
 * extract stdout from it, so partial-success results still surface in
 * the review screen rather than silently failing.
 */
export function fillWorkflow(
  workflowId: string,
  data: Record<string, unknown>
): WorkflowBundle {
  const tempDir = mkdtempSync(join(tmpdir(), "pigeongov-"));
  const dataPath = join(tempDir, "input.json");

  try {
    writeFileSync(dataPath, JSON.stringify(data, null, 2));

    try {
      const raw = runCli(
        `fill ${workflowId} --data ${dataPath} --json --no-interactive --quiet`
      );
      return JSON.parse(raw) as WorkflowBundle;
    } catch (execError: unknown) {
      // The CLI exits 2 or 3 for warnings/errors but still emits JSON to stdout.
      // execSync captures stdout on the error object.
      const err = execError as { stdout?: string; stderr?: string; message?: string };
      if (err.stdout) {
        try {
          return JSON.parse(err.stdout) as WorkflowBundle;
        } catch {
          // stdout wasn't valid JSON -- fall through to rethrow
        }
      }
      throw new Error(
        err.stderr?.trim() || err.message || "CLI fill command failed"
      );
    }
  } finally {
    try {
      unlinkSync(dataPath);
    } catch {
      // Best-effort cleanup
    }
  }
}
