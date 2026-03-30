import { readFile } from "node:fs/promises";

import { getAuditLogPath } from "../storage/paths.js";

export interface LocalStats {
  workflowsCompleted: number;
  documentsProcessed: number;
  totalIncomeProcessed: number;
  workflowsByDomain: Record<string, number>;
  commandCounts: Record<string, number>;
  lastActivity: string;
  draftCount: number;
  vaultItemCount: number;
}

/**
 * Parse audit log lines into structured entries.
 *
 * The audit log format is one JSON object per line — each line is a
 * timestamped record of a CLI operation. If the file doesn't exist
 * yet (fresh install), we return an empty array and let the caller
 * produce sensible zero-state output.
 */
async function readAuditEntries(): Promise<AuditEntry[]> {
  const logPath = getAuditLogPath();
  let raw: string;
  try {
    raw = await readFile(logPath, "utf8");
  } catch {
    return [];
  }

  const entries: AuditEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as AuditEntry);
    } catch {
      // Malformed line — skip it rather than crashing.
    }
  }
  return entries;
}

interface AuditEntry {
  timestamp?: string;
  command?: string;
  workflowId?: string;
  domain?: string;
  documentsImported?: number;
  incomeTotal?: number;
  [key: string]: unknown;
}

/**
 * Count files in a directory, returning 0 if the directory doesn't exist.
 */
async function countFilesInDir(dirPath: string): Promise<number> {
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dirPath);
    return entries.length;
  } catch {
    return 0;
  }
}

/**
 * Collect local usage statistics from the audit log and storage dirs.
 */
export async function getLocalStats(): Promise<LocalStats> {
  const entries = await readAuditEntries();

  let workflowsCompleted = 0;
  let documentsProcessed = 0;
  let totalIncomeProcessed = 0;
  let lastActivity = "";
  const workflowsByDomain: Record<string, number> = {};
  const commandCounts: Record<string, number> = {};

  for (const entry of entries) {
    // Track the most recent timestamp
    if (entry.timestamp && entry.timestamp > lastActivity) {
      lastActivity = entry.timestamp;
    }

    // Count commands
    if (entry.command) {
      commandCounts[entry.command] = (commandCounts[entry.command] ?? 0) + 1;
    }

    // Count completed workflows
    if (
      entry.command === "fill" ||
      entry.command === "start" ||
      entry.workflowId
    ) {
      workflowsCompleted += 1;

      // Track domain breakdown
      const domain =
        entry.domain ?? entry.workflowId?.split("/")[0] ?? "unknown";
      workflowsByDomain[domain] = (workflowsByDomain[domain] ?? 0) + 1;
    }

    // Accumulate document and income counts
    if (entry.documentsImported) {
      documentsProcessed += entry.documentsImported;
    }
    if (entry.incomeTotal) {
      totalIncomeProcessed += entry.incomeTotal;
    }

    // Also count explicit extract commands
    if (entry.command === "extract") {
      documentsProcessed += 1;
    }
  }

  // Count drafts and vault items from the filesystem
  const { getDraftsDir, getVaultDir } = await import("../storage/paths.js");
  const draftCount = await countFilesInDir(getDraftsDir());
  const vaultItemCount = await countFilesInDir(getVaultDir());

  return {
    workflowsCompleted,
    documentsProcessed,
    totalIncomeProcessed,
    workflowsByDomain,
    commandCounts,
    lastActivity: lastActivity || "never",
    draftCount,
    vaultItemCount,
  };
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Format stats for human-readable terminal output.
 */
export function formatStats(stats: LocalStats): string {
  const lines: string[] = [];

  lines.push("PigeonGov Local Statistics");
  lines.push("=".repeat(40));
  lines.push("");

  // Main counts
  lines.push(`Workflows completed:   ${stats.workflowsCompleted}`);
  lines.push(`Documents processed:   ${stats.documentsProcessed}`);
  lines.push(`Drafts in progress:    ${stats.draftCount}`);
  lines.push(`Vault items stored:    ${stats.vaultItemCount}`);
  lines.push(`Last activity:         ${stats.lastActivity === "never" ? "never" : new Date(stats.lastActivity).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);

  // Income stat — the fun one
  if (stats.totalIncomeProcessed > 0) {
    lines.push("");
    lines.push(
      `Total income processed: ${currencyFormatter.format(stats.totalIncomeProcessed)}`,
    );
    if (stats.workflowsByDomain["tax"]) {
      const taxReturns = stats.workflowsByDomain["tax"];
      lines.push(
        `  across ${taxReturns} tax return${taxReturns === 1 ? "" : "s"} — ` +
          `that's ${currencyFormatter.format(stats.totalIncomeProcessed / taxReturns)} avg per return`,
      );
    }
  }

  // Domain breakdown
  const domains = Object.entries(stats.workflowsByDomain).sort(
    (a, b) => b[1] - a[1],
  );
  if (domains.length > 0) {
    lines.push("");
    lines.push("Workflows by domain:");
    for (const [domain, count] of domains) {
      const bar = "#".repeat(Math.min(count, 30));
      lines.push(`  ${domain.padEnd(16)} ${String(count).padStart(3)}  ${bar}`);
    }
  }

  // Command usage breakdown
  const commands = Object.entries(stats.commandCounts).sort(
    (a, b) => b[1] - a[1],
  );
  if (commands.length > 0) {
    lines.push("");
    lines.push("Most used commands:");
    for (const [cmd, count] of commands.slice(0, 10)) {
      lines.push(`  ${cmd.padEnd(20)} ${String(count).padStart(4)} invocations`);
    }
  }

  // Zero-state message
  if (stats.workflowsCompleted === 0 && stats.documentsProcessed === 0) {
    lines.push("");
    lines.push(
      "No activity recorded yet. Run `pigeongov fill tax/1040` to get started.",
    );
  }

  return lines.join("\n");
}
