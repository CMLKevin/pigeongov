import type { PromptClient } from "./common.js";
import { parseCurrency } from "./common.js";

export async function collectDeductions(prompts: PromptClient) {
  const deductionMode = await prompts.select<"standard" | "itemized">("Deductions", [
    { name: "Standard deduction", value: "standard" },
    { name: "Itemized deduction total", value: "itemized" },
  ]);

  const educatorExpenses = parseCurrency(
    await prompts.input("Educator expenses", { default: "0" }),
  );
  const hsaDeduction = parseCurrency(
    await prompts.input("HSA deduction", { default: "0" }),
  );
  const iraDeduction = parseCurrency(
    await prompts.input("IRA deduction", { default: "0" }),
  );
  const studentLoanInterest = parseCurrency(
    await prompts.input("Student loan interest deduction", { default: "0" }),
  );
  const itemizedDeductions =
    deductionMode === "itemized"
      ? parseCurrency(await prompts.input("Itemized deductions total", { default: "0" }))
      : 0;

  return {
    useItemizedDeductions: deductionMode === "itemized",
    itemizedDeductions,
    adjustments: {
      educatorExpenses,
      hsaDeduction,
      selfEmploymentTaxDeduction: 0,
      iraDeduction,
      studentLoanInterest,
    },
  };
}
