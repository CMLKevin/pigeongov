import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { calculateCliff } from "../../advisory/cliff/calculator.js";

export const schema = {
  annualIncome: z.coerce.number().min(0).describe("Annual household income before taxes"),
  householdSize: z.coerce.number().int().min(1).max(20).describe("Number of people in household"),
  state: z.string().length(2).default("CA").describe("Two-letter state code (e.g., CA, NY, TX)"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_calculate_cliff",
  description:
    "Benefits cliff calculator. Given income, household size, and state, returns current benefits, " +
    "income thresholds where each program drops off, and the safe raise target where earnings " +
    "offset lost benefits.",
};

export default function calculateCliffTool(args: {
  annualIncome: number;
  householdSize: number;
  state: string;
}) {
  const result = calculateCliff({
    annualIncome: args.annualIncome,
    householdSize: args.householdSize,
    state: args.state,
  });

  return withStructuredContent({
    ok: true,
    summary:
      result.currentBenefits.length > 0
        ? `Found ${result.currentBenefits.length} current benefits and ${result.cliffPoints.length} cliff points`
        : "No current benefit eligibility at this income level",
    analysis: result,
  });
}
