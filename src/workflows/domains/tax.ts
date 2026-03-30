import { buildReturnBundle } from "../../engine/field-mapper.js";
import { calculateFederalTax } from "../../engine/tax-calculator.js";
import { validateReturnBundle } from "../../engine/validator.js";
import type { WorkflowBundle } from "../../types.js";
import { currency } from "../helpers.js";
import { taxInputSchema } from "../schemas/tax.js";
import type { TaxWorkflowInput } from "../schemas/tax.js";
import type { WorkflowDefinition } from "../types.js";

export const taxWorkflows = {
  "tax/1040": {
    summary: {
      id: "tax/1040",
      domain: "tax",
      title: "Federal individual return",
      summary: "Form 1040 with Schedule 1 and Schedule C aware tax workflow for the 2025 filing season.",
      status: "active",
      audience: "household",
      tags: ["irs", "tax", "refund", "w2", "schedule-c"],
      year: 2025,
      legacyFormId: "1040",
    },
    inputSchema: taxInputSchema,
    starterData: {
      taxpayer: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      dependents: [],
      filingStatus: "single",
      wages: 0,
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
      federalWithheld: 0,
      estimatedPayments: 0,
    } satisfies TaxWorkflowInput,
    sections: [
      {
        id: "identity",
        title: "Identity",
        description: "Collect the taxpayer identity and filing status.",
        fields: [
          { key: "taxpayer.firstName", label: "First name", type: "text" },
          { key: "taxpayer.lastName", label: "Last name", type: "text" },
          { key: "taxpayer.ssn", label: "SSN", type: "text" },
          {
            key: "filingStatus",
            label: "Filing status",
            type: "select",
            options: [
              { label: "Single", value: "single" },
              { label: "Married filing jointly", value: "married_filing_jointly" },
              { label: "Head of household", value: "head_of_household" },
            ],
          },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "wages", label: "W-2 wages", type: "currency" },
          { key: "federalWithheld", label: "Federal withholding", type: "currency" },
          { key: "scheduleCNet", label: "Schedule C net", type: "currency" },
          { key: "otherIncome", label: "Other income", type: "currency" },
        ],
      },
    ],
    buildBundle(input: TaxWorkflowInput): WorkflowBundle {
      const calculation = calculateFederalTax({
        filingStatus: input.filingStatus,
        wages: input.wages,
        taxableInterest: input.taxableInterest,
        ordinaryDividends: input.ordinaryDividends,
        scheduleCNet: input.scheduleCNet,
        otherIncome: input.otherIncome,
        adjustments: input.adjustments,
        useItemizedDeductions: input.useItemizedDeductions,
        itemizedDeductions: input.itemizedDeductions,
        dependents: input.dependents,
        federalWithheld: input.federalWithheld,
        estimatedPayments: input.estimatedPayments,
      });

      const bundleInput = {
        formId: "1040" as const,
        taxYear: 2025 as const,
        filingStatus: input.filingStatus,
        taxpayer: input.taxpayer,
        dependents: input.dependents,
        importedDocuments:
          input.federalWithheld > 0
            ? [
                {
                  type: "w2" as const,
                  employerName: "Withholding input",
                  wages: input.wages,
                  federalWithheld: input.federalWithheld,
                },
              ]
            : [],
        taxInput: {
          filingStatus: input.filingStatus,
          wages: input.wages,
          taxableInterest: input.taxableInterest,
          ordinaryDividends: input.ordinaryDividends,
          scheduleCNet: input.scheduleCNet,
          otherIncome: input.otherIncome,
          adjustments: input.adjustments,
          useItemizedDeductions: input.useItemizedDeductions,
          itemizedDeductions: input.itemizedDeductions,
          dependents: input.dependents,
          federalWithheld: input.federalWithheld,
          estimatedPayments: input.estimatedPayments,
        },
        ...(input.spouse ? { spouse: input.spouse } : {}),
      };
      const bundle = buildReturnBundle(bundleInput);
      const validation = validateReturnBundle(bundle);

      return {
        workflowId: "tax/1040",
        domain: "tax",
        title: "Federal individual return",
        summary: "Deterministic 2025 federal return bundle.",
        year: 2025,
        legacyFormId: "1040",
        applicant: input.taxpayer,
        household: input.dependents.map((dependent) => ({
          name: dependent.name,
          relationship: dependent.relationship,
        })),
        evidence: [],
        answers: input as unknown as Record<string, unknown>,
        derived: {
          refund: calculation.refund,
          amountOwed: calculation.amountOwed,
          taxableIncome: calculation.taxableIncome,
        },
        validation: {
          checks: validation.checks,
          flaggedFields: validation.flaggedFields,
        },
        review: {
          headline:
            calculation.refund > 0
              ? `Refund expected: ${currency(calculation.refund)}`
              : `Amount owed: ${currency(calculation.amountOwed)}`,
          notes: [
            `Gross income ${currency(calculation.grossIncome)}`,
            `Taxable income ${currency(calculation.taxableIncome)}`,
            `Federal tax ${currency(calculation.totalTax)}`,
          ],
          flaggedFields: validation.flaggedFields,
        },
        outputArtifacts: [
          {
            kind: "bundle",
            label: "1040 return bundle",
            format: "json",
            path: "1040-2025-filled.json",
          },
          {
            kind: "review",
            label: "Return review PDF",
            format: "pdf",
            path: "1040-2025-filled.pdf",
          },
        ],
        provenance: ["calculation-engine", "field-mapper", "validator"],
        filledForm: bundle,
        calculation,
      };
    },
  } satisfies WorkflowDefinition<TaxWorkflowInput>,
} as const;
