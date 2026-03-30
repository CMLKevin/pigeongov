import { z } from "zod";

export const stateSchema = z.string().trim().regex(/^[A-Z]{2}$/);

export const addressSchema = z
  .object({
    street1: z.string().trim().min(1),
    street2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: stateSchema,
    zipCode: z.string().trim().min(5),
  })
  .strict();

export const identitySchema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    ssn: z.string().trim().regex(/^\d{3}-\d{2}-\d{4}$/).default("000-00-0000"),
    address: addressSchema,
  })
  .strict();

export const householdMemberSchema = z
  .object({
    name: z.string().trim().min(1),
    relationship: z.string().trim().min(1),
    age: z.coerce.number().int().nonnegative().optional(),
    notes: z.string().trim().optional(),
  })
  .strict();
