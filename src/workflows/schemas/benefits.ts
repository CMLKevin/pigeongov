import { z } from "zod";

import { stateSchema } from "./common.js";

// ---------------------------------------------------------------------------
// SNAP (Supplemental Nutrition Assistance Program)
// ---------------------------------------------------------------------------

export const snapInputSchema = z
  .object({
    householdSize: z.coerce.number().int().positive(),
    monthlyGrossIncome: z.coerce.number().nonnegative(),
    monthlyNetIncome: z.coerce.number().nonnegative(),
    state: stateSchema,
    citizenshipStatus: z.enum(["us_citizen", "permanent_resident", "qualified_alien", "other"]),
    receivingTanf: z.boolean().default(false),
    receivingSsi: z.boolean().default(false),
    hasAssets: z.boolean().default(false),
    assetValue: z.coerce.number().nonnegative().default(0),
    hasVehicle: z.boolean().default(false),
  })
  .strict();

export type SnapInput = z.infer<typeof snapInputSchema>;

// ---------------------------------------------------------------------------
// Section 8 Housing Choice Voucher
// ---------------------------------------------------------------------------

export const section8InputSchema = z
  .object({
    householdSize: z.coerce.number().int().positive(),
    annualIncome: z.coerce.number().nonnegative(),
    state: stateSchema,
    county: z.string().trim().min(1),
    currentHousingCost: z.coerce.number().nonnegative(),
    isDisabled: z.boolean().default(false),
    isElderly: z.boolean().default(false),
    isVeteran: z.boolean().default(false),
  })
  .strict();

export type Section8Input = z.infer<typeof section8InputSchema>;

// ---------------------------------------------------------------------------
// WIC (Women, Infants, and Children)
// ---------------------------------------------------------------------------

export const wicInputSchema = z
  .object({
    applicantCategory: z.enum(["pregnant", "postpartum", "infant", "child"]),
    applicantAge: z.coerce.number().int().nonnegative().optional(),
    householdSize: z.coerce.number().int().positive(),
    annualIncome: z.coerce.number().nonnegative(),
    receivingMedicaid: z.boolean().default(false),
    receivingSnap: z.boolean().default(false),
    receivingTanf: z.boolean().default(false),
  })
  .strict();

export type WicInput = z.infer<typeof wicInputSchema>;

// ---------------------------------------------------------------------------
// LIHEAP (Low Income Home Energy Assistance Program)
// ---------------------------------------------------------------------------

export const liheapInputSchema = z
  .object({
    householdSize: z.coerce.number().int().positive(),
    annualIncome: z.coerce.number().nonnegative(),
    state: stateSchema,
    heatingSource: z.string().trim().min(1),
    hasUtilityShutoffNotice: z.boolean().default(false),
    season: z.enum(["winter", "summer"]),
  })
  .strict();

export type LiheapInput = z.infer<typeof liheapInputSchema>;

// ---------------------------------------------------------------------------
// Medicaid
// ---------------------------------------------------------------------------

export const medicaidInputSchema = z
  .object({
    householdSize: z.coerce.number().int().positive(),
    monthlyIncome: z.coerce.number().nonnegative(),
    state: stateSchema,
    isPregnant: z.boolean().default(false),
    hasChildren: z.boolean().default(false),
    isDisabled: z.boolean().default(false),
    isElderly: z.boolean().default(false),
    currentInsurance: z.string().trim().default("none"),
  })
  .strict();

export type MedicaidInput = z.infer<typeof medicaidInputSchema>;

// ---------------------------------------------------------------------------
// SSDI (Social Security Disability Insurance) Application
// ---------------------------------------------------------------------------

export const ssdiInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    disabilityOnsetDate: z.string().trim().min(1),
    lastWorkDate: z.string().trim().min(1),
    monthlyEarnings: z.coerce.number().nonnegative(),
    medicalConditions: z.array(z.string().trim().min(1)).min(1),
    treatingPhysicians: z.array(z.string().trim().min(1)).min(1),
    hasBeenHospitalized: z.boolean().default(false),
  })
  .strict();

export type SsdiInput = z.infer<typeof ssdiInputSchema>;
