import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

/**
 * Root directory for all PigeonGov local data.
 * Respects `PIGEONGOV_HOME` env override; defaults to `~/.pigeongov/`.
 */
export const PIGEONGOV_HOME: string =
  process.env.PIGEONGOV_HOME ?? join(homedir(), ".pigeongov");

export function getDraftsDir(): string {
  return join(PIGEONGOV_HOME, "drafts");
}

export function getVaultDir(): string {
  return join(PIGEONGOV_HOME, "vault");
}

export function getProfilePath(): string {
  return join(PIGEONGOV_HOME, "profile.json");
}

export function getConfigPath(): string {
  return join(PIGEONGOV_HOME, "config.json");
}

export function getPluginsPath(): string {
  return join(PIGEONGOV_HOME, "plugins.json");
}

export function getAuditLogPath(): string {
  return join(PIGEONGOV_HOME, "audit.log");
}

/**
 * Recursively creates directory if it does not exist (mkdir -p).
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
