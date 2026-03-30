import { z } from "zod";

export const screenerInputSchema = z
  .object({
    householdSize: z.coerce.number().int().min(1).max(20),
    annualHouseholdIncome: z.coerce.number().min(0),
    state: z.string().length(2),
    citizenshipStatus: z.enum([
      "us_citizen",
      "permanent_resident",
      "conditional_resident",
      "ead_holder",
      "undocumented",
      "refugee_asylee",
      "other",
    ]),
    ages: z.array(z.coerce.number().int().min(0).max(120)),
    hasDisability: z.boolean().default(false),
    employmentStatus: z.enum(["employed", "unemployed", "self_employed", "retired", "disabled"]),
    isVeteran: z.boolean().default(false),
    hasHealthInsurance: z.boolean().default(true),
    monthlyRent: z.coerce.number().min(0).default(0),
  })
  .strict();

export type ScreenerInput = z.infer<typeof screenerInputSchema>;

export const SCREENER_QUESTIONS = [
  {
    key: "householdSize",
    label: "How many people live in your household?",
    type: "number" as const,
  },
  {
    key: "annualHouseholdIncome",
    label: "What is your household's total annual income (before taxes)?",
    type: "currency" as const,
  },
  {
    key: "state",
    label: "What state do you live in? (2-letter code)",
    type: "text" as const,
  },
  {
    key: "citizenshipStatus",
    label: "What is your citizenship or immigration status?",
    type: "select" as const,
    options: [
      { label: "U.S. Citizen", value: "us_citizen" },
      { label: "Permanent Resident (Green Card)", value: "permanent_resident" },
      { label: "Conditional Resident", value: "conditional_resident" },
      { label: "Work Authorization (EAD)", value: "ead_holder" },
      { label: "Refugee or Asylee", value: "refugee_asylee" },
      { label: "Undocumented", value: "undocumented" },
      { label: "Other", value: "other" },
    ],
  },
  {
    key: "ages",
    label: "What are the ages of everyone in your household? (comma-separated)",
    type: "text" as const,
    helpText: "Example: 35,33,5,2",
  },
  {
    key: "hasDisability",
    label: "Does anyone in your household have a disability?",
    type: "confirm" as const,
  },
  {
    key: "employmentStatus",
    label: "What is your current employment status?",
    type: "select" as const,
    options: [
      { label: "Employed", value: "employed" },
      { label: "Unemployed", value: "unemployed" },
      { label: "Self-employed", value: "self_employed" },
      { label: "Retired", value: "retired" },
      { label: "Disabled / Unable to work", value: "disabled" },
    ],
  },
  {
    key: "isVeteran",
    label: "Is anyone in your household a military veteran?",
    type: "confirm" as const,
  },
  {
    key: "hasHealthInsurance",
    label: "Does everyone in your household have health insurance?",
    type: "confirm" as const,
  },
  {
    key: "monthlyRent",
    label: "What is your monthly rent or mortgage payment?",
    type: "currency" as const,
  },
];
