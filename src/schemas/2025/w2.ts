import { z } from "zod";

import {
  einSchema,
  formMeta,
  moneySchema,
  nonNegativeMoneySchema,
  personIdentitySchema,
  stateInfoSchema,
  taxYearSchema,
  w2Box12ItemSchema,
} from "./shared.js";

export const w2Meta = formMeta({
  id: "w2",
  name: "Form W-2",
  taxYear: 2025,
  version: "2025.1",
  kind: "source-document",
});

export const w2Schema = z
  .object({
    taxYear: taxYearSchema,
    employer: z
      .object({
        name: z.string().trim().min(1).describe("Employer name"),
        ein: einSchema.optional().describe("Employer EIN"),
        address: z
          .object({
            street1: z.string().trim().min(1).describe("Employer street address line 1"),
            street2: z.string().trim().optional().describe("Employer street address line 2"),
            city: z.string().trim().min(1).describe("Employer city"),
            state: z.string().trim().regex(/^[A-Z]{2}$/).describe("Employer state"),
            zipCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/).describe("Employer ZIP code"),
          })
          .strict()
          .optional()
          .describe("Employer address"),
      })
      .strict()
      .describe("Employer information"),
    employee: personIdentitySchema
      .omit({ address: true })
      .extend({
        address: personIdentitySchema.shape.address,
      })
      .strict()
      .describe("Employee information"),
    boxes: z
      .object({
        box1WagesTipsOtherCompensation: moneySchema.optional().describe("Box 1 - wages, tips, other compensation"),
        box2FederalIncomeTaxWithheld: nonNegativeMoneySchema.optional().describe("Box 2 - federal income tax withheld"),
        box3SocialSecurityWages: nonNegativeMoneySchema.optional().describe("Box 3 - social security wages"),
        box4SocialSecurityTaxWithheld: nonNegativeMoneySchema.optional().describe("Box 4 - social security tax withheld"),
        box5MedicareWagesAndTips: nonNegativeMoneySchema.optional().describe("Box 5 - medicare wages and tips"),
        box6MedicareTaxWithheld: nonNegativeMoneySchema.optional().describe("Box 6 - medicare tax withheld"),
        box7SocialSecurityTips: nonNegativeMoneySchema.optional().describe("Box 7 - social security tips"),
        box8AllocatedTips: nonNegativeMoneySchema.optional().describe("Box 8 - allocated tips"),
        box10DependentCareBenefits: nonNegativeMoneySchema.optional().describe("Box 10 - dependent care benefits"),
        box11NonqualifiedPlans: nonNegativeMoneySchema.optional().describe("Box 11 - nonqualified plans"),
        box12: z.array(w2Box12ItemSchema).default([]).describe("Box 12 entries"),
        box13StatutoryEmployee: z.boolean().optional().describe("Box 13 - statutory employee"),
        box13RetirementPlan: z.boolean().optional().describe("Box 13 - retirement plan"),
        box13ThirdPartySickPay: z.boolean().optional().describe("Box 13 - third-party sick pay"),
        box14Other: z.array(z.string().trim().min(1)).default([]).describe("Box 14 - other entries"),
        state: z.array(stateInfoSchema).default([]).describe("State and local boxes 15-20"),
      })
      .strict()
      .describe("W-2 box data"),
  })
  .strict()
  .describe("W-2 source document");

export type W2Schema = z.infer<typeof w2Schema>;
