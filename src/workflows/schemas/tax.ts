import { z } from "zod";

import { identitySchema } from "./common.js";

const taxDependentSchema = z
  .object({
    name: z.string().trim().min(1),
    ssn: z.string().trim().regex(/^\d{3}-\d{2}-\d{4}$/),
    relationship: z.string().trim().min(1),
    childTaxCreditEligible: z.boolean(),
    eitcEligible: z.boolean().optional(),
  })
  .strict();

export const taxInputSchema = z
  .object({
    taxpayer: identitySchema,
    spouse: identitySchema.optional(),
    dependents: z.array(taxDependentSchema).default([]),
    filingStatus: z.enum([
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
      "qualifying_surviving_spouse",
    ]),
    wages: z.coerce.number().default(0),
    taxableInterest: z.coerce.number().default(0),
    ordinaryDividends: z.coerce.number().default(0),
    scheduleCNet: z.coerce.number().default(0),
    otherIncome: z.coerce.number().default(0),
    adjustments: z
      .object({
        educatorExpenses: z.coerce.number().default(0),
        hsaDeduction: z.coerce.number().default(0),
        selfEmploymentTaxDeduction: z.coerce.number().default(0),
        iraDeduction: z.coerce.number().default(0),
        studentLoanInterest: z.coerce.number().default(0),
      })
      .strict()
      .default({
        educatorExpenses: 0,
        hsaDeduction: 0,
        selfEmploymentTaxDeduction: 0,
        iraDeduction: 0,
        studentLoanInterest: 0,
      }),
    useItemizedDeductions: z.boolean().default(false),
    itemizedDeductions: z.coerce.number().default(0),
    federalWithheld: z.coerce.number().default(0),
    estimatedPayments: z.coerce.number().default(0),
    // OBBB Act fields
    tipIncome: z.coerce.number().default(0),
    overtimePay: z.coerce.number().default(0),
    autoLoanInterest: z.coerce.number().default(0),
    taxpayerAge: z.coerce.number().default(0),
    spouseAge: z.coerce.number().default(0),
    saltDeduction: z.coerce.number().default(0),
    // Capital gains
    capitalGains: z
      .object({
        shortTermGains: z.coerce.number().default(0),
        shortTermLosses: z.coerce.number().default(0),
        longTermGains: z.coerce.number().default(0),
        longTermLosses: z.coerce.number().default(0),
        qualifiedDividends: z.coerce.number().default(0),
        carryforwardLoss: z.coerce.number().default(0),
      })
      .strict()
      .optional(),
    // State tax fields
    stateCode: z.string().trim().toUpperCase().optional(),
    stateWithheld: z.coerce.number().default(0),
    stateEstimatedPayments: z.coerce.number().default(0),
  })
  .strict();

export type TaxWorkflowInput = z.infer<typeof taxInputSchema>;
