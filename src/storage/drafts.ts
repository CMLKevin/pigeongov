import { randomUUID } from "node:crypto";
import { readdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { join } from "node:path";

import type { DraftMetadata } from "../types.js";
import { getDraftsDir, ensureDir } from "./paths.js";

/**
 * Save a draft of an in-progress workflow.
 * Returns the draft metadata (including the generated id).
 */
export async function saveDraft(
  workflowId: string,
  answers: Record<string, unknown>,
  completedSections: string[],
): Promise<DraftMetadata> {
  const draftsDir = getDraftsDir();
  await ensureDir(draftsDir);

  const id = randomUUID();
  const now = new Date().toISOString();

  const draft: DraftMetadata = {
    id,
    workflowId,
    schemaVersion: "1.0.0",
    answers,
    completedSections,
    createdAt: now,
    updatedAt: now,
  };

  const filePath = join(draftsDir, `${id}.json`);
  await writeFile(filePath, JSON.stringify(draft, null, 2), "utf-8");

  return draft;
}

/**
 * List all saved drafts, optionally filtered by workflow id.
 * Sorted by most-recently-updated first.
 */
export async function listDrafts(workflowId?: string): Promise<DraftMetadata[]> {
  const draftsDir = getDraftsDir();
  await ensureDir(draftsDir);

  let entries: string[];
  try {
    entries = await readdir(draftsDir);
  } catch {
    return [];
  }

  const jsonFiles = entries.filter((f) => f.endsWith(".json"));
  const drafts: DraftMetadata[] = [];

  for (const file of jsonFiles) {
    try {
      const raw = await readFile(join(draftsDir, file), "utf-8");
      const draft = JSON.parse(raw) as DraftMetadata;
      if (!workflowId || draft.workflowId === workflowId) {
        drafts.push(draft);
      }
    } catch {
      // skip malformed files
    }
  }

  drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return drafts;
}

/**
 * Load a specific draft by its id.
 */
export async function loadDraft(draftId: string): Promise<DraftMetadata | null> {
  const filePath = join(getDraftsDir(), `${draftId}.json`);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as DraftMetadata;
  } catch {
    return null;
  }
}

/**
 * Delete a draft by its id.
 * Returns true if the file was deleted, false if it didn't exist.
 */
export async function deleteDraft(draftId: string): Promise<boolean> {
  const filePath = join(getDraftsDir(), `${draftId}.json`);
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove all drafts older than `olderThanDays` days.
 * Returns the number of drafts removed.
 */
export async function cleanupDrafts(olderThanDays: number): Promise<number> {
  const draftsDir = getDraftsDir();
  await ensureDir(draftsDir);

  let entries: string[];
  try {
    entries = await readdir(draftsDir);
  } catch {
    return 0;
  }

  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let removed = 0;

  for (const file of entries.filter((f) => f.endsWith(".json"))) {
    const filePath = join(draftsDir, file);
    try {
      const raw = await readFile(filePath, "utf-8");
      const draft = JSON.parse(raw) as DraftMetadata;
      if (new Date(draft.updatedAt).getTime() < cutoff) {
        await unlink(filePath);
        removed++;
      }
    } catch {
      // skip files we can't parse — don't remove them either
    }
  }

  return removed;
}
