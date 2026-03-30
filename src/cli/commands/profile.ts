import { readFile } from "node:fs/promises";

import type { Command } from "commander";
import chalk from "chalk";

import type { HouseholdProfile } from "../../types.js";
import { emitJson } from "../support.js";
import { loadProfile, saveProfile } from "../../storage/profile.js";

export function registerProfileCommand(program: Command): void {
  const profile = program
    .command("profile")
    .description("Manage household profile data");

  // --- profile show ---
  profile
    .command("show")
    .description("Display the current household profile")
    .option("--json", "Print JSON output")
    .action(async (options: { json?: boolean }) => {
      const p = await loadProfile();

      if (!p) {
        console.log(chalk.dim("No profile found. Use 'pigeongov profile import <file>' to create one."));
        return;
      }

      if (options.json) {
        emitJson(p);
        return;
      }

      console.log(chalk.bold("Household Profile\n"));
      console.log(`  id: ${chalk.cyan(p.id)}`);
      console.log(`  updated: ${chalk.dim(p.updatedAt)}`);
      console.log(`  address: ${formatAddress(p.address)}`);
      console.log();

      for (const person of p.people) {
        const ssnDisplay = person.ssn
          ? chalk.dim(`***-**-${person.ssn.slice(-4)}`)
          : chalk.dim("no SSN");
        console.log(
          `  ${chalk.green(person.firstName)} ${chalk.green(person.lastName)}  ` +
            `${person.relationship}  ${ssnDisplay}`,
        );
      }

      if (p.income) {
        console.log();
        console.log(`  income (${p.income.taxYear}): $${p.income.totalGross.toLocaleString()}`);
        for (const src of p.income.sources) {
          console.log(`    ${src.label}: $${src.amount.toLocaleString()} (${src.type})`);
        }
      }
    });

  // --- profile set ---
  profile
    .command("set <key> <value>")
    .description("Set a profile field (dot-notation, e.g. address.city)")
    .action(async (key: string, value: string) => {
      let p = await loadProfile();

      if (!p) {
        // Bootstrap a minimal profile
        p = {
          id: crypto.randomUUID(),
          people: [],
          address: { street1: "", city: "", state: "", zipCode: "" },
          updatedAt: new Date().toISOString(),
        };
      }

      setNestedValue(p as unknown as Record<string, unknown>, key, coerceValue(value));
      p.updatedAt = new Date().toISOString();

      await saveProfile(p);
      console.log(chalk.green(`Set ${key} = ${value}`));
    });

  // --- profile import ---
  profile
    .command("import <bundle-json>")
    .description("Import a profile from a JSON file")
    .action(async (bundleJson: string) => {
      const raw = await readFile(bundleJson, "utf-8");
      const imported = JSON.parse(raw) as HouseholdProfile;

      // Validate minimal shape
      if (!imported.people || !imported.address) {
        console.log(chalk.red("Invalid profile JSON: must contain 'people' and 'address' fields."));
        process.exitCode = 1;
        return;
      }

      imported.updatedAt = new Date().toISOString();
      if (!imported.id) {
        imported.id = crypto.randomUUID();
      }

      await saveProfile(imported);
      console.log(
        chalk.green(`Imported profile with ${imported.people.length} person(s).`),
      );
    });
}

// --- Helpers ---

function formatAddress(addr: { street1: string; street2?: string | undefined; city: string; state: string; zipCode: string }): string {
  const parts = [addr.street1];
  if (addr.street2) parts.push(addr.street2);
  parts.push(`${addr.city}, ${addr.state} ${addr.zipCode}`);
  return parts.join(", ");
}

/**
 * Set a value at a dot-notation path on an object.
 * e.g. setNestedValue(obj, "address.city", "Portland")
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    if (typeof current[k] !== "object" || current[k] === null) {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = value;
}

/**
 * Attempt to coerce string values to appropriate JS types.
 */
function coerceValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;
  return value;
}
