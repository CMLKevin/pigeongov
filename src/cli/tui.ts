import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface TuiDecisionInput {
  formId: string;
  interactive: boolean;
  tui: boolean;
}

export interface TuiTtyState {
  stdinIsTty: boolean;
  stdoutIsTty: boolean;
}

export interface LaunchTuiOptions {
  formId: string;
  cwd: string;
  output?: string;
  format?: string;
  importPaths?: string[];
  accessible?: boolean;
  noAltScreen?: boolean;
}

interface TuiLaunchCommand {
  command: string;
  args: string[];
}

export function shouldUseTui(input: TuiDecisionInput, ttyState: TuiTtyState): boolean {
  if (!input.interactive || !input.tui) {
    return false;
  }

  if (!ttyState.stdinIsTty || !ttyState.stdoutIsTty) {
    return false;
  }

  if (
    process.env.PIGEONGOV_NO_TUI === "1" ||
    process.env.PIGEONGOV_FORCE_NODE_PROMPTS === "1"
  ) {
    return false;
  }

  return true;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findPackageRoot(startFileUrl: string): Promise<string | null> {
  let currentDir = path.dirname(fileURLToPath(startFileUrl));

  while (true) {
    if (
      (await pathExists(path.join(currentDir, "package.json"))) &&
      (await pathExists(path.join(currentDir, "go.mod")))
    ) {
      return currentDir;
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      return null;
    }
    currentDir = parent;
  }
}

async function resolveTuiLaunchCommand(packageRoot: string): Promise<TuiLaunchCommand | null> {
  const overrideBinary = process.env.PIGEONGOV_TUI_BIN;
  if (overrideBinary && (await pathExists(overrideBinary))) {
    return { command: overrideBinary, args: [] };
  }

  const builtBinary = path.join(packageRoot, "dist", "tui", "pigeongov-tui");
  if (await pathExists(builtBinary)) {
    return { command: builtBinary, args: [] };
  }

  const goEntry = path.join(packageRoot, "cmd", "pigeongov", "main.go");
  if (await pathExists(goEntry)) {
    return { command: "go", args: ["run", "./cmd/pigeongov"] };
  }

  return null;
}

function buildTuiArgs(options: LaunchTuiOptions): string[] {
  const args: string[] = [];

  if (options.formId) {
    args.push("-form", options.formId);
  }

  args.push("-cwd", options.cwd);
  args.push("-output", options.output ?? ".");
  args.push("-format", options.format ?? "json");

  if (options.accessible) {
    args.push("-accessible");
  }

  if (options.noAltScreen) {
    args.push("-no-alt-screen");
  }

  return args;
}

export async function launchTui(options: LaunchTuiOptions): Promise<void> {
  const packageRoot = await findPackageRoot(import.meta.url);
  if (!packageRoot) {
    throw new Error("Unable to locate the PigeonGov package root for the terminal UI.");
  }

  const launchCommand = await resolveTuiLaunchCommand(packageRoot);
  if (!launchCommand) {
    throw new Error(
      "The PigeonGov terminal UI is unavailable. Build it with `pnpm build:tui`, or install Go to run it from source.",
    );
  }

  const args = [...launchCommand.args, ...buildTuiArgs(options)];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(launchCommand.command, args, {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "The PigeonGov terminal UI could not start because Go is not installed and no built TUI binary was found.",
          ),
        );
        return;
      }
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`PigeonGov TUI exited with code ${code ?? 1}.`));
    });
  });
}

export async function tryLaunchTuiFill(options: LaunchTuiOptions): Promise<boolean> {
  try {
    await launchTui(options);
    return true;
  } catch {
    return false;
  }
}
