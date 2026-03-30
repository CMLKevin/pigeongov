import { z } from "zod";

import type { Address, DependentInput, FilingStatus, PersonIdentity } from "../../types.js";

export interface SchemaMeta {
  id: string;
  name: string;
  taxYear: 2025;
  version: string;
  kind: "return" | "schedule" | "source-document";
}

export const filingStatusValues = [
  "single",
  "married_filing_jointly",
  "married_filing_separately",
  "head_of_household",
  "qualifying_surviving_spouse",
] as const satisfies readonly FilingStatus[];

export const filingStatusSchema = z
  .enum(filingStatusValues)
  .describe("Filing status");

export const taxYearSchema = z.literal(2025).describe("Tax year");

export const moneySchema = z
  .coerce
  .number()
  .finite()
  .describe("Monetary amount in dollars");

export const signedMoneySchema = moneySchema.describe("Signed monetary amount in dollars");

export const nonNegativeMoneySchema = moneySchema.min(0).describe("Non-negative monetary amount in dollars");

export const percentSchema = z
  .coerce
  .number()
  .finite()
  .min(0)
  .max(100)
  .describe("Percentage value");

export const ssnSchema = z
  .string()
  .trim()
  .regex(/^\d{3}-\d{2}-\d{4}$/, "Expected SSN in ###-##-#### format")
  .describe("Social Security number");

export const einSchema = z
  .string()
  .trim()
  .regex(/^\d{2}-\d{7}$/, "Expected EIN in ##-####### format")
  .describe("Employer identification number");

export const routingNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{9}$/, "Expected 9-digit routing number")
  .describe("Direct-deposit routing number");

export const accountNumberSchema = z
  .string()
  .trim()
  .min(4)
  .max(17)
  .describe("Direct-deposit account number");

export const stateCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{2}$/, "Expected two-letter state code")
  .describe("State code");

export const zipCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}(?:-\d{4})?$/, "Expected ZIP code in ##### or #####-#### format")
  .describe("ZIP code");

export const addressSchema = z
  .object({
    street1: z.string().trim().min(1).describe("Street address line 1"),
    street2: z.string().trim().optional().describe("Street address line 2"),
    city: z.string().trim().min(1).describe("City"),
    state: stateCodeSchema,
    zipCode: zipCodeSchema,
  })
  .strict()
  .describe("Mailing address");

export const personIdentitySchema = z
  .object({
    firstName: z.string().trim().min(1).describe("First name"),
    lastName: z.string().trim().min(1).describe("Last name"),
    ssn: ssnSchema,
    address: addressSchema,
  })
  .strict()
  .describe("Person identity");

export const dependentSchema = z
  .object({
    name: z.string().trim().min(1).describe("Dependent name"),
    ssn: ssnSchema,
    relationship: z.string().trim().min(1).describe("Relationship to taxpayer"),
    childTaxCreditEligible: z.boolean().describe("Child tax credit eligibility"),
    eitcEligible: z.boolean().optional().describe("Earned income credit eligibility"),
  })
  .strict()
  .describe("Dependent");

export const yesNoSchema = z.boolean().describe("Boolean yes/no value");

export const stateInfoSchema = z
  .object({
    state: stateCodeSchema,
    stateIdNumber: z.string().trim().min(1).optional().describe("State identification number"),
    stateIncome: signedMoneySchema.optional().describe("State income amount"),
    stateTaxWithheld: nonNegativeMoneySchema.optional().describe("State tax withheld"),
    localIncome: signedMoneySchema.optional().describe("Local income amount"),
    localTaxWithheld: nonNegativeMoneySchema.optional().describe("Local tax withheld"),
  })
  .strict()
  .describe("State and local tax information");

export const w2Box12ItemSchema = z
  .object({
    code: z.string().trim().min(1).max(2).describe("W-2 box 12 code"),
    amount: nonNegativeMoneySchema.describe("W-2 box 12 amount"),
  })
  .strict()
  .describe("W-2 box 12 entry");

export const scheduleCExpenseFields = [
  "advertising",
  "carAndTruck",
  "commissionsAndFees",
  "contractLabor",
  "depletion",
  "depreciation",
  "employeeBenefitPrograms",
  "insuranceOtherThanHealth",
  "interestMortgage",
  "interestOther",
  "legalAndProfessional",
  "officeExpense",
  "pensionAndProfitSharing",
  "rentalOrLeaseVehicles",
  "rentalOrLeaseOtherBusinessProperty",
  "repairsAndMaintenance",
  "supplies",
  "taxesAndLicenses",
  "travel",
  "meals",
  "utilities",
  "wages",
  "otherExpenses",
] as const;

export type ScheduleCExpenseField = (typeof scheduleCExpenseFields)[number];

const scheduleCExpenseShape = {
  advertising: nonNegativeMoneySchema.optional().describe("Schedule C expense: advertising"),
  carAndTruck: nonNegativeMoneySchema.optional().describe("Schedule C expense: car and truck"),
  commissionsAndFees: nonNegativeMoneySchema.optional().describe("Schedule C expense: commissions and fees"),
  contractLabor: nonNegativeMoneySchema.optional().describe("Schedule C expense: contract labor"),
  depletion: nonNegativeMoneySchema.optional().describe("Schedule C expense: depletion"),
  depreciation: nonNegativeMoneySchema.optional().describe("Schedule C expense: depreciation"),
  employeeBenefitPrograms: nonNegativeMoneySchema.optional().describe("Schedule C expense: employee benefit programs"),
  insuranceOtherThanHealth: nonNegativeMoneySchema.optional().describe("Schedule C expense: insurance other than health"),
  interestMortgage: nonNegativeMoneySchema.optional().describe("Schedule C expense: interest mortgage"),
  interestOther: nonNegativeMoneySchema.optional().describe("Schedule C expense: interest other"),
  legalAndProfessional: nonNegativeMoneySchema.optional().describe("Schedule C expense: legal and professional"),
  officeExpense: nonNegativeMoneySchema.optional().describe("Schedule C expense: office expense"),
  pensionAndProfitSharing: nonNegativeMoneySchema.optional().describe("Schedule C expense: pension and profit sharing"),
  rentalOrLeaseVehicles: nonNegativeMoneySchema.optional().describe("Schedule C expense: rental or lease vehicles"),
  rentalOrLeaseOtherBusinessProperty: nonNegativeMoneySchema.optional().describe("Schedule C expense: rental or lease other business property"),
  repairsAndMaintenance: nonNegativeMoneySchema.optional().describe("Schedule C expense: repairs and maintenance"),
  supplies: nonNegativeMoneySchema.optional().describe("Schedule C expense: supplies"),
  taxesAndLicenses: nonNegativeMoneySchema.optional().describe("Schedule C expense: taxes and licenses"),
  travel: nonNegativeMoneySchema.optional().describe("Schedule C expense: travel"),
  meals: nonNegativeMoneySchema.optional().describe("Schedule C expense: meals"),
  utilities: nonNegativeMoneySchema.optional().describe("Schedule C expense: utilities"),
  wages: nonNegativeMoneySchema.optional().describe("Schedule C expense: wages"),
  otherExpenses: nonNegativeMoneySchema.optional().describe("Schedule C expense: other expenses"),
} satisfies Record<ScheduleCExpenseField, z.ZodTypeAny>;

export const scheduleCExpenseSchema = z
  .object(scheduleCExpenseShape)
  .strict()
  .describe("Schedule C expense breakdown");

export const formMeta = (meta: SchemaMeta): SchemaMeta => meta;

export type Dependent = DependentInput;
export type AddressInput = Address;
export type PersonIdentityInput = PersonIdentity;
