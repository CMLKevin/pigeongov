import { z } from "zod";

import {
  accountNumberSchema,
  addressSchema,
  dependentSchema,
  filingStatusSchema,
  formMeta,
  moneySchema,
  nonNegativeMoneySchema,
  personIdentitySchema,
  routingNumberSchema,
  taxYearSchema,
} from "./shared.js";

const lineMoney = () => moneySchema.optional();
const lineMoneyNonNegative = () => nonNegativeMoneySchema.optional();

export const f1040Meta = formMeta({
  id: "1040",
  name: "Form 1040",
  taxYear: 2025,
  version: "2025.1",
  kind: "return",
});

export const f1040Schema = z
  .object({
    taxYear: taxYearSchema,
    filingStatus: filingStatusSchema.describe("Filing status"),
    taxpayer: personIdentitySchema.describe("Primary taxpayer"),
    spouse: personIdentitySchema.optional().describe("Spouse identity for joint returns"),
    mailingAddress: addressSchema.describe("Mailing address"),
    dependents: z.array(dependentSchema).default([]).describe("Dependents"),
    lines: z
      .object({
        line1a: lineMoney().describe("Line 1a - wages, salaries, tips"),
        line1b: lineMoney().describe("Line 1b - taxable interest"),
        line1c: lineMoney().describe("Line 1c - ordinary dividends"),
        line1d: lineMoney().describe("Line 1d - IRA distributions"),
        line1e: lineMoney().describe("Line 1e - pensions and annuities"),
        line1f: lineMoney().describe("Line 1f - taxable social security benefits"),
        line1g: lineMoney().describe("Line 1g - capital gain or loss"),
        line1h: lineMoney().describe("Line 1h - other income"),
        line2a: lineMoney().describe("Line 2a - tax-exempt interest"),
        line2b: lineMoney().describe("Line 2b - taxable interest"),
        line3a: lineMoney().describe("Line 3a - qualified dividends"),
        line3b: lineMoney().describe("Line 3b - ordinary dividends"),
        line4a: lineMoney().describe("Line 4a - IRA distributions"),
        line4b: lineMoney().describe("Line 4b - taxable amount"),
        line5a: lineMoney().describe("Line 5a - pensions and annuities"),
        line5b: lineMoney().describe("Line 5b - taxable amount"),
        line6a: lineMoney().describe("Line 6a - social security benefits"),
        line6b: lineMoney().describe("Line 6b - taxable amount"),
        line7: lineMoney().describe("Line 7 - capital gain or (loss)"),
        line8: lineMoney().describe("Line 8 - other income from Schedule 1"),
        line9: lineMoney().describe("Line 9 - total income"),
        line10: lineMoney().describe("Line 10 - adjustments to income"),
        line11: lineMoney().describe("Line 11 - adjusted gross income"),
        line12a: lineMoney().describe("Line 12a - standard deduction"),
        line12b: lineMoney().describe("Line 12b - itemized deductions"),
        line12c: lineMoney().describe("Line 12c - qualified business income deduction"),
        line12d: lineMoney().describe("Line 12d - add lines 12a through 12c"),
        line12e: lineMoney().describe("Line 12e - deduction"),
        line12f: lineMoney().describe("Line 12f - deduction worksheet"),
        line12g: lineMoney().describe("Line 12g - deduction worksheet"),
        line12h: lineMoney().describe("Line 12h - deduction worksheet"),
        line12z: lineMoney().describe("Line 12z - total deduction"),
        line13: lineMoney().describe("Line 13 - taxable income"),
        line14: lineMoney().describe("Line 14 - tax"),
        line15: lineMoney().describe("Line 15 - qualified business income deduction"),
        line16: lineMoney().describe("Line 16 - total tax"),
        line17: lineMoney().describe("Line 17 - amount from Schedule 2"),
        line18: lineMoney().describe("Line 18 - other taxes"),
        line19: lineMoney().describe("Line 19 - total tax"),
        line20: lineMoney().describe("Line 20 - total payments"),
        line21: lineMoney().describe("Line 21 - child tax credit and other credits"),
        line22: lineMoney().describe("Line 22 - total tax after credits"),
        line23: lineMoney().describe("Line 23 - other taxes"),
        line24: lineMoney().describe("Line 24 - total tax"),
        line25a: lineMoneyNonNegative().describe("Line 25a - federal income tax withheld from Form W-2"),
        line25b: lineMoneyNonNegative().describe("Line 25b - federal income tax withheld from Form 1099"),
        line26: lineMoney().describe("Line 26 - estimated tax payments"),
        line27: lineMoney().describe("Line 27 - earned income credit"),
        line28: lineMoney().describe("Line 28 - additional child tax credit"),
        line29: lineMoney().describe("Line 29 - American opportunity credit"),
        line30: lineMoney().describe("Line 30 - recovery rebate credit"),
        line31: lineMoney().describe("Line 31 - amount from Schedule 3"),
        line32: lineMoney().describe("Line 32 - total other payments and refundable credits"),
        line33: lineMoney().describe("Line 33 - total payments"),
        line34: lineMoney().describe("Line 34 - refund"),
        line35a: z.string().trim().optional().describe("Line 35a - routing number"),
        line35b: z.enum(["checking", "savings"]).optional().describe("Line 35b - account type"),
        line36: z.string().trim().optional().describe("Line 36 - account number"),
        line37: lineMoney().describe("Line 37 - amount you owe"),
      })
      .strict()
      .describe("Form 1040 lines"),
    refundDirectDeposit: z
      .object({
        routingNumber: routingNumberSchema.optional().describe("Refund routing number"),
        accountNumber: accountNumberSchema.optional().describe("Refund account number"),
        accountType: z.enum(["checking", "savings"]).optional().describe("Refund account type"),
      })
      .strict()
      .optional()
      .describe("Refund direct deposit information"),
    signatures: z
      .object({
        taxpayerSigned: z.boolean().optional().describe("Taxpayer signed return"),
        spouseSigned: z.boolean().optional().describe("Spouse signed return"),
      })
      .strict()
      .optional()
      .describe("Signature indicators"),
  })
  .strict()
  .describe("Form 1040");

export type F1040Schema = z.infer<typeof f1040Schema>;
