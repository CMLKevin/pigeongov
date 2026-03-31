import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { Command } from "commander";

import { startApiServer } from "../../api/index.js";
import { PigeonGovError } from "../support.js";
import { emitError } from "../output.js";

const __filename = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(__filename), "../../../..");

async function ensureBuilt(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new PigeonGovError({
      code: "MCP_NOT_BUILT",
      message: `MCP server not built. Run \`pnpm build:mcp\` from the project root, or if installed via npm, the MCP server may not be included in this distribution. (expected: ${filePath})`,
      suggestion: "Run `pnpm build:mcp` from the project root.",
    });
  }
}

export function registerServeCommand(program: Command): void {
  program
    .command("serve")
    .description("Start as MCP server")
    .option("--http", "Also start HTTP transport on port 3847")
    .option("--rest", "Also start REST API (routes under /api/*)")
    .option("--port <number>", "HTTP port", "3847")
    .action(async (options) => {
      const port = Number(options.port) || 3847;
      const stdioEntry = path.join(packageRoot, "dist/mcp/stdio.js");
      try {
        await ensureBuilt(stdioEntry);
      } catch (err) {
        emitError(err);
        return;
      }

      // REST API server
      if (options.rest) {
        startApiServer(port);
        console.log(`REST API started on port ${port}`);
      }

      if (options.http) {
        const httpEntry = path.join(packageRoot, "dist/mcp/http.js");
        try {
          await ensureBuilt(httpEntry);
        } catch (err) {
          emitError(err);
          return;
        }

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
