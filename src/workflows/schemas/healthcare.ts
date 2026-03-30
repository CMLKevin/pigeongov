import { z } from "zod";

import { householdMemberSchema, identitySchema, stateSchema } from "./common.js";

export const healthcareInputSchema = z
  .object({
    applicant: identitySchema,
    household: z.array(householdMemberSchema).default([]),
    stateOfResidence: stateSchema,
    annualHouseholdIncome: z.coerce.number().nonnegative(),
    currentlyInsured: z.boolean().default(false),
    qualifyingLifeEvent: z.boolean().default(false),
    hasEmployerCoverageOffer: z.boolean().default(false),
    needsDependentCoverage: z.boolean().default(false),
    immigrationDocumentsAvailable: z.boolean().default(true),
    incomeProofAvailable: z.boolean().default(false),
    residenceProofAvailable: z.boolean().default(false),
    preferredCoverageMonth: z.string().trim().min(1),
    notes: z.string().trim().optional(),
  })
  .strict();

export type HealthcareWorkflowInput = z.infer<typeof healthcareInputSchema>;
