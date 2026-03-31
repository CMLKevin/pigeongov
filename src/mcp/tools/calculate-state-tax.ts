import { z } from "zod";
import { withStructuredContent } from "../result.js";
import {
  calculateStateTax,
  listSupportedStates,
} from "../../engine/state-tax-integration.js";

const filingStatusSchema = z.enum([
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_surviving_spouse",
]);

export const calculateStateTaxInputSchema = z
  .object({
    /** Two-letter state code (e.g. "CA", "NY", "TX") */
    stateCode: z.string().trim().min(1).max(2).toUpperCase(),
    /** Federal AGI (adjusted gross income) */
    federalAGI: z.coerce.number().min(0),
    /** Federal taxable income */
    federalTaxableIncome: z.coerce.number().min(0).default(0),
    /** W-2 wages */
    wages: z.coerce.number().min(0).default(0),
    /** Filing status */
    filingStatus: filingStatusSchema.default("single"),
    /** Number of dependents */
    dependents: z.coerce.number().min(0).default(0),
    /** Itemized deductions */
    itemizedDeductions: z.coerce.number().min(0).default(0),
    /** State tax withheld */
    stateWithheld: z.coerce.number().min(0).default(0),
    /** State estimated payments */
    stateEstimatedPayments: z.coerce.number().min(0).default(0),
    /** Property tax paid */
    propertyTaxPaid: z.coerce.number().min(0).default(0),
    /** Mortgage interest */
    mortgageInterest: z.coerce.number().min(0).default(0),
    /** Charitable contributions */
    charitableContributions: z.coerce.number().min(0).default(0),
  })
  .strict();

export const listStatesInputSchema = z
  .object({})
  .strict()
  .optional();

export const schema = calculateStateTaxInputSchema.shape;

export const metadata = {
  title: "Calculate state tax",
  description:
    "Calculate state income tax for a given state and income. Supports 10 states with full bracket calculations plus 9 no-income-tax states.",
};

export default function calculateStateTaxTool(input: unknown): any {
  const parsed = calculateStateTaxInputSchema.parse(input);

  const result = calculateStateTax({
    state: parsed.stateCode,
    federalAGI: parsed.federalAGI,
    federalTaxableIncome: parsed.federalTaxableIncome,
    wages: parsed.wages,
    filingStatus: parsed.filingStatus,
    dependents: parsed.dependents,
    itemizedDeductions: parsed.itemizedDeductions,
    stateWithheld: parsed.stateWithheld,
    stateEstimatedPayments: parsed.stateEstimatedPayments,
    propertyTaxPaid: parsed.propertyTaxPaid,
    mortgageInterest: parsed.mortgageInterest,
    charitableContributions: parsed.charitableContributions,
  });

  // Omit rawResult from MCP output — it's internal detail
  const { rawResult: _raw, ...publicResult } = result;

  return withStructuredContent({
    ok: true,
    ...publicResult,
    supportedStates: listSupportedStates().map((s) => s.stateCode),
  });
}
