import { z } from "zod";

import {
  einSchema,
  formMeta,
  nonNegativeMoneySchema,
  personIdentitySchema,
  stateInfoSchema,
  taxYearSchema,
} from "./shared.js";

export const f1099NecMeta = formMeta({
  id: "1099-nec",
  name: "Form 1099-NEC",
  taxYear: 2025,
  version: "2025.1",
  kind: "source-document",
});

export const f1099NecSchema = z
  .object({
    taxYear: taxYearSchema,
    payer: z
      .object({
        name: z.string().trim().min(1).describe("Payer name"),
        tin: einSchema.optional().describe("Payer TIN"),
        address: personIdentitySchema.shape.address.describe("Payer address"),
      })
      .strict()
      .describe("Payer information"),
    recipient: personIdentitySchema
      .omit({ address: true })
      .extend({
        address: personIdentitySchema.shape.address,
      })
      .strict()
      .describe("Recipient information"),
    boxes: z
      .object({
        box1NonemployeeCompensation: nonNegativeMoneySchema.optional().describe("Box 1 - nonemployee compensation"),
        box4FederalIncomeTaxWithheld: nonNegativeMoneySchema.optional().describe("Box 4 - federal income tax withheld"),
        box5StateTaxWithheld: nonNegativeMoneySchema.optional().describe("Box 5 - state tax withheld"),
        box6StateIncome: nonNegativeMoneySchema.optional().describe("Box 6 - state income"),
        box7State: z.array(stateInfoSchema).default([]).describe("State reporting information"),
        box1aDirectSales: z.boolean().optional().describe("Box 1a - direct sales indicator"),
        box2PayerMadeDirectSales: z.boolean().optional().describe("Box 2 - direct sales indicator"),
        box3PayerMadeStateWithholding: z.boolean().optional().describe("Box 3 - state withholding indicator"),
        box6FatcaFilingRequirement: z.boolean().optional().describe("Box 6 - FATCA filing requirement"),
      })
      .strict()
      .describe("1099-NEC box data"),
  })
  .strict()
  .describe("1099-NEC source document");

export type F1099NecSchema = z.infer<typeof f1099NecSchema>;
