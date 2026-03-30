import type { PersonIdentity } from "../../types.js";
import type { FilingStatus } from "../../types.js";
import { PromptClient, validateSsn } from "./common.js";

export async function collectIdentity(
  prompts: PromptClient,
): Promise<{
  filingStatus: FilingStatus;
  taxpayer: PersonIdentity;
  spouse?: PersonIdentity;
}> {
  const filingStatus = await prompts.select<FilingStatus>("Filing status", [
    { name: "Single", value: "single" },
    { name: "Married filing jointly", value: "married_filing_jointly" },
    { name: "Married filing separately", value: "married_filing_separately" },
    { name: "Head of household", value: "head_of_household" },
    { name: "Qualifying surviving spouse", value: "qualifying_surviving_spouse" },
  ]);

  const taxpayer: PersonIdentity = {
    firstName: await prompts.input("First name"),
    lastName: await prompts.input("Last name"),
    ssn: await prompts.password("SSN", { validate: validateSsn }),
    address: {
      street1: await prompts.input("Street address"),
      city: await prompts.input("City"),
      state: (await prompts.input("State (2-letter code)", {
        validate: (value) =>
          /^[A-Z]{2}$/.test(value.toUpperCase()) ? true : "Use a two-letter state code.",
      })).toUpperCase(),
      zipCode: await prompts.input("ZIP code", {
        validate: (value) =>
          /^\d{5}(?:-\d{4})?$/.test(value) ? true : "Use ##### or #####-####.",
      }),
    },
  };

  if (filingStatus !== "married_filing_jointly") {
    return { filingStatus, taxpayer };
  }

  const spouse: PersonIdentity = {
    firstName: await prompts.input("Spouse first name"),
    lastName: await prompts.input("Spouse last name"),
    ssn: await prompts.password("Spouse SSN", { validate: validateSsn }),
    address: taxpayer.address,
  };

  return { filingStatus, taxpayer, spouse };
}
