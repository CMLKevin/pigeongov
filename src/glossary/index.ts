import type { GlossaryEntry, WorkflowDomain } from "../types.js";
import { taxGlossaryEntries } from "./entries/tax.js";
import { immigrationGlossaryEntries } from "./entries/immigration.js";
import { healthcareGlossaryEntries } from "./entries/healthcare.js";
import { unemploymentGlossaryEntries } from "./entries/unemployment.js";

/**
 * All glossary entries aggregated across domains.
 */
const allEntries: GlossaryEntry[] = [
  ...taxGlossaryEntries,
  ...immigrationGlossaryEntries,
  ...healthcareGlossaryEntries,
  ...unemploymentGlossaryEntries,
];

/**
 * Look up a glossary term by exact term name or abbreviation (case-insensitive).
 */
export function lookupTerm(term: string): GlossaryEntry | undefined {
  const needle = term.toLowerCase();
  return allEntries.find(
    (entry) =>
      entry.term.toLowerCase() === needle ||
      (entry.abbreviation !== undefined && entry.abbreviation.toLowerCase() === needle),
  );
}

/**
 * Fuzzy search across all glossary terms.
 * Matches against term, abbreviation, and definition text (case-insensitive substring).
 */
export function searchTerms(query: string): GlossaryEntry[] {
  const needle = query.toLowerCase();
  return allEntries.filter(
    (entry) =>
      entry.term.toLowerCase().includes(needle) ||
      (entry.abbreviation !== undefined && entry.abbreviation.toLowerCase().includes(needle)) ||
      entry.definition.toLowerCase().includes(needle),
  );
}

/**
 * Get all glossary entries for a specific domain.
 */
export function getTermsForDomain(domain: WorkflowDomain): GlossaryEntry[] {
  return allEntries.filter((entry) => entry.domain === domain);
}

export { allEntries };
