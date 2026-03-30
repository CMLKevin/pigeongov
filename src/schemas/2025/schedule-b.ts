import { z } from "zod";

import {
  filingStatusSchema,
  formMeta,
  moneySchema,
  nonNegativeMoneySchema,
  taxYearSchema,
} from "./shared.js";

export const scheduleBMeta = formMeta({
  id: "schedule-b",
  name: "Schedule B",
  taxYear: 2025,
  version: "2025.1",
  kind: "schedule",
});

const interestSourceSchema = z
  .object({
    payerName: z.string().trim().min(1).describe("Payer name"),
    amount: nonNegativeMoneySchema.describe("Interest amount"),
  })
  .strict()
  .describe("Interest source entry");

const dividendSourceSchema = z
  .object({
    payerName: z.string().trim().min(1).describe("Payer name"),
    amount: nonNegativeMoneySchema.describe("Dividend amount"),
  })
  .strict()
  .describe("Dividend source entry");

export const scheduleBSchema = z
  .object({
    taxYear: taxYearSchema,
    filingStatus: filingStatusSchema.optional().describe("Filing status"),
    part1Interest: z
      .object({
        sources: z.array(interestSourceSchema).default([]).describe("Interest sources"),
        totalInterest: moneySchema.optional().describe("Line 4 - total interest"),
      })
      .strict()
      .describe("Part I - Interest"),
    part2OrdinaryDividends: z
      .object({
        sources: z.array(dividendSourceSchema).default([]).describe("Dividend sources"),
        totalOrdinaryDividends: moneySchema.optional().describe("Line 6 - total ordinary dividends"),
      })
      .strict()
      .describe("Part II - Ordinary Dividends"),
    part3ForeignAccountsAndTrusts: z
      .object({
        hasForeignAccount: z.boolean().default(false).describe("Line 7a - foreign account"),
        foreignCountry: z.string().trim().optional().describe("Line 7b - foreign country"),
        hasForeignTrust: z.boolean().default(false).describe("Line 8 - foreign trust"),
      })
      .strict()
      .describe("Part III - Foreign Accounts and Trusts"),
  })
  .strict()
  .describe("Schedule B (Interest and Ordinary Dividends)");

export type ScheduleBSchema = z.infer<typeof scheduleBSchema>;
