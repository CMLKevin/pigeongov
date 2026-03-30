import { z } from "zod";

import { identitySchema, stateSchema } from "./common.js";

export const planningInputSchema = z
  .object({
    applicant: identitySchema,
    entityName: z.string().trim().min(1),
    state: stateSchema,
    locality: z.string().trim().min(1),
    industry: z.string().trim().min(1),
    needsProfessionalLicense: z.boolean().default(false),
    hasZoningQuestions: z.boolean().default(false),
    notes: z.string().trim().optional(),
  })
  .strict();

export type PlanningWorkflowInput = z.infer<typeof planningInputSchema>;
