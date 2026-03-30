import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { screenerInputSchema } from "../../advisory/screener/intake.js";
import { screenEligibility } from "../../advisory/screener/engine.js";

export const schema = {
  householdSize: z.coerce.number().int().min(1).max(20).describe("Number of people in household"),
  annualHouseholdIncome: z.coerce.number().min(0).describe("Total annual household income before taxes"),
  state: z.string().length(2).describe("Two-letter state code (e.g., CA, NY, TX)"),
  citizenshipStatus: z
    .enum(["us_citizen", "permanent_resident", "conditional_resident", "ead_holder", "undocumented", "refugee_asylee", "other"])
    .describe("Citizenship or immigration status"),
  ages: z.array(z.coerce.number().int().min(0).max(120)).describe("Ages of all household members"),
  hasDisability: z.boolean().default(false).describe("Whether anyone in household has a disability"),
  employmentStatus: z
    .enum(["employed", "unemployed", "self_employed", "retired", "disabled"])
    .describe("Current employment status"),
  isVeteran: z.boolean().default(false).describe("Whether anyone in household is a military veteran"),
  hasHealthInsurance: z.boolean().default(true).describe("Whether everyone has health insurance"),
  monthlyRent: z.coerce.number().min(0).default(0).describe("Monthly rent or mortgage payment"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_screen_eligibility",
  description:
    "Universal eligibility screener. Takes 10 household data points and returns a tiered list of government programs the household may qualify for, with confidence levels and next steps.",
};

export default function screenEligibilityTool(args: z.infer<typeof screenerInputSchema>) {
  const parsed = screenerInputSchema.safeParse(args);
  if (!parsed.success) {
    return withStructuredContent({
      ok: false,
      error: "Invalid screener input",
      details: parsed.error.issues,
    });
  }

  const results = screenEligibility(parsed.data);

  const likely = results.filter((r) => r.eligible === "likely");
  const possible = results.filter((r) => r.eligible === "possible");

  return withStructuredContent({
    ok: true,
    summary: `Found ${likely.length} likely eligible and ${possible.length} possibly eligible programs`,
    results,
    totalScreened: results.length,
  });
}
