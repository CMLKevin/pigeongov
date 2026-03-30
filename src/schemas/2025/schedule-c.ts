import { z } from "zod";

import {
  einSchema,
  formMeta,
  moneySchema,
  nonNegativeMoneySchema,
  scheduleCExpenseSchema,
  taxYearSchema,
} from "./shared.js";

export const scheduleCMeta = formMeta({
  id: "schedule-c",
  name: "Schedule C",
  taxYear: 2025,
  version: "2025.1",
  kind: "schedule",
});

export const scheduleCSchema = z
  .object({
    taxYear: taxYearSchema,
    ownerName: z.string().trim().min(1).describe("Business owner name"),
    ownerSsn: z.string().trim().regex(/^\d{3}-\d{2}-\d{4}$/).describe("Business owner SSN"),
    businessName: z.string().trim().min(1).optional().describe("Business name"),
    ein: einSchema.optional().describe("Business EIN"),
    principalBusinessOrProfession: z.string().trim().min(1).describe("Principal business or profession"),
    businessCode: z.string().trim().optional().describe("Principal business code"),
    accountingMethod: z.enum(["cash", "accrual", "other"]).default("cash").describe("Accounting method"),
    materialParticipation: z.boolean().optional().describe("Material participation"),
    income: z
      .object({
        grossReceiptsOrSales: nonNegativeMoneySchema.optional().describe("Line 1 - gross receipts or sales"),
        returnsAndAllowances: nonNegativeMoneySchema.optional().describe("Line 2 - returns and allowances"),
        otherIncome: nonNegativeMoneySchema.optional().describe("Line 6 - other income"),
      })
      .strict()
      .describe("Schedule C income"),
    cogs: z
      .object({
        inventoryAtBeginning: nonNegativeMoneySchema.optional().describe("Line 35 - inventory at beginning"),
        purchasesLessItemsWithdrawnForPersonalUse: nonNegativeMoneySchema.optional().describe("Line 36 - purchases"),
        costOfLabor: nonNegativeMoneySchema.optional().describe("Line 37 - cost of labor"),
        materialsAndSupplies: nonNegativeMoneySchema.optional().describe("Line 38 - materials and supplies"),
        otherCosts: nonNegativeMoneySchema.optional().describe("Line 39 - other costs"),
        inventoryAtEnd: nonNegativeMoneySchema.optional().describe("Line 41 - inventory at end"),
      })
      .strict()
      .describe("Cost of goods sold"),
    expenses: scheduleCExpenseSchema.describe("Schedule C business expenses"),
    homeOfficeDeduction: nonNegativeMoneySchema.optional().describe("Line 30 - home office deduction"),
    netProfitOrLoss: moneySchema.optional().describe("Line 31 - net profit or loss"),
  })
  .strict()
  .describe("Schedule C");

export type ScheduleCSchema = z.infer<typeof scheduleCSchema>;
