import type { Command } from "commander";
import { execSync } from "node:child_process";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import {
  addPluginEntry,
  getPluginManifest,
  registerPluginWorkflows,
  removePluginEntry,
  setPluginEnabled,
} from "../../plugins/loader.js";
import type { PluginEntry } from "../../plugins/types.js";

export function registerPluginCommand(program: Command): void {
  const plugins = program
    .command("plugins")
    .description("Manage PigeonGov workflow plugins");

  // --- list ---
  plugins
    .command("list")
    .description("Show installed plugins")
    .action(() => {
      const manifest = getPluginManifest();

      if (isJsonMode()) {
        emitJson({ plugins: manifest.plugins });
        return;
      }

      if (manifest.plugins.length === 0) {
        console.log(chalk.dim("No plugins installed."));
        return;
      }

      for (const p of manifest.plugins) {
        const status = p.enabled
          ? chalk.green("enabled")
          : chalk.red("disabled");
        console.log(
          `${chalk.bold(p.name)}  ${chalk.dim(`v${p.version}`)}  ${status}  ${chalk.dim(p.packagePath)}`,
        );
      }
    });

  // --- install ---
  plugins
    .command("install <package>")
    .description("Install a plugin package via npm")
    .action(async (packageName: string) => {
      console.log(chalk.dim(`Installing ${packageName}...`));

      try {
        execSync(`npm install --no-save ${packageName}`, {
          stdio: "pipe",
          cwd: process.cwd(),
        });
      } catch (err) {
        console.error(
          chalk.red(
            `Failed to install: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exitCode = 1;
        return;
      }

      // Attempt to resolve the package path
      let resolvedPath: string;
      try {
        resolvedPath = require.resolve(packageName);
      } catch {
        // For ESM packages, the bare specifier will work as the import path
        resolvedPath = packageName;
      }

      const entry: PluginEntry = {
        name: packageName,
        version: "0.0.0", // will be updated after validation
        packagePath: resolvedPath,
        installedAt: new Date().toISOString(),
        enabled: true,
      };

      // Validate it before finalising
      const result = await registerPluginWorkflows(entry);

      if (result.errors.length > 0) {
        for (const e of result.errors) {
          console.error(chalk.red(`  ${e}`));
        }
        console.error(
          chalk.yellow(
            "Plugin installed but has validation errors. It will be disabled.",
          ),
        );
        entry.enabled = false;
      }

      addPluginEntry(entry);

      console.log(
        chalk.green(
          `Installed ${packageName} (${result.registered} workflow${result.registered === 1 ? "" : "s"} registered)`,
        ),
      );
    });

  // --- uninstall ---
  plugins
    .command("uninstall <name>")
    .description("Remove a plugin")
    .action((name: string) => {
      const removed = removePluginEntry(name);
      if (removed) {
        console.log(chalk.green(`Removed plugin "${name}"`));
      } else {
        console.error(chalk.red(`Plugin "${name}" not found`));
        process.exitCode = 1;
      }
    });

  // --- enable ---
  plugins
    .command("enable <name>")
    .description("Enable a plugin")
    .action((name: string) => {
      const ok = setPluginEnabled(name, true);
      if (ok) {
        console.log(chalk.green(`Enabled plugin "${name}"`));
      } else {
        console.error(chalk.red(`Plugin "${name}" not found`));
        process.exitCode = 1;
      }
    });

  // --- disable ---
  plugins
    .command("disable <name>")
    .description("Disable a plugin")
    .action((name: string) => {
      const ok = setPluginEnabled(name, false);
      if (ok) {
        console.log(chalk.green(`Disabled plugin "${name}"`));
      } else {
        console.error(chalk.red(`Plugin "${name}" not found`));
        process.exitCode = 1;
      }
    });
}
