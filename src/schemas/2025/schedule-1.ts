import { z } from "zod";

import {
  filingStatusSchema,
  formMeta,
  moneySchema,
  nonNegativeMoneySchema,
  taxYearSchema,
} from "./shared.js";

export const schedule1Meta = formMeta({
  id: "schedule-1",
  name: "Schedule 1",
  taxYear: 2025,
  version: "2025.1",
  kind: "schedule",
});

const additionalIncomeSchema = z
  .object({
    line1TaxableStateRefunds: moneySchema.optional().describe("Line 1 - taxable state refunds"),
    line2AlimonyReceived: moneySchema.optional().describe("Line 2 - alimony received"),
    line3BusinessIncomeOrLoss: moneySchema.optional().describe("Line 3 - business income or loss"),
    line4CapitalGainOrLoss: moneySchema.optional().describe("Line 4 - capital gain or loss"),
    line5RentalRealEstateRoyaltiesPartnershipsSCorporationsTrusts: moneySchema.optional().describe("Line 5 - rental real estate, royalties, partnerships, S corporations, trusts"),
    line6FarmIncomeOrLoss: moneySchema.optional().describe("Line 6 - farm income or loss"),
    line7UnemploymentCompensation: moneySchema.optional().describe("Line 7 - unemployment compensation"),
    line8OtherIncome: moneySchema.optional().describe("Line 8 - other income"),
    line9TotalOtherIncome: moneySchema.optional().describe("Line 9 - total other income"),
    line10TotalAdditionalIncome: moneySchema.optional().describe("Line 10 - total additional income"),
  })
  .strict()
  .describe("Schedule 1 Part I");

const adjustmentsSchema = z
  .object({
    line11EducatorExpenses: nonNegativeMoneySchema.optional().describe("Line 11 - educator expenses"),
    line12CertainBusinessExpenses: nonNegativeMoneySchema.optional().describe("Line 12 - certain business expenses"),
    line13HealthSavingsAccountDeduction: nonNegativeMoneySchema.optional().describe("Line 13 - health savings account deduction"),
    line14MovingExpenses: nonNegativeMoneySchema.optional().describe("Line 14 - moving expenses"),
    line15DeductiblePartOfSelfEmploymentTax: nonNegativeMoneySchema.optional().describe("Line 15 - deductible part of self-employment tax"),
    line16SelfEmployedSEPSimpleAndQualifiedPlans: nonNegativeMoneySchema.optional().describe("Line 16 - self-employed SEP, SIMPLE, and qualified plans"),
    line17SelfEmployedHealthInsuranceDeduction: nonNegativeMoneySchema.optional().describe("Line 17 - self-employed health insurance deduction"),
    line18PenaltyOnEarlyWithdrawalOfSavings: nonNegativeMoneySchema.optional().describe("Line 18 - penalty on early withdrawal of savings"),
    line19AlimonyPaid: nonNegativeMoneySchema.optional().describe("Line 19 - alimony paid"),
    line20IraDeductions: nonNegativeMoneySchema.optional().describe("Line 20 - IRA deduction"),
    line21StudentLoanInterestDeduction: nonNegativeMoneySchema.optional().describe("Line 21 - student loan interest deduction"),
    line22Reserved: nonNegativeMoneySchema.optional().describe("Line 22 - reserved"),
    line23Reserved: nonNegativeMoneySchema.optional().describe("Line 23 - reserved"),
    line24ArcherMSADeduction: nonNegativeMoneySchema.optional().describe("Line 24 - Archer MSA deduction"),
    line25Reserved: nonNegativeMoneySchema.optional().describe("Line 25 - reserved"),
    line26TuitionAndFeesDeduction: nonNegativeMoneySchema.optional().describe("Line 26 - tuition and fees deduction"),
    line27TotalAdjustments: nonNegativeMoneySchema.optional().describe("Line 27 - total adjustments"),
  })
  .strict()
  .describe("Schedule 1 Part II");

export const schedule1Schema = z
  .object({
    taxYear: taxYearSchema,
    filingStatus: filingStatusSchema.optional().describe("Filing status for derived validation"),
    additionalIncome: additionalIncomeSchema,
    adjustments: adjustmentsSchema,
  })
  .strict()
  .describe("Schedule 1");

export type Schedule1Schema = z.infer<typeof schedule1Schema>;
