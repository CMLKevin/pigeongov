import { z } from "zod";

import { householdMemberSchema, identitySchema } from "./common.js";

export const immigrationInputSchema = z
  .object({
    applicant: identitySchema,
    beneficiary: z
      .object({
        fullName: z.string().trim().min(1),
        relationship: z.string().trim().min(1),
        currentCountry: z.string().trim().min(1),
        currentlyInUnitedStates: z.boolean().default(false),
      })
      .strict(),
    household: z.array(householdMemberSchema).default([]),
    visaGoal: z.enum(["family", "fiance", "employment", "adjustment"]).default("family"),
    petitionerStatus: z.enum(["uscitizen", "permanent_resident", "employer", "other"]),
    hasPassportCopy: z.boolean().default(false),
    hasBirthCertificate: z.boolean().default(false),
    hasRelationshipEvidence: z.boolean().default(false),
    hasFinancialSponsor: z.boolean().default(false),
    priorVisaDenials: z.boolean().default(false),
    needsTranslation: z.boolean().default(false),
    workAuthorizationRequested: z.boolean().default(false),
    notes: z.string().trim().optional(),
  })
  .strict();

export type ImmigrationWorkflowInput = z.infer<typeof immigrationInputSchema>;
