import type { ImportedDocument } from "../../types.js";
import type { PromptClient } from "./common.js";
import { parseCurrency } from "./common.js";

export interface IncomePromptResult {
  importedPaths: string[];
  taxableInterest: number;
  ordinaryDividends: number;
  otherIncome: number;
  scheduleCGrossReceipts: number;
  scheduleCExpenses: number;
}

export async function collectIncome(prompts: PromptClient): Promise<IncomePromptResult> {
  const importedPaths: string[] = [];
  const wantsImport = await prompts.confirm("Import income documents?", { default: true });
  if (wantsImport) {
    const firstPath = await prompts.input("Path to W-2 or 1099 PDF");
    if (firstPath) importedPaths.push(firstPath);
    while (await prompts.confirm("Import another income document?", { default: false })) {
      importedPaths.push(await prompts.input("Path to another W-2 or 1099 PDF"));
    }
  }

  const taxableInterest = parseCurrency(
    await prompts.input("Taxable interest (1099-INT or manual)", { default: "0" }),
  );
  const ordinaryDividends = parseCurrency(
    await prompts.input("Ordinary dividends", { default: "0" }),
  );
  const otherIncome = parseCurrency(
    await prompts.input("Other income (Schedule 1, line 8 style)", { default: "0" }),
  );

  const hasSelfEmployment = await prompts.confirm("Self-employment income (Schedule C)?", {
    default: false,
  });
  if (!hasSelfEmployment) {
    return {
      importedPaths,
      taxableInterest,
      ordinaryDividends,
      otherIncome,
      scheduleCGrossReceipts: 0,
      scheduleCExpenses: 0,
    };
  }

  const scheduleCGrossReceipts = parseCurrency(
    await prompts.input("Schedule C gross receipts", { default: "0" }),
  );
  const scheduleCExpenses = parseCurrency(
    await prompts.input("Schedule C deductible expenses", { default: "0" }),
  );

  return {
    importedPaths,
    taxableInterest,
    ordinaryDividends,
    otherIncome,
    scheduleCGrossReceipts,
    scheduleCExpenses,
  };
}

export function mergeImportedIncome(
  importedDocuments: ImportedDocument[],
): Pick<IncomePromptResult, "taxableInterest" | "scheduleCGrossReceipts"> & {
  wages: number;
  federalWithheld: number;
} {
  let wages = 0;
  let federalWithheld = 0;
  let taxableInterest = 0;
  let scheduleCGrossReceipts = 0;

  for (const document of importedDocuments) {
    if (document.type === "w2") {
      wages += document.wages;
      federalWithheld += document.federalWithheld;
    } else if (document.type === "1099-int") {
      taxableInterest += document.interestIncome;
      federalWithheld += document.federalWithheld ?? 0;
    } else if (document.type === "1099-nec") {
      scheduleCGrossReceipts += document.nonemployeeCompensation;
      federalWithheld += document.federalWithheld ?? 0;
    }
  }

  return { wages, federalWithheld, taxableInterest, scheduleCGrossReceipts };
}
