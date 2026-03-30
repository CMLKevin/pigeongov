import { z } from "zod";

import { stateSchema } from "./common.js";

// ---------------------------------------------------------------------------
// Small Claims
// ---------------------------------------------------------------------------

export const smallClaimsInputSchema = z
  .object({
    plaintiffName: z.string().trim().min(1),
    defendantName: z.string().trim().min(1),
    state: stateSchema,
    claimAmount: z.coerce.number().positive(),
    claimType: z.enum(["money-owed", "property-damage", "contract", "deposit", "other"]),
    incidentDate: z.string().trim().min(1),
    hasEvidence: z.boolean().default(false),
  })
  .strict();

export type SmallClaimsInput = z.infer<typeof smallClaimsInputSchema>;

// ---------------------------------------------------------------------------
// Expungement
// ---------------------------------------------------------------------------

export const expungementInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    state: stateSchema,
    offenseType: z.enum(["misdemeanor", "felony", "infraction"]),
    offenseDate: z.string().trim().min(1),
    sentenceCompletionDate: z.string().trim().min(1),
    hasCompletedProbation: z.boolean().default(false),
    subsequentOffenses: z.coerce.number().int().nonnegative().default(0),
  })
  .strict();

export type ExpungementInput = z.infer<typeof expungementInputSchema>;

// ---------------------------------------------------------------------------
// Child Support Modification
// ---------------------------------------------------------------------------

export const childSupportModificationInputSchema = z
  .object({
    petitionerName: z.string().trim().min(1),
    currentOrderAmount: z.coerce.number().nonnegative(),
    currentIncome: z.coerce.number().nonnegative(),
    previousIncome: z.coerce.number().nonnegative(),
    reason: z.enum(["income-change", "custody-change", "child-needs-change"]),
    state: stateSchema,
    numberOfChildren: z.coerce.number().int().positive(),
  })
  .strict();

export type ChildSupportModificationInput = z.infer<typeof childSupportModificationInputSchema>;
