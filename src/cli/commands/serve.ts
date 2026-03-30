import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import type { Command } from "commander";

async function ensureBuilt(filePath: string): Promise<void> {
  await access(filePath);
}

export function registerServeCommand(program: Command): void {
  program
    .command("serve")
    .description("Start as MCP server")
    .option("--http", "Also start HTTP transport on port 3847")
    .option("--port <number>", "HTTP port", "3847")
    .action(async (options) => {
      const cwd = process.cwd();
      const stdioEntry = path.join(cwd, "dist/mcp/stdio.js");
      await ensureBuilt(stdioEntry);

      if (options.http) {
        const httpEntry = path.join(cwd, "dist/mcp/http.js");
        await ensureBuilt(httpEntry);
        const httpChild = spawn(process.execPath, [httpEntry], {
          stdio: "inherit",
          env: { ...process.env, PORT: String(options.port) },
        });
        httpChild.on("exit", (code) => process.exit(code ?? 0));
      }

      const stdioChild = spawn(process.execPath, [stdioEntry], {
        stdio: "inherit",
        env: process.env,
      });
      stdioChild.on("exit", (code) => process.exit(code ?? 0));
    });
}
