import { z } from "zod";

import { stateSchema } from "./common.js";

// ---------------------------------------------------------------------------
// SSI (Supplemental Security Income)
// ---------------------------------------------------------------------------

export const ssiInputSchema = z
  .object({
    applicantName: z.string().trim().default(""),
    age: z.coerce.number().int().nonnegative().default(0),
    isBlind: z.boolean().default(false),
    isDisabled: z.boolean().default(false),
    maritalStatus: z.enum(["single", "married"]).default("single"),
    countableAssets: z.coerce.number().nonnegative().default(0),
    monthlyEarnedIncome: z.coerce.number().nonnegative().default(0),
    monthlyUnearnedIncome: z.coerce.number().nonnegative().default(0),
    state: stateSchema,
    receivingSSA: z.boolean().default(false),
    livingArrangement: z
      .enum(["own_household", "others_household", "institution"])
      .default("own_household"),
  })
  .strict();

export type SsiInput = z.infer<typeof ssiInputSchema>;
