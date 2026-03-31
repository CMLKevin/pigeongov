import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import {
  analyzeSaveTransition,
  type SaveTransitionInput,
} from "../../advisory/student-loans/save-transition.js";

export const schema = {
  currentPlan: z
    .enum(["SAVE", "PAYE", "IBR", "ICR", "REPAYE", "standard"])
    .describe("Current repayment plan (SAVE and REPAYE have ended)"),
  loanBalance: z.coerce.number().min(0).describe("Total federal student loan balance"),
  interestRate: z.coerce
    .number()
    .min(0)
    .max(1)
    .describe("Annual interest rate as a decimal (e.g., 0.065 for 6.5%)"),
  annualIncome: z.coerce.number().min(0).describe("Annual gross income"),
  householdSize: z.coerce.number().int().min(1).max(20).describe("Number of people in household"),
  state: z.string().length(2).default("CA").describe("Two-letter state code"),
  filingStatus: z
    .enum(["single", "married_filing_jointly", "married_filing_separately"])
    .default("single")
    .describe("Tax filing status"),
  monthsInRepayment: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Months in active repayment (count toward forgiveness)"),
  monthsInSaveForbearance: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Months in SAVE administrative forbearance (do NOT count toward forgiveness)"),
  isParentPlusLoan: z.boolean().default(false).describe("Whether these are Parent PLUS loans"),
  hasConsolidatedLoans: z
    .boolean()
    .default(false)
    .describe("Whether loans have been consolidated into a Direct Consolidation Loan"),
  employerType: z
    .enum(["government", "nonprofit", "forprofit", "other"])
    .default("forprofit")
    .describe("Employer type for PSLF assessment"),
  monthsOfPSLFEmployment: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Months of qualifying PSLF employment"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_student_loan_transition",
  description:
    "SAVE transition advisor for the 2026 student loan crisis. Analyzes urgent actions, " +
    "compares repayment plans (IBR, RAP, ICR, Standard), tracks PSLF eligibility and risk, " +
    "and identifies consolidation deadlines. The SAVE plan permanently ended March 10, 2026 — " +
    "7.5M borrowers must transition by September 30, 2026.",
};

export default function studentLoanTransitionTool(
  args: InferSchema<typeof schema>,
) {
  const input: SaveTransitionInput = {
    currentPlan: args.currentPlan,
    loanBalance: args.loanBalance,
    interestRate: args.interestRate,
    annualIncome: args.annualIncome,
    householdSize: args.householdSize,
    state: args.state,
    filingStatus: args.filingStatus,
    monthsInRepayment: args.monthsInRepayment,
    monthsInSaveForbearance: args.monthsInSaveForbearance,
    isParentPlusLoan: args.isParentPlusLoan,
    hasConsolidatedLoans: args.hasConsolidatedLoans,
    employerType: args.employerType,
    monthsOfPSLFEmployment: args.monthsOfPSLFEmployment,
  };

  const result = analyzeSaveTransition(input);

  return withStructuredContent({
    ok: true,
    summary:
      `${result.urgentActions.length} urgent actions. ` +
      `Lowest monthly: $${Math.min(...result.planComparison.map((p) => p.monthlyPayment))}/mo. ` +
      `PSLF: ${result.pslf.eligible ? `eligible, ${result.pslf.paymentsRemaining} payments remaining` : "not eligible"}.`,
    analysis: result,
  });
}
