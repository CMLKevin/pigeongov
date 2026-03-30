import type { Command } from "commander";
import chalk from "chalk";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { lookupTerm, searchTerms, getTermsForDomain } from "../../glossary/index.js";
import type { WorkflowDomain } from "../../types.js";

export function registerGlossaryCommand(program: Command): void {
  program
    .command("glossary")
    .description("Look up plain-language definitions of government terms")
    .argument("[term]", "Term to look up")
    .option("--domain <domain>", "Filter by domain (tax, immigration, healthcare, unemployment)")
    .action((term: string | undefined, options) => {
      // With a specific term: look it up or search
      if (term) {
        const exact = lookupTerm(term);

        if (isJsonMode()) {
          if (exact) {
            emitJson({ entry: exact });
          } else {
            const results = searchTerms(term);
            emitJson({ query: term, results });
          }
          return;
        }

        if (exact) {
          console.log("");
          console.log(
            `  ${chalk.bold(exact.term)}` +
              (exact.abbreviation ? chalk.dim(` (${exact.abbreviation})`) : "") +
              `  ${chalk.cyan(`[${exact.domain}]`)}`,
          );
          console.log(chalk.dim(`  ${"─".repeat(50)}`));
          console.log(`  ${exact.definition}`);
          if (exact.officialDefinition) {
            console.log("");
            console.log(`  ${chalk.dim.italic(`Official: ${exact.officialDefinition}`)}`);
          }
          if (exact.source) {
            console.log(`  ${chalk.dim(`Source: ${exact.source}`)}`);
          }
          if (exact.relatedTerms && exact.relatedTerms.length > 0) {
            console.log("");
            console.log(
              `  ${chalk.dim("Related:")} ${exact.relatedTerms.map((t) => chalk.cyan(t)).join(chalk.dim(", "))}`,
            );
          }
          console.log("");
        } else {
          const results = searchTerms(term);
          if (results.length === 0) {
            console.log(chalk.dim(`  No terms found matching "${term}".`));
          } else {
            console.log("");
            console.log(chalk.dim(`  No exact match for "${term}". Similar terms:`));
            console.log("");
            for (const entry of results) {
              console.log(
                `    ${chalk.cyan("\u25b8")} ${chalk.bold(entry.term)}` +
                  (entry.abbreviation ? chalk.dim(` (${entry.abbreviation})`) : "") +
                  `  ${chalk.dim(`[${entry.domain}]`)}`,
              );
            }
            console.log("");
          }
        }
        return;
      }

      // Without a term: list all terms (optionally filtered by domain)
      const entries = options.domain
        ? getTermsForDomain(String(options.domain) as WorkflowDomain)
        : searchTerms("");

      if (isJsonMode()) {
        emitJson({ entries });
        return;
      }

      if (entries.length === 0) {
        console.log(chalk.dim("  No glossary entries found."));
        return;
      }

      // Group by domain for readability
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const existing = grouped.get(entry.domain);
        if (existing) {
          existing.push(entry);
        } else {
          grouped.set(entry.domain, [entry]);
        }
      }

      console.log("");
      console.log(chalk.bold("  Glossary"));
      console.log("");

      for (const [domain, domainEntries] of grouped) {
        console.log(`  ${chalk.cyan.bold(domain.toUpperCase())}`);
        console.log(chalk.dim(`  ${"─".repeat(40)}`));
        for (const entry of domainEntries) {
          const abbr = entry.abbreviation ? chalk.dim(` (${entry.abbreviation})`) : "";
          console.log(`    ${chalk.white(entry.term)}${abbr}`);
        }
        console.log("");
      }

      console.log(chalk.dim(`  ${entries.length} terms. Lookup: pigeongov glossary <term>`));
      console.log("");
    });
}
