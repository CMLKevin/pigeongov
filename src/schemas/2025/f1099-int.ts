import { z } from "zod";

import {
  einSchema,
  formMeta,
  nonNegativeMoneySchema,
  personIdentitySchema,
  stateInfoSchema,
  taxYearSchema,
} from "./shared.js";

export const f1099IntMeta = formMeta({
  id: "1099-int",
  name: "Form 1099-INT",
  taxYear: 2025,
  version: "2025.1",
  kind: "source-document",
});

export const f1099IntSchema = z
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
        box1InterestIncome: nonNegativeMoneySchema.optional().describe("Box 1 - interest income"),
        box2EarlyWithdrawalPenalty: nonNegativeMoneySchema.optional().describe("Box 2 - early withdrawal penalty"),
        box3InterestOnUsSavingsBondsAndTreasuryObligations: nonNegativeMoneySchema.optional().describe("Box 3 - interest on U.S. savings bonds and treasury obligations"),
        box4FederalIncomeTaxWithheld: nonNegativeMoneySchema.optional().describe("Box 4 - federal income tax withheld"),
        box5InvestmentExpenses: nonNegativeMoneySchema.optional().describe("Box 5 - investment expenses"),
        box6ForeignTaxPaid: nonNegativeMoneySchema.optional().describe("Box 6 - foreign tax paid"),
        box7ForeignCountryOrUsPossession: z.string().trim().optional().describe("Box 7 - foreign country or U.S. possession"),
        box8TaxExemptInterest: nonNegativeMoneySchema.optional().describe("Box 8 - tax-exempt interest"),
        box9SpecifiedPrivateActivityBondInterest: nonNegativeMoneySchema.optional().describe("Box 9 - specified private activity bond interest"),
        box10MarketDiscount: nonNegativeMoneySchema.optional().describe("Box 10 - market discount"),
        box11BondPremium: nonNegativeMoneySchema.optional().describe("Box 11 - bond premium"),
        box12BondPremiumOnTaxExemptBond: nonNegativeMoneySchema.optional().describe("Box 12 - bond premium on tax-exempt bond"),
        box13BondPremiumOnTreasuryObligations: nonNegativeMoneySchema.optional().describe("Box 13 - bond premium on treasury obligations"),
        box14TaxExemptAndTaxCreditBondCusipNo: z.string().trim().optional().describe("Box 14 - tax-exempt and tax credit bond CUSIP number"),
        box15State: z.array(stateInfoSchema).default([]).describe("State reporting information"),
      })
      .strict()
      .describe("1099-INT box data"),
  })
  .strict()
  .describe("1099-INT source document");

export type F1099IntSchema = z.infer<typeof f1099IntSchema>;
