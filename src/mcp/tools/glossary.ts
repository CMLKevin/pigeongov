import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";

import { withStructuredContent } from "../result.js";
import { lookupTerm, searchTerms, getTermsForDomain } from "../../glossary/index.js";
import type { WorkflowDomain } from "../../types.js";

export const schema = {
  term: z.string().trim().min(1),
  domain: z.string().trim().min(1).optional(),
};

export const metadata: ToolMetadata = {
  name: "pigeongov-lookup-term",
  description:
    "Look up a plain-language definition of a government or tax term. Returns an exact match or fuzzy search results.",
};

export default function lookupTermTool(
  args: InferSchema<typeof schema>,
): any {
  // If domain specified, search within that domain
  if (args.domain) {
    const domainTerms = getTermsForDomain(args.domain as WorkflowDomain);
    const needle = args.term.toLowerCase();
    const match = domainTerms.find(
      (e) =>
        e.term.toLowerCase() === needle ||
        (e.abbreviation !== undefined && e.abbreviation.toLowerCase() === needle),
    );

    if (match) {
      return withStructuredContent({
        ok: true,
        entry: match,
        flaggedFields: [],
      });
    }

    const results = domainTerms.filter(
      (e) =>
        e.term.toLowerCase().includes(needle) ||
        (e.abbreviation !== undefined && e.abbreviation.toLowerCase().includes(needle)) ||
        e.definition.toLowerCase().includes(needle),
    );

    return withStructuredContent({
      ok: results.length > 0,
      query: args.term,
      domain: args.domain,
      results,
      flaggedFields: [],
    });
  }

  // No domain: look up across all domains
  const exact = lookupTerm(args.term);

  if (exact) {
    return withStructuredContent({
      ok: true,
      entry: exact,
      flaggedFields: [],
    });
  }

  const results = searchTerms(args.term);

  return withStructuredContent({
    ok: results.length > 0,
    query: args.term,
    results,
    flaggedFields: [],
  });
}
