import { access } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

import chalk from "chalk";
import type { Command } from "commander";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { listWorkflowSummaries } from "../../workflows/registry.js";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function tryCommand(cmd: string): string | undefined {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return undefined;
  }
}

function checkMark(ok: boolean): string {
  return ok ? chalk.green("\u2713") : chalk.red("\u2717");
}

function boxLine(content: string, width: number): string {
  // Strip ANSI for length calculation
  const stripped = content.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g,
    "",
  );
  const pad = Math.max(0, width - stripped.length);
  return `  ${chalk.dim("\u2502")} ${content}${" ".repeat(pad)} ${chalk.dim("\u2502")}`;
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Report local PigeonGov capabilities for humans and agents")
    .action(async () => {
      const cwd = process.cwd();
      const goVersion = tryCommand("go version");
      const nodeVersion = process.version;
      const workflowCount = listWorkflowSummaries().length;

      const report = {
        cwd,
        node: nodeVersion,
        go: goVersion ?? null,
        stdinIsTty: Boolean(process.stdin.isTTY),
        stdoutIsTty: Boolean(process.stdout.isTTY),
        workflowCount,
        builtArtifacts: {
          cli: await exists(path.join(cwd, "dist", "bin", "pigeongov.js")),
          tui: await exists(path.join(cwd, "dist", "tui", "pigeongov-tui")),
          mcpHttp: await exists(path.join(cwd, "dist", "mcp", "http.js")),
          mcpStdio: await exists(path.join(cwd, "dist", "mcp", "stdio.js")),
        },
        env: {
          noTui: process.env.PIGEONGOV_NO_TUI === "1",
          forceNodePrompts: process.env.PIGEONGOV_FORCE_NODE_PROMPTS === "1",
        },
      };

      if (isJsonMode()) {
        emitJson(report);
        return;
      }

      const W = 54;
      const hr = chalk.dim(`  \u251c${"─".repeat(W + 2)}\u2524`);
      const top = chalk.dim(`  \u250c${"─".repeat(W + 2)}\u2510`);
      const bottom = chalk.dim(`  \u2514${"─".repeat(W + 2)}\u2518`);

      console.log("");
      console.log(top);
      console.log(boxLine(chalk.bold("PigeonGov Doctor"), W));
      console.log(hr);

      // System info
      console.log(boxLine("", W));
      console.log(boxLine(chalk.dim("System"), W));
      console.log(boxLine(`  Node        ${chalk.cyan(nodeVersion)}`, W));
      console.log(
        boxLine(
          `  Go          ${goVersion ? chalk.cyan(goVersion.replace("go version ", "")) : chalk.red("not found")}`,
          W,
        ),
      );
      console.log(
        boxLine(
          `  TTY         stdin=${report.stdinIsTty ? chalk.green("yes") : chalk.red("no")}  stdout=${report.stdoutIsTty ? chalk.green("yes") : chalk.red("no")}`,
          W,
        ),
      );
      console.log(boxLine(`  Workflows   ${chalk.cyan(String(workflowCount))}`, W));
      console.log(boxLine(`  CWD         ${chalk.dim(report.cwd)}`, W));

      // Built artifacts
      console.log(boxLine("", W));
      console.log(boxLine(chalk.dim("Built Artifacts"), W));
      console.log(boxLine(`  ${checkMark(report.builtArtifacts.cli)} CLI binary`, W));
      console.log(boxLine(`  ${checkMark(report.builtArtifacts.tui)} TUI binary`, W));
      console.log(boxLine(`  ${checkMark(report.builtArtifacts.mcpStdio)} MCP stdio server`, W));
      console.log(boxLine(`  ${checkMark(report.builtArtifacts.mcpHttp)} MCP HTTP server`, W));

      // Environment
      console.log(boxLine("", W));
      console.log(boxLine(chalk.dim("Environment"), W));
      console.log(
        boxLine(
          `  PIGEONGOV_NO_TUI             ${report.env.noTui ? chalk.yellow("set") : chalk.dim("unset")}`,
          W,
        ),
      );
      console.log(
        boxLine(
          `  PIGEONGOV_FORCE_NODE_PROMPTS  ${report.env.forceNodePrompts ? chalk.yellow("set") : chalk.dim("unset")}`,
          W,
        ),
      );

      console.log(boxLine("", W));
      console.log(bottom);
      console.log("");
    });
}
