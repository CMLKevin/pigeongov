import type { Command } from "commander";
import chalk from "chalk";

import { isJsonMode, emit, emitError } from "../output.js";
import { PigeonGovError, CLI_EXIT_CODES } from "../support.js";
import {
  getDependencies,
} from "../../advisory/dependencies/graph.js";
import { normalizeWorkflowId } from "../../workflows/registry.js";

const RELATIONSHIP_GLYPHS: Record<string, (text: string) => string> = {
  triggers: (t) => chalk.green(`\u2192 ${t}`),
  requires: (t) => chalk.blue(`\u25b6 ${t}`),
  affects: (t) => chalk.yellow(`~ ${t}`),
  invalidates: (t) => chalk.red(`\u2717 ${t}`),
};

function formatRelationship(rel: string, text: string): string {
  const formatter = RELATIONSHIP_GLYPHS[rel];
  return formatter ? formatter(text) : `  ${text}`;
}

export function registerDependenciesCommand(program: Command): void {
  program
    .command("dependencies <workflowId>")
    .alias("deps")
    .description(
      `Show cross-agency dependency graph for a workflow.

  Reveals which workflows trigger, require, affect, or invalidate other
  workflows. For example, filing immigration/i-130 triggers downstream
  workflows like i-485. Shows both upstream (what this depends on) and
  downstream (what depends on this) relationships with depth levels.

  Relationship types: triggers, requires, affects, invalidates.

  Examples:
    $ pigeongov dependencies immigration/i-130
    $ pigeongov deps tax/1040 --json`,
    )
    .action((workflowId: string) => {
      try {
        normalizeWorkflowId(workflowId);
      } catch {
        const err = new PigeonGovError({
          code: "not_found",
          message: `Unknown workflow: ${workflowId}`,
          exitCode: CLI_EXIT_CODES.notFound,
          suggestion: "Run 'pigeongov list' to see available workflows.",
        });
        emitError(err);
        return;
      }

      const chain = getDependencies(workflowId);

      if (isJsonMode()) {
        emit(chain);
        return;
      }

      console.log("");
      console.log(chalk.bold(`  Dependency graph: ${chalk.cyan(workflowId)}`));

      // Downstream
      console.log("");
      if (chain.downstream.length === 0) {
        console.log(chalk.dim("  No downstream dependencies."));
      } else {
        console.log(chalk.bold("  Downstream") + chalk.dim(` (${chain.downstream.length})`));
        console.log("");
        for (const dep of chain.downstream) {
          const indent = "  " + "  ".repeat(dep.depth);
          console.log(
            `${indent}${formatRelationship(dep.relationship, chalk.bold(dep.workflowId))}`,
          );
          console.log(
            `${indent}  ${chalk.dim(dep.description)}`,
          );
        }
      }

      // Upstream
      console.log("");
      if (chain.upstream.length === 0) {
        console.log(chalk.dim("  No upstream dependencies."));
      } else {
        console.log(chalk.bold("  Upstream") + chalk.dim(` (${chain.upstream.length})`));
        console.log("");
        for (const dep of chain.upstream) {
          const indent = "  " + "  ".repeat(dep.depth);
          console.log(
            `${indent}${formatRelationship(dep.relationship, chalk.bold(dep.workflowId))}`,
          );
          console.log(
            `${indent}  ${chalk.dim(dep.description)}`,
          );
        }
      }

      console.log("");
      const total = chain.downstream.length + chain.upstream.length;
      console.log(
        chalk.dim(
          `  ${total} dependenc${total === 1 ? "y" : "ies"} found.`,
        ),
      );
      console.log("");
    });
}
