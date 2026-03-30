import { z } from "zod";

// ---------------------------------------------------------------------------
// FAFSA
// ---------------------------------------------------------------------------

const fafsaStudentInfoSchema = z
  .object({
    name: z.string().trim().min(1),
    dob: z.string().trim().min(1),
    ssn: z
      .string()
      .trim()
      .regex(/^\d{3}-\d{2}-\d{4}$/)
      .default("000-00-0000"),
    citizenshipStatus: z.enum(["us_citizen", "eligible_noncitizen", "other"]),
  })
  .strict();

const fafsaParentInfoSchema = z
  .object({
    income: z.coerce.number().nonnegative(),
    assets: z.coerce.number().nonnegative(),
    householdSize: z.coerce.number().int().positive(),
  })
  .strict();

export const fafsaInputSchema = z
  .object({
    studentInfo: fafsaStudentInfoSchema,
    dependencyStatus: z.enum(["dependent", "independent"]),
    parentInfo: fafsaParentInfoSchema.optional(),
    studentIncome: z.coerce.number().nonnegative().default(0),
    studentAssets: z.coerce.number().nonnegative().default(0),
    schoolCodes: z.array(z.string().trim().min(1)).default([]),
    filingStatus: z.enum([
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
      "qualifying_surviving_spouse",
    ]),
    hasCompletedTaxReturn: z.boolean().default(false),
  })
  .strict();

export type FafsaInput = z.infer<typeof fafsaInputSchema>;

// ---------------------------------------------------------------------------
// Student Loan Repayment
// ---------------------------------------------------------------------------

const studentLoanSchema = z
  .object({
    servicer: z.string().trim().min(1),
    balance: z.coerce.number().nonnegative(),
    rate: z.coerce.number().nonnegative(),
    type: z.enum(["federal", "private"]),
    originalAmount: z.coerce.number().nonnegative(),
  })
  .strict();

export const studentLoanRepaymentInputSchema = z
  .object({
    loans: z.array(studentLoanSchema).min(1),
    annualIncome: z.coerce.number().nonnegative(),
    filingStatus: z.enum([
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
      "qualifying_surviving_spouse",
    ]),
    householdSize: z.coerce.number().int().positive().default(1),
    employerType: z.enum(["public", "private", "nonprofit"]),
    monthsOfQualifyingPayments: z.coerce.number().int().nonnegative().default(0),
  })
  .strict();

export type StudentLoanRepaymentInput = z.infer<typeof studentLoanRepaymentInputSchema>;

// ---------------------------------------------------------------------------
// 529 Planner
// ---------------------------------------------------------------------------

export const plan529InputSchema = z
  .object({
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    annualContribution: z.coerce.number().nonnegative().default(0),
    beneficiaryAge: z.coerce.number().int().nonnegative(),
    investmentTimeline: z.coerce.number().int().positive(),
    currentBalance: z.coerce.number().nonnegative().default(0),
  })
  .strict();

export type Plan529Input = z.infer<typeof plan529InputSchema>;
