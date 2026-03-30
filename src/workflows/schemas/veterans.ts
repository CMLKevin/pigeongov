import { z } from "zod";

// ---------------------------------------------------------------------------
// VA Disability Claim
// ---------------------------------------------------------------------------

const vaConditionSchema = z
  .object({
    name: z.string().trim().min(1),
    serviceConnected: z.boolean(),
    currentSeverity: z.enum(["mild", "moderate", "severe"]),
  })
  .strict();

export const vaDisabilityInputSchema = z
  .object({
    veteranName: z.string().trim().min(1),
    serviceStartDate: z.string().trim().min(1),
    serviceEndDate: z.string().trim().min(1),
    dischargeType: z.string().trim().min(1),
    conditions: z.array(vaConditionSchema).min(1),
    hasBuddyStatements: z.boolean().default(false),
    hasMedicalRecords: z.boolean().default(false),
  })
  .strict();

export type VaDisabilityInput = z.infer<typeof vaDisabilityInputSchema>;

// ---------------------------------------------------------------------------
// GI Bill
// ---------------------------------------------------------------------------

export const giBillInputSchema = z
  .object({
    veteranName: z.string().trim().min(1),
    serviceType: z.enum(["active", "reserve", "guard"]),
    totalServiceMonths: z.coerce.number().int().nonnegative(),
    postServiceMonths: z.coerce.number().int().nonnegative(),
    schoolName: z.string().trim().min(1),
    programType: z.enum(["undergraduate", "graduate", "vocational"]),
    zipCode: z.string().trim().min(5),
    monthsUsed: z.coerce.number().int().nonnegative().default(0),
  })
  .strict();

export type GiBillInput = z.infer<typeof giBillInputSchema>;

// ---------------------------------------------------------------------------
// VA Healthcare Enrollment
// ---------------------------------------------------------------------------

export const vaHealthcareInputSchema = z
  .object({
    veteranName: z.string().trim().min(1),
    disabilityRating: z.coerce.number().int().nonnegative().default(0),
    annualIncome: z.coerce.number().nonnegative(),
    hasServiceConnectedDisability: z.boolean().default(false),
    receivingVaPension: z.boolean().default(false),
    hasCombatService: z.boolean().default(false),
  })
  .strict();

export type VaHealthcareInput = z.infer<typeof vaHealthcareInputSchema>;
