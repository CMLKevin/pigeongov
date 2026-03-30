import { z } from "zod";

// ---------------------------------------------------------------------------
// Passport
// ---------------------------------------------------------------------------

const currentPassportInfoSchema = z
  .object({
    passportNumber: z.string().trim().min(1),
    issueDate: z.string().trim().min(1),
    expirationDate: z.string().trim().min(1),
  })
  .strict();

export const passportInputSchema = z
  .object({
    applicantName: z.string().trim().min(1),
    dob: z.string().trim().min(1),
    citizenshipProof: z.enum(["birth_certificate", "naturalization_certificate", "previous_passport"]),
    isRenewal: z.boolean().default(false),
    hasNameChange: z.boolean().default(false),
    isMinor: z.boolean().default(false),
    processingSpeed: z.enum(["routine", "expedited", "urgent"]).default("routine"),
    currentPassportInfo: currentPassportInfoSchema.optional(),
  })
  .strict();

export type PassportInput = z.infer<typeof passportInputSchema>;

// ---------------------------------------------------------------------------
// Name Change
// ---------------------------------------------------------------------------

export const nameChangeInputSchema = z
  .object({
    currentName: z.string().trim().min(1),
    newName: z.string().trim().min(1),
    reason: z.enum(["marriage", "divorce", "personal", "court-order"]),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    hasCourtOrder: z.boolean().default(false),
    entitiesToUpdate: z
      .array(z.string().trim().min(1))
      .default(["SSA", "DMV", "Passport", "Bank", "Employer", "Insurance", "Voter Registration", "Utilities"]),
  })
  .strict();

export type NameChangeInput = z.infer<typeof nameChangeInputSchema>;

// ---------------------------------------------------------------------------
// Voter Registration
// ---------------------------------------------------------------------------

export const voterRegistrationInputSchema = z
  .object({
    name: z.string().trim().min(1),
    address: z
      .object({
        street1: z.string().trim().min(1),
        street2: z.string().trim().optional(),
        city: z.string().trim().min(1),
        state: z
          .string()
          .trim()
          .regex(/^[A-Z]{2}$/),
        zipCode: z.string().trim().min(5),
      })
      .strict(),
    dob: z.string().trim().min(1),
    citizenshipConfirmed: z.boolean(),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    previousRegistration: z.boolean().default(false),
    partyAffiliation: z.string().trim().optional(),
  })
  .strict();

export type VoterRegistrationInput = z.infer<typeof voterRegistrationInputSchema>;

// ---------------------------------------------------------------------------
// REAL ID
// ---------------------------------------------------------------------------

export const realIdInputSchema = z
  .object({
    name: z.string().trim().min(1),
    dob: z.string().trim().min(1),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    hasIdentityDoc: z.boolean().default(false),
    hasSsnDoc: z.boolean().default(false),
    hasResidencyDocs: z.coerce.number().int().nonnegative().default(0),
    hasCurrentLicense: z.boolean().default(false),
  })
  .strict();

export type RealIdInput = z.infer<typeof realIdInputSchema>;
