import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import type { Command } from "commander";

import { startApiServer } from "../../api/index.js";

async function ensureBuilt(filePath: string): Promise<void> {
  await access(filePath);
}

export function registerServeCommand(program: Command): void {
  program
    .command("serve")
    .description("Start as MCP server")
    .option("--http", "Also start HTTP transport on port 3847")
    .option("--rest", "Also start REST API (routes under /api/*)")
    .option("--port <number>", "HTTP port", "3847")
    .action(async (options) => {
      const cwd = process.cwd();
      const port = Number(options.port) || 3847;
      const stdioEntry = path.join(cwd, "dist/mcp/stdio.js");
      await ensureBuilt(stdioEntry);

      // REST API server
      if (options.rest) {
        startApiServer(port);
        console.log(`REST API started on port ${port}`);
      }

      if (options.http) {
        const httpEntry = path.join(cwd, "dist/mcp/http.js");
        await ensureBuilt(httpEntry);

        // If REST is also enabled, use a different port for MCP HTTP
        const mcpPort = options.rest ? port + 1 : port;
        const httpChild = spawn(process.execPath, [httpEntry], {
          stdio: "inherit",
          env: { ...process.env, PORT: String(mcpPort) },
        });
        httpChild.on("exit", (code) => process.exit(code ?? 0));

        if (options.rest) {
          console.log(`MCP HTTP transport on port ${mcpPort}`);
        }
      }

      const stdioChild = spawn(process.execPath, [stdioEntry], {
        stdio: "inherit",
        env: process.env,
      });
      stdioChild.on("exit", (code) => process.exit(code ?? 0));
    });
}
