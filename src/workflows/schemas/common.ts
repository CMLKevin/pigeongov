import { z } from "zod";

export const stateSchema = z.string().trim().default("CA");

export const addressSchema = z
  .object({
    street1: z.string().trim().default(""),
    street2: z.string().trim().optional(),
    city: z.string().trim().default(""),
    state: stateSchema,
    zipCode: z.string().trim().default(""),
  })
  .strict();

export const identitySchema = z
  .object({
    firstName: z.string().trim().default(""),
    lastName: z.string().trim().default(""),
    ssn: z.string().trim().default("000-00-0000"),
    address: addressSchema,
  })
  .strict();

export const householdMemberSchema = z
  .object({
    name: z.string().trim().default(""),
    relationship: z.string().trim().default(""),
    age: z.coerce.number().int().nonnegative().optional(),
    notes: z.string().trim().optional(),
  })
  .strict();
