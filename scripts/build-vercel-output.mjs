import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const staticDir = path.join(rootDir, ".vercel", "output", "static");
const siteDir = path.join(rootDir, "dist", "site");
const configPath = path.join(rootDir, ".vercel", "output", "config.json");

await mkdir(staticDir, { recursive: true });
await cp(siteDir, staticDir, { recursive: true });

let config = {
  version: 3,
  routes: [
    { src: "/mcp", dest: "/api" },
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" },
  ],
};

try {
  const existing = JSON.parse(await readFile(configPath, "utf8"));
  config = {
    ...existing,
    routes: [
      { src: "/mcp", dest: "/api" },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  };
} catch {
  // Fall back to a fresh Build Output config when xmcp did not emit one.
}

await writeFile(configPath, JSON.stringify(config, null, 2));
