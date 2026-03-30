import type { WorkflowPlugin } from "../types.js";

export interface PluginManifest {
  version: 1;
  plugins: PluginEntry[];
}

export interface PluginEntry {
  name: string;
  version: string;
  packagePath: string;
  installedAt: string;
  enabled: boolean;
}

/**
 * Shape guard: runtime check that a module's default export
 * looks like a WorkflowPlugin before we trust it.
 */
export function isWorkflowPlugin(value: unknown): value is WorkflowPlugin {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["name"] === "string" &&
    typeof obj["version"] === "string" &&
    Array.isArray(obj["workflows"])
  );
}
