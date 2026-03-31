import { z } from "zod";

import { stateSchema } from "./common.js";

// ---------------------------------------------------------------------------
// TANF (Temporary Assistance for Needy Families)
// ---------------------------------------------------------------------------

export const tanfInputSchema = z
  .object({
    applicantName: z.string().trim().default(""),
    state: stateSchema,
    householdSize: z.coerce.number().int().min(1).default(1),
    numberOfChildren: z.coerce.number().int().nonnegative().default(0),
    youngestChildAge: z.coerce.number().int().nonnegative().default(0),
    monthlyGrossIncome: z.coerce.number().nonnegative().default(0),
    countableAssets: z.coerce.number().nonnegative().default(0),
    monthsReceived: z.coerce.number().int().nonnegative().default(0),
    isEmployed: z.boolean().default(false),
    citizenshipStatus: z
      .enum(["us_citizen", "permanent_resident", "qualified_alien", "other"])
      .default("us_citizen"),
  })
  .strict();

export type TanfInput = z.infer<typeof tanfInputSchema>;
