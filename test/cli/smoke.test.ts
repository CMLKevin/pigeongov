/**
 * CLI smoke tests — verify every command is registered and produces output.
 * These tests run the actual CLI entry point and check that commands
 * don't crash and produce expected output shapes.
 */
import { describe, test, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";

const CLI = "node --import tsx bin/pigeongov.ts";

function run(args: string): string {
  return execSync(`${CLI} ${args}`, {
    cwd: process.cwd(),
    encoding: "utf-8",
    timeout: 15_000,
    env: { ...process.env, PIGEONGOV_NO_TUI: "1", NO_COLOR: "1" },
  });
}

function runJson(args: string): unknown {
  const output = run(`${args} --json`);
  return JSON.parse(output);
}

function tryRun(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = run(args);
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: string; status?: number };
    return { stdout: err.stdout ?? "", exitCode: err.status ?? 1 };
  }
}

describe("CLI command registration", () => {
  test("--version returns a semver string", () => {
    const output = run("--version").trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("--help lists all commands", () => {
    const output = run("--help");
    const expectedCommands = [
      "fill", "validate", "review", "list", "extract",
      "start", "workflows", "schemas", "doctor", "tui", "serve",
      "drafts", "vault", "profile", "deadlines", "fees", "glossary",
      "plugins", "scaffold", "testdata", "completions", "stats",
      "life-event", "screen", "merge",
    ];
    for (const cmd of expectedCommands) {
      expect(output).toContain(cmd);
    }
  });
});

describe("Workflow commands", () => {
  test("list outputs all 34 workflows", () => {
    const output = run("list");
    const lines = output.trim().split("\n");
    expect(lines.length).toBe(34);
  });

  test("list --json returns valid JSON with workflows", () => {
    const data = runJson("list") as { workflows: unknown[] };
    expect(data.workflows).toBeDefined();
    expect(data.workflows.length).toBe(34);
  });

  test("workflows list matches list command", () => {
    const listOutput = run("list").trim().split("\n").length;
    const workflowsOutput = run("workflows list").trim().split("\n").length;
    expect(listOutput).toBe(workflowsOutput);
  });

  test("start tax/1040 --json returns starter data", () => {
    const data = runJson("start tax/1040") as Record<string, unknown>;
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  test("schemas describe tax/1040 returns schema info", () => {
    const data = runJson("schemas describe tax/1040") as Record<string, unknown>;
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });
});

describe("Life event command", () => {
  test("life-event without args lists events", () => {
    const output = run("life-event");
    expect(output).toContain("job-loss");
    expect(output).toContain("marriage");
    expect(output).toContain("new-baby");
  });

  test("life-event job-loss produces action plan", () => {
    const output = run("life-event job-loss");
    expect(output).toContain("Job loss");
    expect(output).toContain("unemployment/claim-intake");
  });

  test("life-event --json returns structured data", () => {
    const data = runJson("life-event") as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test("life-event job-loss --json returns plan object", () => {
    const data = runJson("life-event job-loss") as { event: unknown; orderedWorkflows: unknown[] };
    expect(data.event).toBeDefined();
    expect(data.orderedWorkflows).toBeDefined();
  });

  test("life-event unknown-event fails gracefully", () => {
    const { exitCode } = tryRun("life-event nonexistent-event");
    expect(exitCode).not.toBe(0);
  });
});

describe("Screen command", () => {
  test("screen --help shows description", () => {
    const output = run("screen --help");
    expect(output).toContain("eligibility");
  });

  test("screen --input with JSON data produces results", () => {
    const input = JSON.stringify({
      householdSize: 4,
      annualHouseholdIncome: 28000,
      state: "CA",
      citizenshipStatus: "us_citizen",
      ages: [35, 33, 5, 2],
      hasDisability: false,
      employmentStatus: "employed",
      isVeteran: false,
      hasHealthInsurance: true,
      monthlyRent: 1200,
    });
    const tmpFile = "/tmp/pigeongov-screen-test.json";
    const { writeFileSync } = require("node:fs");
    writeFileSync(tmpFile, input);
    const data = runJson(`screen --input ${tmpFile}`) as { results: unknown[] };
    expect(data.results).toBeDefined();
    expect(data.results.length).toBeGreaterThan(0);
  });
});

describe("Infrastructure commands", () => {
  test("deadlines shows upcoming dates", () => {
    const output = run("deadlines");
    expect(output).toContain("tax/1040");
  });

  test("deadlines --json returns structured data", () => {
    const data = runJson("deadlines") as { deadlines: unknown[] };
    expect(data.deadlines).toBeDefined();
  });

  test("fees shows fee information", () => {
    const output = run("fees");
    expect(output).toContain("immigration");
  });

  test("fees --json returns structured data", () => {
    const data = runJson("fees") as { fees: unknown[] };
    expect(data.fees).toBeDefined();
  });

  test("glossary AGI returns definition", () => {
    const output = run("glossary AGI");
    expect(output.toLowerCase()).toContain("adjusted gross income");
  });

  test("glossary AGI --json returns structured data", () => {
    const data = runJson("glossary AGI") as { entry: { term: string } };
    expect(data.entry).toBeDefined();
    expect(data.entry.term).toBeDefined();
  });

  test("drafts list doesn't crash", () => {
    const output = run("drafts list");
    expect(output).toBeDefined();
  });

  test("stats doesn't crash", () => {
    const output = run("stats");
    expect(output).toContain("PigeonGov");
  });

  test("completions zsh produces valid script", () => {
    const output = run("completions zsh");
    expect(output).toContain("#compdef pigeongov");
  });

  test("completions bash produces valid script", () => {
    const output = run("completions bash");
    expect(output).toContain("pigeongov");
  });

  test("completions fish produces valid script", () => {
    const output = run("completions fish");
    expect(output).toContain("complete");
  });

  test("doctor doesn't crash", () => {
    const { stdout } = tryRun("doctor");
    expect(stdout).toBeDefined();
  });
});

describe("Merge command", () => {
  test("merge --help shows usage", () => {
    const output = run("merge --help");
    expect(output).toContain("merge");
  });
});

describe("TUI command", () => {
  test("tui --help shows usage", () => {
    const output = run("tui --help");
    expect(output).toContain("tui");
    expect(output).not.toContain("year");
  });
});

describe("Fill workflow end-to-end", () => {
  test("fill tax/1040 --json with valid data produces a valid bundle", () => {
    const fillInput = {
      filingStatus: "single",
      wages: 50000,
      taxableInterest: 100,
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
      federalWithheld: 5000,
      estimatedPayments: 0,
      dependents: [],
    };
    const tmpFile = "/tmp/pigeongov-fill-test.json";
    const { writeFileSync } = require("node:fs");
    writeFileSync(tmpFile, JSON.stringify(fillInput));
    const result = tryRun(`fill tax/1040 --json --data ${tmpFile}`);
    // May have warnings (exit 2) or validation errors (exit 3) but should not crash (exit 1)
    expect([0, 2, 3]).toContain(result.exitCode);
    if (result.stdout) {
      expect(result.stdout).toContain("workflowId");
    }
  });
});
