import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import type { PluginEntry, PluginManifest } from "./types.js";
import { isWorkflowPlugin } from "./types.js";

const PIGEONGOV_DIR = path.join(homedir(), ".pigeongov");
const MANIFEST_PATH = path.join(PIGEONGOV_DIR, "plugins.json");

function ensureDir(): void {
  if (!existsSync(PIGEONGOV_DIR)) {
    mkdirSync(PIGEONGOV_DIR, { recursive: true });
  }
}

export function getPluginManifest(): PluginManifest {
  ensureDir();
  if (!existsSync(MANIFEST_PATH)) {
    const empty: PluginManifest = { version: 1, plugins: [] };
    savePluginManifest(empty);
    return empty;
  }
  const raw = readFileSync(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw) as PluginManifest;
}

export function savePluginManifest(manifest: PluginManifest): void {
  ensureDir();
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

export function loadPlugins(): PluginEntry[] {
  const manifest = getPluginManifest();
  return manifest.plugins.filter((p) => p.enabled);
}

/**
 * Dynamically import a plugin package, validate its shape,
 * and return the workflows it provides.
 */
export async function registerPluginWorkflows(
  entry: PluginEntry,
): Promise<{ registered: number; errors: string[] }> {
  const errors: string[] = [];
  let registered = 0;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod = await import(entry.packagePath);
    // Support both default and named export patterns
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const plugin = mod.default ?? mod.plugin ?? mod;

    if (!isWorkflowPlugin(plugin)) {
      errors.push(
        `Plugin "${entry.name}" does not export a valid WorkflowPlugin shape`,
      );
      return { registered, errors };
    }

    // In a full implementation the workflows would be injected into the
    // runtime registry. For now we just count them as successfully
    // validated — the registry integration comes next.
    registered = plugin.workflows.length;
  } catch (err) {
    errors.push(
      `Failed to load plugin "${entry.name}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { registered, errors };
}

export function addPluginEntry(entry: PluginEntry): void {
  const manifest = getPluginManifest();
  const existing = manifest.plugins.findIndex((p) => p.name === entry.name);
  if (existing >= 0) {
    manifest.plugins[existing] = entry;
  } else {
    manifest.plugins.push(entry);
  }
  savePluginManifest(manifest);
}

export function removePluginEntry(name: string): boolean {
  const manifest = getPluginManifest();
  const idx = manifest.plugins.findIndex((p) => p.name === name);
  if (idx < 0) return false;
  manifest.plugins.splice(idx, 1);
  savePluginManifest(manifest);
  return true;
}

export function setPluginEnabled(name: string, enabled: boolean): boolean {
  const manifest = getPluginManifest();
  const entry = manifest.plugins.find((p) => p.name === name);
  if (!entry) return false;
  entry.enabled = enabled;
  savePluginManifest(manifest);
  return true;
}
