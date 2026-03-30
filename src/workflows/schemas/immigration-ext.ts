import { z } from "zod";

// --- Trip abroad sub-schema for naturalization physical presence tracking ---

const tripAbroadSchema = z
  .object({
    departure: z.string().trim().min(1),
    return: z.string().trim().min(1),
    destination: z.string().trim().min(1),
  })
  .strict();

// --- Naturalization (N-400) ---

export const naturalizationInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    dob: z.string().trim().min(1),
    greenCardDate: z.string().trim().min(1),
    residencePeriod: z.coerce.number().int().nonnegative(),
    physicalPresenceDays: z.coerce.number().int().nonnegative(),
    tripsAbroad: z.array(tripAbroadSchema).default([]),
    employmentHistory: z.array(z.string().trim().min(1)).default([]),
    hasGoodMoralCharacter: z.boolean().default(true),
    englishProficiency: z.enum(["fluent", "basic", "exempt"]),
    civicsReady: z.boolean().default(false),
    maritalStatus: z.string().trim().min(1),
  })
  .strict();

export type NaturalizationInput = z.infer<typeof naturalizationInputSchema>;

// --- Green Card Renewal (I-90 / I-751) ---

export const greenCardRenewalInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    cardExpirationDate: z.string().trim().min(1),
    cardType: z.enum(["10year", "2year-conditional"]),
    reason: z.enum(["expiring", "lost", "damaged", "name-change"]),
    isConditional: z.boolean().default(false),
    hasJointFiling: z.boolean().default(false),
  })
  .strict();

export type GreenCardRenewalInput = z.infer<typeof greenCardRenewalInputSchema>;

// --- DACA Renewal ---

export const dacaRenewalInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    dob: z.string().trim().min(1),
    lastApprovalDate: z.string().trim().min(1),
    expirationDate: z.string().trim().min(1),
    hasContinuousPresence: z.boolean().default(true),
    hasConvictions: z.boolean().default(false),
    advanceParoleHistory: z.boolean().default(false),
  })
  .strict();

export type DacaRenewalInput = z.infer<typeof dacaRenewalInputSchema>;

// --- Work Authorization (EAD) ---

export const workAuthorizationInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    category: z.enum(["marriage", "asylum", "student-opt", "student-cpt", "ead-renewal"]),
    currentEadExpiration: z.string().trim().optional(),
    gapDays: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

export type WorkAuthorizationInput = z.infer<typeof workAuthorizationInputSchema>;
