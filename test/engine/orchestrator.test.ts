import { describe, expect, test } from "vitest";

import { TaxOrchestrator } from "../../src/engine/orchestrator.js";
import type { FormPlugin, TaxOrchestratorInput } from "../../src/engine/types.js";

function makeMinimalInput(
  overrides: Partial<TaxOrchestratorInput> = {},
): TaxOrchestratorInput {
  return {
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
    ...overrides,
  };
}

function makeCorePlugin(overrides: Partial<FormPlugin> = {}): FormPlugin {
  return {
    formId: "core-1040",
    displayName: "Core 1040",
    triggerCondition: () => true,
    dependencies: [],
    calculate: () => ({ grossIncome: 50000, totalTax: 4000 }),
    validate: () => [],
    mapToFormLines: (r) => ({ "1040.line9": (r as { grossIncome: number }).grossIncome }),
    ...overrides,
  };
}

describe("TaxOrchestrator", () => {
  test("throws if core-1040 plugin is not registered", () => {
    const orchestrator = new TaxOrchestrator();
    const input = makeMinimalInput();

    expect(() => orchestrator.execute(input)).toThrow("core-1040");
  });

  test("executes core-1040 alone when no other plugins are triggered", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(makeCorePlugin());

    const result = orchestrator.execute(makeMinimalInput());

    expect(result.triggeredForms).toContain("core-1040");
    expect(result.triggeredForms).toHaveLength(1);
    expect(result.coreResult).toEqual({ grossIncome: 50000, totalTax: 4000 });
    expect(result.formLinesMerged["1040.line9"]).toBe(50000);
  });

  test("executes dependent plugins in topological order", () => {
    const executionOrder: string[] = [];
    const orchestrator = new TaxOrchestrator();

    orchestrator.register(
      makeCorePlugin({
        calculate: () => {
          executionOrder.push("core-1040");
          return { grossIncome: 50000 };
        },
      }),
    );

    orchestrator.register({
      formId: "schedule-b",
      displayName: "Schedule B",
      triggerCondition: () => true,
      dependencies: ["core-1040"],
      calculate: () => {
        executionOrder.push("schedule-b");
        return { totalInterest: 2000 };
      },
      validate: () => [],
      mapToFormLines: () => ({}),
    });

    orchestrator.execute(makeMinimalInput());

    expect(executionOrder).toEqual(["core-1040", "schedule-b"]);
  });

  test("does not execute plugins whose trigger condition returns false", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(makeCorePlugin());
    orchestrator.register({
      formId: "schedule-b",
      displayName: "Schedule B",
      triggerCondition: () => false,
      dependencies: ["core-1040"],
      calculate: () => {
        throw new Error("should not be called");
      },
      validate: () => [],
      mapToFormLines: () => ({}),
    });

    const result = orchestrator.execute(makeMinimalInput());

    expect(result.triggeredForms).toEqual(["core-1040"]);
  });

  test("aggregates validation checks from all executed plugins", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(
      makeCorePlugin({
        validate: () => [
          { id: "core-check", label: "Core check", passed: true, severity: "warning", message: "ok" },
        ],
      }),
    );
    orchestrator.register({
      formId: "plugin-a",
      displayName: "Plugin A",
      triggerCondition: () => true,
      dependencies: [],
      calculate: () => ({}),
      validate: () => [
        { id: "a-check", label: "A check", passed: false, severity: "error", message: "bad" },
      ],
      mapToFormLines: () => ({}),
    });

    const result = orchestrator.execute(makeMinimalInput());

    expect(result.allValidationChecks).toHaveLength(2);
    expect(result.allValidationChecks.map((c) => c.id)).toContain("core-check");
    expect(result.allValidationChecks.map((c) => c.id)).toContain("a-check");
  });

  test("merges form lines from all plugins, later plugins overwrite earlier ones", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(
      makeCorePlugin({
        mapToFormLines: () => ({ "1040.line9": 50000, "1040.line11": 48000 }),
      }),
    );
    orchestrator.register({
      formId: "plugin-b",
      displayName: "Plugin B",
      triggerCondition: () => true,
      dependencies: ["core-1040"],
      calculate: () => ({}),
      validate: () => [],
      mapToFormLines: () => ({ "1040.line7": 3000, "1040.line9": 53000 }),
    });

    const result = orchestrator.execute(makeMinimalInput());

    // plugin-b overwrites 1040.line9
    expect(result.formLinesMerged["1040.line9"]).toBe(53000);
    expect(result.formLinesMerged["1040.line11"]).toBe(48000);
    expect(result.formLinesMerged["1040.line7"]).toBe(3000);
  });

  test("detects a dependency cycle and throws", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(makeCorePlugin());
    orchestrator.register({
      formId: "a",
      displayName: "A",
      triggerCondition: () => true,
      dependencies: ["b"],
      calculate: () => ({}),
      validate: () => [],
      mapToFormLines: () => ({}),
    });
    orchestrator.register({
      formId: "b",
      displayName: "B",
      triggerCondition: () => true,
      dependencies: ["a"],
      calculate: () => ({}),
      validate: () => [],
      mapToFormLines: () => ({}),
    });

    expect(() => orchestrator.execute(makeMinimalInput())).toThrow("cycle");
  });

  test("ignores dependencies on non-triggered plugins", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(makeCorePlugin());
    orchestrator.register({
      formId: "optional-dep",
      displayName: "Optional",
      triggerCondition: () => false,
      dependencies: [],
      calculate: () => ({}),
      validate: () => [],
      mapToFormLines: () => ({}),
    });
    orchestrator.register({
      formId: "child-plugin",
      displayName: "Child",
      triggerCondition: () => true,
      dependencies: ["optional-dep"],
      calculate: (_input, intermediateResults) => {
        // optional-dep was not triggered, so should be absent
        return { hasDep: intermediateResults.has("optional-dep") };
      },
      validate: () => [],
      mapToFormLines: () => ({}),
    });

    const result = orchestrator.execute(makeMinimalInput());

    expect(result.triggeredForms).toContain("child-plugin");
    expect(result.triggeredForms).not.toContain("optional-dep");
    const childResult = result.formResults.get("child-plugin") as { hasDep: boolean };
    expect(childResult.hasDep).toBe(false);
  });

  test("register and unregister plugins", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(makeCorePlugin());

    expect(orchestrator.registeredPlugins()).toContain("core-1040");

    orchestrator.unregister("core-1040");
    expect(orchestrator.registeredPlugins()).not.toContain("core-1040");
  });

  test("passes intermediateResults to downstream plugins", () => {
    const orchestrator = new TaxOrchestrator();
    orchestrator.register(
      makeCorePlugin({
        calculate: () => ({ grossIncome: 50000 }),
      }),
    );
    orchestrator.register({
      formId: "downstream",
      displayName: "Downstream",
      triggerCondition: () => true,
      dependencies: ["core-1040"],
      calculate: (_input, intermediateResults) => {
        const core = intermediateResults.get("core-1040") as { grossIncome: number };
        return { doubled: core.grossIncome * 2 };
      },
      validate: () => [],
      mapToFormLines: () => ({}),
    });

    const result = orchestrator.execute(makeMinimalInput());

    const downstream = result.formResults.get("downstream") as { doubled: number };
    expect(downstream.doubled).toBe(100000);
  });
});
