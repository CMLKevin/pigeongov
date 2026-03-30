import { buildReturnBundle } from "../engine/field-mapper.js";
import { validateReturnBundle } from "../engine/validator.js";
import {
  buildTaxCalculationInput,
  calculateTaxFromInput,
  type McpTaxInput,
  PIGEONGOV_YEAR,
} from "./shared.js";

export function buildSyntheticImportedDocuments(input: McpTaxInput) {
  if (input.federalWithheld <= 0) {
    return [];
  }

  return [
    {
      type: "w2" as const,
      employerName: "Imported withholding",
      wages: input.wages,
      federalWithheld: input.federalWithheld,
    },
  ];
}

export function buildValidated1040Bundle(input: McpTaxInput) {
  const calculationInput = buildTaxCalculationInput(input);
  const calculation = calculateTaxFromInput(input);
  const importedDocuments = buildSyntheticImportedDocuments(input);
  const bundle = buildReturnBundle({
    formId: "1040",
    taxYear: PIGEONGOV_YEAR,
    filingStatus: input.filingStatus,
    taxpayer: {
      firstName: "Taxpayer",
      lastName: "Example",
      ssn: "000-00-0000",
      address: {
        street1: "Unknown",
        city: "Unknown",
        state: "CA",
        zipCode: "00000",
      },
    },
    dependents: calculationInput.dependents,
    importedDocuments,
    taxInput: calculationInput,
  });
  const validation = validateReturnBundle(bundle);

  return {
    calculationInput,
    calculation,
    importedDocuments,
    bundle,
    validation,
  };
}
