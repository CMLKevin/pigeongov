import { access } from "node:fs/promises";
import path from "node:path";

import type { Command } from "commander";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Report local PigeonGov capabilities for humans and agents")
    .action(async () => {
      const cwd = process.cwd();
      const report = {
        cwd,
        node: process.version,
        stdinIsTty: Boolean(process.stdin.isTTY),
        stdoutIsTty: Boolean(process.stdout.isTTY),
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

      console.log("PigeonGov doctor");
      console.log(`cwd: ${report.cwd}`);
      console.log(`node: ${report.node}`);
      console.log(`tty: stdin=${report.stdinIsTty} stdout=${report.stdoutIsTty}`);
      console.log(`cli built: ${report.builtArtifacts.cli}`);
      console.log(`tui built: ${report.builtArtifacts.tui}`);
      console.log(`mcp stdio built: ${report.builtArtifacts.mcpStdio}`);
      console.log(`mcp http built: ${report.builtArtifacts.mcpHttp}`);
    });
}
