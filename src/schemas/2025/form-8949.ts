import { z } from "zod";

import {
  formMeta,
  moneySchema,
  nonNegativeMoneySchema,
  taxYearSchema,
} from "./shared.js";

export const form8949Meta = formMeta({
  id: "form-8949",
  name: "Form 8949",
  taxYear: 2025,
  version: "2025.1",
  kind: "schedule",
});

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const transactionSchema = z
  .object({
    description: z.string().trim().min(1).describe("(a) Description of property"),
    dateAcquired: z
      .string()
      .trim()
      .regex(datePattern, "Expected date in YYYY-MM-DD format")
      .describe("(b) Date acquired"),
    dateSold: z
      .string()
      .trim()
      .regex(datePattern, "Expected date in YYYY-MM-DD format")
      .describe("(c) Date sold or disposed of"),
    proceeds: nonNegativeMoneySchema.describe("(d) Proceeds"),
    costBasis: nonNegativeMoneySchema.describe("(e) Cost or other basis"),
    adjustments: moneySchema.optional().describe("(g) Amount of adjustment"),
    gainOrLoss: moneySchema.optional().describe("(h) Gain or (loss)"),
  })
  .strict()
  .describe("Form 8949 transaction entry");

export const form8949Schema = z
  .object({
    taxYear: taxYearSchema,
    part1ShortTerm: z
      .object({
        checkboxCategory: z
          .enum(["A", "B", "C"])
          .optional()
          .describe("Check Box A, B, or C"),
        transactions: z
          .array(transactionSchema)
          .default([])
          .describe("Short-term transactions"),
        totalProceeds: nonNegativeMoneySchema.optional().describe("Line 2(d) total proceeds"),
        totalCostBasis: nonNegativeMoneySchema.optional().describe("Line 2(e) total cost basis"),
        totalAdjustments: moneySchema.optional().describe("Line 2(g) total adjustments"),
        totalGainOrLoss: moneySchema.optional().describe("Line 2(h) total gain or loss"),
      })
      .strict()
      .describe("Part I - Short-Term"),
    part2LongTerm: z
      .object({
        checkboxCategory: z
          .enum(["D", "E", "F"])
          .optional()
          .describe("Check Box D, E, or F"),
        transactions: z
          .array(transactionSchema)
          .default([])
          .describe("Long-term transactions"),
        totalProceeds: nonNegativeMoneySchema.optional().describe("Line 4(d) total proceeds"),
        totalCostBasis: nonNegativeMoneySchema.optional().describe("Line 4(e) total cost basis"),
        totalAdjustments: moneySchema.optional().describe("Line 4(g) total adjustments"),
        totalGainOrLoss: moneySchema.optional().describe("Line 4(h) total gain or loss"),
      })
      .strict()
      .describe("Part II - Long-Term"),
  })
  .strict()
  .describe("Form 8949 (Sales and Other Dispositions of Capital Assets)");

export type Form8949Schema = z.infer<typeof form8949Schema>;
