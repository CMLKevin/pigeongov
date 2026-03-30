import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { fill1040Workflow, loadWorkflowInput } from "../../src/cli/commands/fill.js";
import type { PromptClient } from "../../src/cli/prompts/common.js";

function createPromptClient(responses: Array<string | boolean>): PromptClient {
  const queue = [...responses];
  return {
    async input() {
      return String(queue.shift() ?? "");
    },
    async password() {
      return String(queue.shift() ?? "");
    },
    async confirm() {
      return Boolean(queue.shift());
    },
    async select() {
      return String(queue.shift() ?? "") as never;
    },
  };
}

describe("fill1040Workflow", () => {
  test("collects the guided 1040 flow into a bundle input", async () => {
    const prompts = createPromptClient([
      "single",
      "Kevin",
      "Lin",
      "123-45-6789",
      "1 Main St",
      "San Francisco",
      "CA",
      "94105",
      false,
      "0",
      "0",
      "0",
      false,
      "standard",
      "0",
      "0",
      "0",
      "0",
      "0",
    ]);

    const result = await fill1040Workflow(prompts, []);

    expect(result.formId).toBe("1040");
    expect(result.taxInput.filingStatus).toBe("single");
    expect(result.taxpayer.firstName).toBe("Kevin");
    expect(result.taxInput.scheduleCNet).toBe(0);
    expect(result.dependents).toEqual([]);
  });

  test("accepts legacy tax-only JSON in non-interactive mode", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "pigeongov-fill-"));
    const fixturePath = path.join(tempDir, "legacy-input.json");
    await writeFile(
      fixturePath,
      JSON.stringify({
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
      }),
    );

    const result = await loadWorkflowInput(fixturePath);

    expect(result.taxInput.wages).toBe(50000);
    expect(result.taxpayer.firstName).toBe("PigeonGov");
    expect(result.taxpayer.lastName).toBe("Taxpayer");
  });
});
