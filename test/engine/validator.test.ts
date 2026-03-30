import { describe, expect, test } from "vitest";

import { buildReturnBundle } from "../../src/engine/field-mapper.js";
import { validateReturnBundle } from "../../src/engine/validator.js";

describe("validateReturnBundle", () => {
  test("passes a coherent single-filer return and produces no flagged fields", () => {
    const bundle = buildReturnBundle({
      formId: "1040",
      taxYear: 2025,
      filingStatus: "single",
      taxpayer: {
        firstName: "Kevin",
        lastName: "Lin",
        ssn: "123-45-6789",
        address: {
          street1: "1 Main St",
          city: "San Francisco",
          state: "CA",
          zipCode: "94105",
        },
      },
      dependents: [],
      importedDocuments: [
        {
          type: "w2",
          employerName: "Acme Corp",
          wages: 50000,
          federalWithheld: 6200,
        },
      ],
      taxInput: {
        filingStatus: "single",
        wages: 50000,
        taxableInterest: 0,
        ordinaryDividends: 0,
        scheduleCNet: 0,
        otherIncome: 0,
        adjustments: {
          educatorExpenses: 0,
          hsaDeduction: 0,
          selfEmploymentTaxDeduction: 0,
          iraDeduction: 0,
          studentLoanInterest: 0,
        },
        useItemizedDeductions: false,
        itemizedDeductions: 0,
        dependents: [],
        federalWithheld: 6200,
        estimatedPayments: 0,
      },
    });

    const validation = validateReturnBundle(bundle);

    expect(validation.flaggedFields).toEqual([]);
    expect(validation.checks.every((check) => check.passed)).toBe(true);
  });

  test("flags an income mismatch when a human-edited line total no longer matches its components", () => {
    const bundle = buildReturnBundle({
      formId: "1040",
      taxYear: 2025,
      filingStatus: "single",
      taxpayer: {
        firstName: "Kevin",
        lastName: "Lin",
        ssn: "123-45-6789",
        address: {
          street1: "1 Main St",
          city: "San Francisco",
          state: "CA",
          zipCode: "94105",
        },
      },
      dependents: [],
      importedDocuments: [],
      taxInput: {
        filingStatus: "single",
        wages: 50000,
        taxableInterest: 0,
        ordinaryDividends: 0,
        scheduleCNet: 0,
        otherIncome: 0,
        adjustments: {
          educatorExpenses: 0,
          hsaDeduction: 0,
          selfEmploymentTaxDeduction: 0,
          iraDeduction: 0,
          studentLoanInterest: 0,
        },
        useItemizedDeductions: false,
        itemizedDeductions: 0,
        dependents: [],
        federalWithheld: 6200,
        estimatedPayments: 0,
      },
    });

    bundle.form1040.lines.line9 = 49999;

    const validation = validateReturnBundle(bundle);

    expect(validation.flaggedFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "form1040.lines.line9",
        }),
      ]),
    );
    expect(validation.checks.some((check) => !check.passed)).toBe(true);
  });

  test("passes when withholding is provided directly without imported documents", () => {
    const bundle = buildReturnBundle({
      formId: "1040",
      taxYear: 2025,
      filingStatus: "single",
      taxpayer: {
        firstName: "Kevin",
        lastName: "Lin",
        ssn: "123-45-6789",
        address: {
          street1: "1 Main St",
          city: "San Francisco",
          state: "CA",
          zipCode: "94105",
        },
      },
      dependents: [],
      importedDocuments: [],
      taxInput: {
        filingStatus: "single",
        wages: 50000,
        taxableInterest: 0,
        ordinaryDividends: 0,
        scheduleCNet: 0,
        otherIncome: 0,
        adjustments: {
          educatorExpenses: 0,
          hsaDeduction: 0,
          selfEmploymentTaxDeduction: 0,
          iraDeduction: 0,
          studentLoanInterest: 0,
        },
        useItemizedDeductions: false,
        itemizedDeductions: 0,
        dependents: [],
        federalWithheld: 6200,
        estimatedPayments: 0,
      },
    });

    const validation = validateReturnBundle(bundle);

    expect(bundle.form1040.lines.line25a).toBe(6200);
    expect(bundle.form1040.lines.line33).toBe(6200);
    expect(validation.flaggedFields).toEqual([]);
    expect(validation.checks.every((check) => check.passed)).toBe(true);
  });
});
