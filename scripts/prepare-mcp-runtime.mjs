import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const runtimeDir = path.join(distDir, "mcp");
const shouldPatchVercel = process.argv.includes("--vercel");

async function copyRuntimeForLocalServe() {
  await rm(runtimeDir, { recursive: true, force: true });
  await mkdir(runtimeDir, { recursive: true });

  const entries = await readdir(distDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "mcp") {
      continue;
    }

    const sourcePath = path.join(distDir, entry.name);
    const targetPath = path.join(runtimeDir, entry.name);
    await cp(sourcePath, targetPath, { recursive: true });
  }

  await writeFile(
    path.join(runtimeDir, "package.json"),
    JSON.stringify(
      {
        type: "commonjs",
      },
      null,
      2,
    ),
  );
}

async function patchVercelFunctionPackage() {
  const functionPackagePath = path.join(
    rootDir,
    ".vercel",
    "output",
    "functions",
    "api",
    "index.func",
    "package.json",
  );

  const packageJson = JSON.parse(await readFile(functionPackagePath, "utf8"));
  packageJson.type = "commonjs";
  await writeFile(functionPackagePath, JSON.stringify(packageJson, null, 2));
}

await copyRuntimeForLocalServe();

// Patch MCP serverInfo with correct name and version
const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
for (const entry of ["stdio.js", "http.js"]) {
  const filePath = path.join(runtimeDir, entry);
  try {
    let content = await readFile(filePath, "utf8");
    content = content.replace(
      'name:"MCP Server",version:"0.0.1"',
      `name:"pigeongov",version:"${packageJson.version}"`,
    );
    await writeFile(filePath, content);
  } catch {
    // File may not exist (e.g., http.js when only stdio is built)
  }
}

if (shouldPatchVercel) {
  await patchVercelFunctionPackage();
}
