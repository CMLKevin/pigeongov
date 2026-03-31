import type { Command } from "commander";
import chalk from "chalk";

import { isJsonMode, emit } from "../output.js";
import { listDrafts, deleteDraft, cleanupDrafts } from "../../storage/drafts.js";

export function registerDraftsCommand(program: Command): void {
  const drafts = program
    .command("drafts")
    .description("Manage in-progress workflow drafts");

  // --- drafts list ---
  drafts
    .command("list")
    .description("List saved drafts")
    .option("--workflow <id>", "Filter by workflow id")
    .action(async (options: { workflow?: string }) => {
      const items = await listDrafts(options.workflow);

      if (isJsonMode()) {
        emit({ drafts: items });
        return;
      }

      if (items.length === 0) {
        console.log(chalk.dim("No drafts found."));
        return;
      }

      console.log(chalk.bold(`${items.length} draft(s):\n`));
      for (const d of items) {
        const age = timeSince(d.updatedAt);
        const sections = d.completedSections.length
          ? chalk.green(`${d.completedSections.length} sections`)
          : chalk.dim("no sections");
        console.log(
          `  ${chalk.cyan(d.id)}  ${d.workflowId}  ${sections}  ${chalk.dim(age)}`,
        );
      }
    });

  // --- drafts delete ---
  drafts
    .command("delete <draftId>")
    .description("Delete a saved draft")
    .action(async (draftId: string) => {
      const deleted = await deleteDraft(draftId);
      if (deleted) {
        console.log(chalk.green(`Deleted draft ${draftId}`));
      } else {
        console.log(chalk.red(`Draft not found: ${draftId}`));
        process.exitCode = 1;
      }
    });

  // --- drafts cleanup ---
  drafts
    .command("cleanup")
    .description("Remove old drafts")
    .option("--older-than <days>", "Remove drafts older than N days", "30")
    .action(async (options: { olderThan: string }) => {
      const days = parseInt(options.olderThan, 10);
      if (isNaN(days) || days < 1) {
        console.log(chalk.red("Invalid --older-than value; must be a positive integer."));
        process.exitCode = 1;
        return;
      }
      const removed = await cleanupDrafts(days);
      console.log(chalk.green(`Removed ${removed} draft(s) older than ${days} days.`));
    });
}

// --- Helpers ---

function timeSince(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
