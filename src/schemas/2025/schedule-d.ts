import { z } from "zod";

import {
  filingStatusSchema,
  formMeta,
  moneySchema,
  taxYearSchema,
} from "./shared.js";

export const scheduleDMeta = formMeta({
  id: "schedule-d",
  name: "Schedule D",
  taxYear: 2025,
  version: "2025.1",
  kind: "schedule",
});

export const scheduleDSchema = z
  .object({
    taxYear: taxYearSchema,
    filingStatus: filingStatusSchema.optional().describe("Filing status"),

    // Part I — Short-Term Capital Gains and Losses
    part1ShortTerm: z
      .object({
        line1bForm8949BoxA: moneySchema.optional().describe("Line 1b - Form 8949 Box A totals"),
        line2Form8949BoxB: moneySchema.optional().describe("Line 2 - Form 8949 Box B totals"),
        line3Form8949BoxC: moneySchema.optional().describe("Line 3 - Form 8949 Box C totals"),
        line4ShortTermFromK1: moneySchema.optional().describe("Line 4 - Short-term gain/loss from Forms 6252, 4684, 6781, 8824"),
        line5NetShortTermFromScheduleK1: moneySchema.optional().describe("Line 5 - Net short-term from Schedule(s) K-1"),
        line6ShortTermCarryover: moneySchema.optional().describe("Line 6 - Short-term capital loss carryover"),
        line7NetShortTermGainOrLoss: moneySchema.optional().describe("Line 7 - Net short-term capital gain or (loss)"),
      })
      .strict()
      .describe("Part I - Short-Term Capital Gains and Losses"),

    // Part II — Long-Term Capital Gains and Losses
    part2LongTerm: z
      .object({
        line8bForm8949BoxD: moneySchema.optional().describe("Line 8b - Form 8949 Box D totals"),
        line9Form8949BoxE: moneySchema.optional().describe("Line 9 - Form 8949 Box E totals"),
        line10Form8949BoxF: moneySchema.optional().describe("Line 10 - Form 8949 Box F totals"),
        line11OtherLongTermGainOrLoss: moneySchema.optional().describe("Line 11 - Gain from Form 4797"),
        line12NetLongTermFromScheduleK1: moneySchema.optional().describe("Line 12 - Net long-term from Schedule(s) K-1"),
        line13CapitalGainDistributions: moneySchema.optional().describe("Line 13 - Capital gain distributions"),
        line14LongTermCarryover: moneySchema.optional().describe("Line 14 - Long-term capital loss carryover"),
        line15NetLongTermGainOrLoss: moneySchema.optional().describe("Line 15 - Net long-term capital gain or (loss)"),
      })
      .strict()
      .describe("Part II - Long-Term Capital Gains and Losses"),

    // Part III — Summary
    part3Summary: z
      .object({
        line16CombinedGainOrLoss: moneySchema.optional().describe("Line 16 - Combine lines 7 and 15"),
        line21CapitalGainOrLoss: moneySchema.optional().describe("Line 21 - Capital gain or (loss) to Form 1040 line 7"),
      })
      .strict()
      .describe("Part III - Summary"),
  })
  .strict()
  .describe("Schedule D (Capital Gains and Losses)");

export type ScheduleDSchema = z.infer<typeof scheduleDSchema>;
