import { z } from "zod";

// ---------------------------------------------------------------------------
// Basic Will
// ---------------------------------------------------------------------------

const willAssetSchema = z
  .object({
    description: z.string().trim().min(1),
    estimatedValue: z.coerce.number().nonnegative(),
    beneficiary: z.string().trim().min(1),
  })
  .strict();

const willChildSchema = z
  .object({
    name: z.string().trim().min(1),
    age: z.coerce.number().int().nonnegative(),
    isMinor: z.boolean(),
  })
  .strict();

const executorSchema = z
  .object({
    name: z.string().trim().min(1),
    relationship: z.string().trim().min(1),
  })
  .strict();

export const basicWillInputSchema = z
  .object({
    testatorName: z.string().trim().min(1),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    maritalStatus: z.enum(["single", "married", "divorced", "widowed"]),
    children: z.array(willChildSchema).default([]),
    assets: z.array(willAssetSchema).default([]),
    executor: executorSchema,
    alternateExecutor: executorSchema.optional(),
    guardianForMinors: z.string().trim().optional(),
  })
  .strict();

export type BasicWillInput = z.infer<typeof basicWillInputSchema>;

// ---------------------------------------------------------------------------
// Power of Attorney
// ---------------------------------------------------------------------------

export const powerOfAttorneyInputSchema = z
  .object({
    principalName: z.string().trim().min(1),
    agentName: z.string().trim().min(1),
    type: z.enum(["durable", "springing", "healthcare", "financial"]),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    powers: z.array(z.string().trim().min(1)).min(1),
    effectiveDate: z.string().trim().optional(),
  })
  .strict();

export type PowerOfAttorneyInput = z.infer<typeof powerOfAttorneyInputSchema>;

// ---------------------------------------------------------------------------
// Advance Directive
// ---------------------------------------------------------------------------

const healthcarePreferencesSchema = z
  .object({
    lifeSupport: z.boolean(),
    feedingTube: z.boolean(),
    painManagement: z.boolean(),
    organDonation: z.boolean(),
  })
  .strict();

const agentInfoSchema = z
  .object({
    name: z.string().trim().min(1),
    relationship: z.string().trim().min(1),
  })
  .strict();

export const advanceDirectiveInputSchema = z
  .object({
    principalName: z.string().trim().min(1),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    preferences: healthcarePreferencesSchema,
    healthcareAgent: agentInfoSchema,
    alternateAgent: agentInfoSchema.optional(),
  })
  .strict();

export type AdvanceDirectiveInput = z.infer<typeof advanceDirectiveInputSchema>;
