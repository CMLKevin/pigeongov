import { z } from "zod";

// ---------------------------------------------------------------------------
// SSA Retirement Benefit Estimator
// ---------------------------------------------------------------------------

const earningsYearSchema = z
  .object({
    year: z.coerce.number().int().positive(),
    earnings: z.coerce.number().nonnegative(),
  })
  .strict();

export const ssaEstimatorInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    dob: z.string().trim().min(1),
    earningsHistory: z.array(earningsYearSchema).min(1),
    currentAnnualEarnings: z.coerce.number().nonnegative(),
    spouseName: z.string().trim().optional(),
    spouseDob: z.string().trim().optional(),
    spouseEarnings: z.coerce.number().nonnegative().optional(),
  })
  .strict();

export type SsaEstimatorInput = z.infer<typeof ssaEstimatorInputSchema>;
