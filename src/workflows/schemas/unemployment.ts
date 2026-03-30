import { z } from "zod";

import { identitySchema, stateSchema } from "./common.js";

export const unemploymentInputSchema = z
  .object({
    applicant: identitySchema,
    stateOfClaim: stateSchema,
    lastEmployerName: z.string().trim().min(1),
    lastDayWorked: z.string().trim().min(1),
    separationReason: z.enum(["laid_off", "hours_reduced", "fired", "quit", "seasonal_end"]),
    wagesLast12Months: z.coerce.number().nonnegative(),
    receivingSeverance: z.boolean().default(false),
    availableForWork: z.boolean().default(true),
    identityProofAvailable: z.boolean().default(false),
    wageProofAvailable: z.boolean().default(false),
    separationNoticeAvailable: z.boolean().default(false),
    notes: z.string().trim().optional(),
  })
  .strict();

export type UnemploymentWorkflowInput = z.infer<typeof unemploymentInputSchema>;
