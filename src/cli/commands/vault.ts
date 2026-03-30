import type { Command } from "commander";
import chalk from "chalk";
import { password } from "@inquirer/prompts";

import { emitJson } from "../support.js";
import {
  addToVault,
  listVault,
  getFromVault,
  linkToWorkflow,
  initVault,
} from "../../storage/vault.js";

async function askPassphrase(prompt = "Vault passphrase"): Promise<string> {
  return password({ message: prompt });
}

export function registerVaultCommand(program: Command): void {
  const vault = program
    .command("vault")
    .description("Encrypted document vault for sensitive files");

  // --- vault add ---
  vault
    .command("add <file>")
    .description("Encrypt and store a file in the vault")
    .option("--label <label>", "Human-readable label for the file")
    .option("--tag <tag...>", "Tags for categorization")
    .action(async (file: string, options: { label?: string; tag?: string[] }) => {
      const passphrase = await askPassphrase();
      await initVault(passphrase);

      const entry = await addToVault(
        passphrase,
        file,
        options.label ?? "",
        options.tag ?? [],
      );

      console.log(chalk.green(`Added to vault: ${entry.id}`));
      console.log(`  filename: ${entry.filename}`);
      console.log(`  size: ${entry.sizeBytes} bytes`);
      console.log(`  checksum: ${chalk.dim(entry.checksum)}`);
    });

  // --- vault list ---
  vault
    .command("list")
    .description("List all vault entries")
    .option("--json", "Print JSON output")
    .action(async (options: { json?: boolean }) => {
      const passphrase = await askPassphrase();
      const entries = await listVault(passphrase);

      if (options.json) {
        emitJson({ vault: entries });
        return;
      }

      if (entries.length === 0) {
        console.log(chalk.dim("Vault is empty."));
        return;
      }

      console.log(chalk.bold(`${entries.length} vault entry/entries:\n`));
      for (const e of entries) {
        const tags = e.tags.length ? chalk.blue(e.tags.join(", ")) : chalk.dim("no tags");
        const linked = e.linkedWorkflows.length
          ? chalk.yellow(`linked: ${e.linkedWorkflows.join(", ")}`)
          : "";
        console.log(`  ${chalk.cyan(e.id)}  ${e.filename}  ${tags}  ${linked}`);
      }
    });

  // --- vault get ---
  vault
    .command("get <id>")
    .description("Decrypt a vault entry to a file")
    .option("--output <path>", "Output file path", ".")
    .action(async (id: string, options: { output: string }) => {
      const passphrase = await askPassphrase();
      await getFromVault(passphrase, id, options.output);
      console.log(chalk.green(`Decrypted to: ${options.output}`));
    });

  // --- vault link ---
  vault
    .command("link <id>")
    .description("Link a vault document to a workflow")
    .requiredOption("--workflow <workflowId>", "Workflow id to link")
    .action(async (id: string, options: { workflow: string }) => {
      const passphrase = await askPassphrase();
      await linkToWorkflow(passphrase, id, options.workflow);
      console.log(
        chalk.green(`Linked ${id} to workflow ${options.workflow}`),
      );
    });
}
