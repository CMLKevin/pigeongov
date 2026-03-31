import type { ImportedDocument, PersonIdentity } from "../types.js";
import { calculateFederalTax, type TaxCalculationInput } from "./tax-calculator.js";
import { f1040Schema, schedule1Schema, scheduleCSchema } from "../schemas/2025/index.js";

export interface BuildReturnBundleInput {
  formId: "1040";
  taxYear: 2025;
  filingStatus: TaxCalculationInput["filingStatus"];
  taxpayer: PersonIdentity;
  spouse?: PersonIdentity;
  dependents: TaxCalculationInput["dependents"];
  importedDocuments: ImportedDocument[];
  taxInput: TaxCalculationInput;
}

export interface ReturnBundle {
  formId: "1040";
  taxYear: 2025;
  taxpayer: PersonIdentity;
  spouse?: PersonIdentity;
  dependents: TaxCalculationInput["dependents"];
  importedDocuments: ImportedDocument[];
  calculation: ReturnType<typeof calculateFederalTax>;
  form1040: ReturnType<typeof f1040Schema.parse>;
  schedule1: ReturnType<typeof schedule1Schema.parse>;
  scheduleC?: ReturnType<typeof scheduleCSchema.parse>;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function getImportedWithholding(
  importedDocuments: ImportedDocument[],
  documentType: ImportedDocument["type"],
): number {
  return roundCurrency(
    importedDocuments
      .filter((document) => document.type === documentType)
      .reduce((total, document) => {
        if (document.type === "w2") {
          return total + document.federalWithheld;
        }
        if ("federalWithheld" in document && typeof document.federalWithheld === "number") {
          return total + document.federalWithheld;
        }
        return total;
      }, 0),
  );
}

export function buildReturnBundle(input: BuildReturnBundleInput): ReturnBundle {
  const calculation = calculateFederalTax(input.taxInput);
  const federalWithheldW2 = getImportedWithholding(input.importedDocuments, "w2");
  const federalWithheld1099 = roundCurrency(
    input.importedDocuments
      .filter((document) => document.type !== "w2")
      .reduce((total, document) => {
        if ("federalWithheld" in document && typeof document.federalWithheld === "number") {
          return total + document.federalWithheld;
        }
        return total;
      }, 0),
  );
  const unassignedWithholding = roundCurrency(
    Math.max(0, input.taxInput.federalWithheld - federalWithheldW2 - federalWithheld1099),
  );

  const schedule1 = schedule1Schema.parse({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    additionalIncome: {
      line3BusinessIncomeOrLoss: input.taxInput.scheduleCNet || undefined,
      line8OtherIncome: input.taxInput.otherIncome || undefined,
      line10TotalAdditionalIncome:
        input.taxInput.scheduleCNet + input.taxInput.otherIncome || undefined,
    },
    adjustments: {
      line11EducatorExpenses: input.taxInput.adjustments.educatorExpenses || undefined,
      line13HealthSavingsAccountDeduction:
        input.taxInput.adjustments.hsaDeduction || undefined,
      line15DeductiblePartOfSelfEmploymentTax:
        calculation.selfEmploymentTax > 0
          ? roundCurrency(calculation.selfEmploymentTax / 2)
          : undefined,
      line20IraDeductions: input.taxInput.adjustments.iraDeduction || undefined,
      line21StudentLoanInterestDeduction:
        input.taxInput.adjustments.studentLoanInterest || undefined,
      line27TotalAdjustments:
        calculation.grossIncome - calculation.adjustedGrossIncome || undefined,
    },
  });

  const scheduleC =
    input.taxInput.scheduleCNet > 0
      ? scheduleCSchema.parse({
          taxYear: input.taxYear,
          ownerName: `${input.taxpayer.firstName} ${input.taxpayer.lastName}`,
          ownerSsn: input.taxpayer.ssn,
          businessName: "Sole Proprietorship",
          principalBusinessOrProfession: "Self-employment",
          accountingMethod: "cash",
          income: {
            grossReceiptsOrSales: input.taxInput.scheduleCNet,
            otherIncome: input.taxInput.otherIncome || undefined,
          },
          cogs: {},
          expenses: {},
          netProfitOrLoss: input.taxInput.scheduleCNet,
        })
      : undefined;

  const form1040 = f1040Schema.parse({
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    taxpayer: input.taxpayer,
    spouse: input.spouse,
    mailingAddress: input.taxpayer.address,
    dependents: input.dependents,
    lines: {
      line1a: input.taxInput.wages || undefined,
      line2b: input.taxInput.taxableInterest || undefined,
      line3b: input.taxInput.ordinaryDividends || undefined,
      line8: schedule1.additionalIncome.line10TotalAdditionalIncome,
      line9: calculation.grossIncome,
      line10: schedule1.adjustments.line27TotalAdjustments,
      line11: calculation.adjustedGrossIncome,
      line12a: input.taxInput.useItemizedDeductions ? undefined : calculation.deduction,
      line12b: input.taxInput.useItemizedDeductions ? calculation.deduction : undefined,
      line12z: calculation.deduction,
      line13: calculation.taxableIncome,
      line14: calculation.federalTax,
      line16: calculation.federalTax,
      line17: calculation.selfEmploymentTax || undefined,
      line21: calculation.totalCredits || undefined,
      line24: calculation.totalTax,
      line25a: roundCurrency(federalWithheldW2 + unassignedWithholding) || undefined,
      line25b: federalWithheld1099 || undefined,
      line26: input.taxInput.estimatedPayments || undefined,
      line27: calculation.earnedIncomeCredit || undefined,
      line28: calculation.additionalChildTaxCredit || undefined,
      line33: calculation.totalPayments,
      line34: calculation.refund || undefined,
      line37: calculation.amountOwed || undefined,
    },
  });

  const bundle: ReturnBundle = {
    formId: input.formId,
    taxYear: input.taxYear,
    taxpayer: input.taxpayer,
    dependents: input.dependents,
    importedDocuments: input.importedDocuments,
    calculation,
    form1040,
    schedule1,
  };
  if (input.spouse) {
    bundle.spouse = input.spouse;
  }
  if (scheduleC) {
    bundle.scheduleC = scheduleC;
  }

  return bundle;
}
