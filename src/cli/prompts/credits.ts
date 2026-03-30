import type { DependentInput } from "../../types.js";
import type { PromptClient } from "./common.js";
import { validateSsn } from "./common.js";

export async function collectDependents(prompts: PromptClient): Promise<DependentInput[]> {
  const dependents: DependentInput[] = [];
  const count = Number(await prompts.input("Number of dependents", { default: "0" }));

  for (let index = 0; index < count; index += 1) {
    const name = await prompts.input(`Dependent ${index + 1} name`);
    const ssn = await prompts.password(`Dependent ${index + 1} SSN`, {
      validate: validateSsn,
    });
    const relationship = await prompts.input(`Dependent ${index + 1} relationship`);
    const childTaxCreditEligible = await prompts.confirm(
      `Dependent ${index + 1} eligible for child tax credit?`,
      { default: true },
    );
    const eitcEligible = await prompts.confirm(
      `Dependent ${index + 1} eligible for EITC?`,
      { default: childTaxCreditEligible },
    );
    dependents.push({
      name,
      ssn,
      relationship,
      childTaxCreditEligible,
      eitcEligible,
    });
  }

  return dependents;
}
