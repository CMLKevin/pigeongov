import { z } from "zod";

// ---------------------------------------------------------------------------
// Medicare Enrollment
// ---------------------------------------------------------------------------

export const medicareEnrollmentInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    dob: z.string().trim().min(1),
    age: z.coerce.number().int().nonnegative(),
    hasPartA: z.boolean().default(false),
    hasPartB: z.boolean().default(false),
    currentCoverage: z.string().trim().default("none"),
    annualIncome: z.coerce.number().nonnegative(),
    filingStatus: z.enum(["single", "married_filing_jointly"]),
  })
  .strict();

export type MedicareEnrollmentInput = z.infer<typeof medicareEnrollmentInputSchema>;
