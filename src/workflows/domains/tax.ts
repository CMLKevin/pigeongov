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
      tipIncome: 0,
      overtimePay: 0,
      autoLoanInterest: 0,
      taxpayerAge: 0,
      spouseAge: 0,
      saltDeduction: 0,
      capitalGains: {
        shortTermGains: 0,
        shortTermLosses: 0,
        longTermGains: 0,
        longTermLosses: 0,
        qualifiedDividends: 0,
        carryforwardLoss: 0,
      },
      stateCode: "",
      stateWithheld: 0,
      stateEstimatedPayments: 0,
    } as TaxWorkflowInput & { stateCode: string; stateWithheld: number; stateEstimatedPayments: number },
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
              { label: "Married filing separately", value: "married_filing_separately" },
              { label: "Head of household", value: "head_of_household" },
              { label: "Qualifying surviving spouse", value: "qualifying_surviving_spouse" },
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
      {
        id: "obbb-deductions",
        title: "OBBB Act Deductions",
        description: "New above-the-line deductions from the One Big Beautiful Bill Act.",
        fields: [
          { key: "tipIncome", label: "W-2 tip income", type: "currency", helpText: "Reported tips (up to $25,000 deductible if AGI < $160K)" },
          { key: "overtimePay", label: "Overtime pay", type: "currency", helpText: "W-2 overtime (up to $10,000 deductible if AGI < $160K)" },
          { key: "autoLoanInterest", label: "Auto loan interest (US vehicle)", type: "currency", helpText: "Interest on US-manufactured vehicle loan (up to $10,000)" },
          { key: "saltDeduction", label: "SALT deduction", type: "currency", helpText: "State and local taxes paid (capped at $40K MFJ / $20K MFS)" },
          { key: "taxpayerAge", label: "Taxpayer age", type: "number", helpText: "Age 65+ qualifies for additional standard deduction" },
          { key: "spouseAge", label: "Spouse age", type: "number", helpText: "For MFJ: spouse age 65+ adds $1,600 to standard deduction" },
        ],
      },
      {
        id: "capital-gains",
        title: "Capital Gains",
        description: "Report capital gains, losses, and qualified dividends from investments.",
        fields: [
          { key: "capitalGains.shortTermGains", label: "Short-term capital gains", type: "currency", helpText: "Gains from assets held one year or less" },
          { key: "capitalGains.shortTermLosses", label: "Short-term capital losses", type: "currency", helpText: "Losses from assets held one year or less" },
          { key: "capitalGains.longTermGains", label: "Long-term capital gains", type: "currency", helpText: "Gains from assets held more than one year" },
          { key: "capitalGains.longTermLosses", label: "Long-term capital losses", type: "currency", helpText: "Losses from assets held more than one year" },
          { key: "capitalGains.qualifiedDividends", label: "Qualified dividends", type: "currency", helpText: "Dividends taxed at the lower long-term capital gains rate" },
          { key: "capitalGains.carryforwardLoss", label: "Capital loss carryforward", type: "currency", helpText: "Unused capital losses from prior years" },
        ],
      },
      {
        id: "state-tax",
        title: "State Tax",
        description: "State income tax information.",
        fields: [
          { key: "stateCode", label: "State of residence", type: "text" },
          { key: "stateWithheld", label: "State tax withheld", type: "currency" },
          { key: "stateEstimatedPayments", label: "State estimated payments", type: "currency" },
        ],
      },
    ],
    buildBundle(input: TaxWorkflowInput): WorkflowBundle {
      // Extract state-tax fields from input (may come from starter data)
      const rawInput = input as TaxWorkflowInput & {
        stateCode?: string;
        stateWithheld?: number;
        stateEstimatedPayments?: number;
      };

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
        tipIncome: input.tipIncome,
        overtimePay: input.overtimePay,
        autoLoanInterest: input.autoLoanInterest,
        taxpayerAge: input.taxpayerAge,
        spouseAge: input.spouseAge,
        saltDeduction: input.saltDeduction,
        capitalGains: input.capitalGains,
        ...(rawInput.stateCode ? { stateCode: rawInput.stateCode } : {}),
        ...(rawInput.stateWithheld ? { stateWithheld: rawInput.stateWithheld } : {}),
        ...(rawInput.stateEstimatedPayments ? { stateEstimatedPayments: rawInput.stateEstimatedPayments } : {}),
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
          tipIncome: input.tipIncome,
          overtimePay: input.overtimePay,
          autoLoanInterest: input.autoLoanInterest,
          taxpayerAge: input.taxpayerAge,
          spouseAge: input.spouseAge,
          saltDeduction: input.saltDeduction,
          capitalGains: input.capitalGains,
          ...(rawInput.stateCode ? { stateCode: rawInput.stateCode } : {}),
          ...(rawInput.stateWithheld ? { stateWithheld: rawInput.stateWithheld } : {}),
          ...(rawInput.stateEstimatedPayments ? { stateEstimatedPayments: rawInput.stateEstimatedPayments } : {}),
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
            ...(calculation.stateTax
              ? [
                  `State tax (${calculation.stateTax.state}) ${currency(calculation.stateTax.stateTax)}`,
                  ...(calculation.stateTax.stateRefund > 0
                    ? [`State refund ${currency(calculation.stateTax.stateRefund)}`]
                    : calculation.stateTax.stateOwed > 0
                      ? [`State owed ${currency(calculation.stateTax.stateOwed)}`]
                      : []),
                ]
              : []),
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
