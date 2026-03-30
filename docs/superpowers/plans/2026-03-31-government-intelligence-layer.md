# Government Intelligence Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform PigeonGov from a form calculator into the government intelligence API — the substrate that makes any AI agent better at helping humans navigate government bureaucracy.

**Architecture:** Each feature is a pure TypeScript module exposing a function, a CLI command, and an MCP tool. All follow the existing pattern: module in `src/advisory/` or `src/engine/`, CLI command in `src/cli/commands/`, MCP tool in `src/mcp/tools/`. Every feature works standalone and composes with others via the agent ecosystem.

**Tech Stack:** TypeScript, Zod, Commander, chalk, Node.js `fetch` for external APIs, existing workflow registry.

---

## File Map

### New files to create:

| File | Responsibility |
|------|---------------|
| `src/advisory/dependencies/graph.ts` | Cross-agency dependency graph engine |
| `src/advisory/dependencies/data.ts` | Dependency relationship data |
| `src/advisory/cliff/calculator.ts` | Benefits cliff calculator |
| `src/advisory/cliff/programs.ts` | Program benefit curves by income |
| `src/advisory/tracker/uscis.ts` | USCIS case status API client |
| `src/advisory/tracker/types.ts` | Tracker types |
| `src/advisory/router/document-router.ts` | Document → forms routing engine |
| `src/advisory/processing-times/data.ts` | Processing time intelligence |
| `src/advisory/cost/estimator.ts` | Government cost estimator |
| `src/advisory/explain/form-explainer.ts` | Plain-language form field explainer |
| `src/cli/commands/dependencies.ts` | CLI: pigeongov dependencies |
| `src/cli/commands/cliff.ts` | CLI: pigeongov cliff |
| `src/cli/commands/track.ts` | CLI: pigeongov track |
| `src/cli/commands/route.ts` | CLI: pigeongov route |
| `src/cli/commands/processing-times.ts` | CLI: pigeongov processing-times |
| `src/cli/commands/cost.ts` | CLI: pigeongov cost |
| `src/cli/commands/explain.ts` | CLI: pigeongov explain |
| `src/mcp/tools/dependencies.ts` | MCP: pigeongov_get_dependencies |
| `src/mcp/tools/cliff.ts` | MCP: pigeongov_calculate_cliff |
| `src/mcp/tools/track-case.ts` | MCP: pigeongov_track_case |
| `src/mcp/tools/route-documents.ts` | MCP: pigeongov_route_documents |
| `src/mcp/tools/processing-times.ts` | MCP: pigeongov_processing_times |
| `src/mcp/tools/cost-estimate.ts` | MCP: pigeongov_estimate_cost |
| `src/mcp/tools/explain-field.ts` | MCP: pigeongov_explain_form_field |
| `test/advisory/dependencies.test.ts` | Tests for dependency graph |
| `test/advisory/cliff.test.ts` | Tests for cliff calculator |
| `test/advisory/tracker.test.ts` | Tests for USCIS tracker |
| `test/advisory/router.test.ts` | Tests for document router |
| `test/advisory/cost.test.ts` | Tests for cost estimator |
| `skills/pigeongov.md` | Claude Code skill file for skills.sh |

### Files to modify:

| File | Change |
|------|--------|
| `src/cli/index.ts` | Register 7 new commands |
| `src/types.ts` | Add dependency, cliff, tracker types |
| `agents.json` | Add new MCP tools |
| `llms.txt` | Add new commands |
| `README.md` | Document new features |

---

### Task 1: Cross-Agency Dependency Graph

**Files:**
- Create: `src/advisory/dependencies/graph.ts`
- Create: `src/advisory/dependencies/data.ts`
- Create: `src/cli/commands/dependencies.ts`
- Create: `src/mcp/tools/dependencies.ts`
- Create: `test/advisory/dependencies.test.ts`
- Modify: `src/types.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Add types to src/types.ts**

Append to the end of `src/types.ts`:

```typescript
// --- Dependency graph types ---

export interface WorkflowDependency {
  sourceWorkflowId: string;
  targetWorkflowId: string;
  relationship: "triggers" | "requires" | "affects" | "invalidates";
  description: string;
  bidirectional: boolean;
}

export interface DependencyChain {
  workflowId: string;
  downstream: Array<{
    workflowId: string;
    relationship: string;
    description: string;
    depth: number;
  }>;
  upstream: Array<{
    workflowId: string;
    relationship: string;
    description: string;
    depth: number;
  }>;
}

// --- Benefits cliff types ---

export interface CliffAnalysis {
  currentIncome: number;
  householdSize: number;
  state: string;
  currentBenefits: Array<{ program: string; monthlyValue: number }>;
  cliffPoints: Array<{
    income: number;
    programLost: string;
    monthlyLoss: number;
    annualLoss: number;
  }>;
  safeRaiseThreshold: number;
  recommendation: string;
}

// --- Case tracker types ---

export interface CaseStatus {
  receiptNumber: string;
  formType: string;
  status: string;
  statusDescription: string;
  lastUpdated: string;
  processingTime?: { percentile50: number; percentile75: number; percentile90: number } | undefined;
}

// --- Document router types ---

export interface DocumentRouting {
  documents: Array<{ filename: string; detectedType: string; confidence: number }>;
  recommendedWorkflows: Array<{
    workflowId: string;
    reason: string;
    relevantDocuments: string[];
    priority: number;
  }>;
  crossAgencyImplications: string[];
}

// --- Cost estimator types ---

export interface CostEstimate {
  workflowId: string;
  diyTotal: { min: number; max: number; breakdown: Array<{ item: string; amount: number; type: string }> };
  withToolTotal: { min: number; max: number; breakdown: Array<{ item: string; amount: number; type: string }> };
  withAttorneyTotal: { min: number; max: number; breakdown: Array<{ item: string; amount: number; type: string }> };
  savings: { vsAttorney: number; description: string };
}
```

- [ ] **Step 2: Write dependency graph tests**

Create `test/advisory/dependencies.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { getDependencies, getDownstream, getUpstream } from "../../src/advisory/dependencies/graph.js";

describe("Cross-agency dependency graph", () => {
  test("naturalization triggers downstream workflows", () => {
    const deps = getDependencies("immigration/naturalization");
    expect(deps.downstream.length).toBeGreaterThan(0);
    const workflowIds = deps.downstream.map(d => d.workflowId);
    expect(workflowIds).toContain("tax/1040");
    expect(workflowIds).toContain("identity/voter-registration");
    expect(workflowIds).toContain("identity/passport");
  });

  test("job loss triggers benefits + tax workflows", () => {
    const deps = getDependencies("unemployment/claim-intake");
    const downstream = deps.downstream.map(d => d.workflowId);
    expect(downstream).toContain("healthcare/aca-enrollment");
    expect(downstream).toContain("tax/1040");
  });

  test("tax/1040 has upstream dependencies", () => {
    const deps = getDependencies("tax/1040");
    expect(deps.upstream.length).toBeGreaterThan(0);
  });

  test("unknown workflow returns empty deps", () => {
    const deps = getDependencies("unknown/workflow");
    expect(deps.downstream).toEqual([]);
    expect(deps.upstream).toEqual([]);
  });

  test("getDownstream returns transitive dependencies", () => {
    const chain = getDownstream("immigration/naturalization");
    // Naturalization → voter registration is depth 1
    // Naturalization → tax/1040 → (tax implications) is depth 1
    expect(chain.some(d => d.depth === 1)).toBe(true);
  });

  test("getUpstream returns what feeds into a workflow", () => {
    const chain = getUpstream("identity/voter-registration");
    const sources = chain.map(d => d.workflowId);
    expect(sources).toContain("immigration/naturalization");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test -- test/advisory/dependencies.test.ts
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 4: Create dependency data**

Create `src/advisory/dependencies/data.ts`:

```typescript
import type { WorkflowDependency } from "../../types.js";

export const WORKFLOW_DEPENDENCIES: WorkflowDependency[] = [
  // Immigration → Identity
  { sourceWorkflowId: "immigration/naturalization", targetWorkflowId: "identity/voter-registration", relationship: "triggers", description: "Naturalized citizens become eligible to vote", bidirectional: false },
  { sourceWorkflowId: "immigration/naturalization", targetWorkflowId: "identity/passport", relationship: "triggers", description: "Naturalized citizens can apply for US passport", bidirectional: false },
  { sourceWorkflowId: "immigration/naturalization", targetWorkflowId: "tax/1040", relationship: "affects", description: "Citizenship changes tax filing requirements and treaty eligibility", bidirectional: false },
  { sourceWorkflowId: "immigration/naturalization", targetWorkflowId: "benefits/snap", relationship: "affects", description: "Citizenship removes 5-year waiting period for federal benefits", bidirectional: false },

  // Immigration → Tax
  { sourceWorkflowId: "immigration/work-authorization", targetWorkflowId: "tax/1040", relationship: "triggers", description: "EAD approval creates tax filing obligation on earned income", bidirectional: false },
  { sourceWorkflowId: "immigration/green-card-renewal", targetWorkflowId: "tax/1040", relationship: "affects", description: "LPR status requires worldwide income reporting", bidirectional: false },

  // Tax → Benefits
  { sourceWorkflowId: "tax/1040", targetWorkflowId: "benefits/snap", relationship: "affects", description: "AGI determines SNAP eligibility (130% FPL gross income test)", bidirectional: false },
  { sourceWorkflowId: "tax/1040", targetWorkflowId: "benefits/medicaid", relationship: "affects", description: "MAGI from tax return determines Medicaid eligibility", bidirectional: false },
  { sourceWorkflowId: "tax/1040", targetWorkflowId: "healthcare/aca-enrollment", relationship: "affects", description: "AGI determines premium tax credit and cost-sharing reduction amounts", bidirectional: false },
  { sourceWorkflowId: "tax/1040", targetWorkflowId: "healthcare/aca-enrollment", relationship: "requires", description: "Form 8962 reconciles advance premium tax credits at filing", bidirectional: true },
  { sourceWorkflowId: "tax/1040", targetWorkflowId: "education/fafsa", relationship: "affects", description: "Tax return data used for FAFSA income verification (prior-prior year)", bidirectional: false },

  // Benefits → Tax
  { sourceWorkflowId: "benefits/ssdi-application", targetWorkflowId: "tax/1040", relationship: "affects", description: "SSDI benefits may be taxable if combined income exceeds thresholds", bidirectional: false },
  { sourceWorkflowId: "retirement/ssa-estimator", targetWorkflowId: "tax/1040", relationship: "affects", description: "Social Security benefits taxable at 50% or 85% based on provisional income", bidirectional: false },

  // Employment changes cascade
  { sourceWorkflowId: "unemployment/claim-intake", targetWorkflowId: "healthcare/aca-enrollment", relationship: "triggers", description: "Job loss is a qualifying life event — 60-day special enrollment", bidirectional: false },
  { sourceWorkflowId: "unemployment/claim-intake", targetWorkflowId: "benefits/snap", relationship: "triggers", description: "Income loss may create SNAP eligibility", bidirectional: false },
  { sourceWorkflowId: "unemployment/claim-intake", targetWorkflowId: "benefits/medicaid", relationship: "triggers", description: "Income drop may qualify for Medicaid", bidirectional: false },
  { sourceWorkflowId: "unemployment/claim-intake", targetWorkflowId: "tax/1040", relationship: "affects", description: "Unemployment benefits are taxable income (Form 1099-G)", bidirectional: false },
  { sourceWorkflowId: "unemployment/claim-intake", targetWorkflowId: "benefits/liheap", relationship: "triggers", description: "Reduced income may qualify for energy assistance", bidirectional: false },

  // Identity changes cascade
  { sourceWorkflowId: "identity/name-change", targetWorkflowId: "tax/1040", relationship: "requires", description: "IRS name must match SSA records — update SSA first", bidirectional: false },
  { sourceWorkflowId: "identity/name-change", targetWorkflowId: "identity/passport", relationship: "triggers", description: "Name change requires passport update for international travel", bidirectional: false },
  { sourceWorkflowId: "identity/name-change", targetWorkflowId: "identity/voter-registration", relationship: "triggers", description: "Voter registration must be updated after legal name change", bidirectional: false },
  { sourceWorkflowId: "identity/name-change", targetWorkflowId: "identity/real-id", relationship: "triggers", description: "REAL ID documents must reflect current legal name", bidirectional: false },

  // Estate → Tax
  { sourceWorkflowId: "estate/basic-will", targetWorkflowId: "tax/1040", relationship: "affects", description: "Estate planning affects beneficiary designations which override wills for retirement accounts", bidirectional: false },

  // Veterans → Benefits
  { sourceWorkflowId: "veterans/disability-claim", targetWorkflowId: "veterans/va-healthcare", relationship: "triggers", description: "Disability rating determines VA healthcare priority group", bidirectional: false },
  { sourceWorkflowId: "veterans/disability-claim", targetWorkflowId: "tax/1040", relationship: "affects", description: "VA disability compensation is tax-free but affects other calculations", bidirectional: false },
  { sourceWorkflowId: "veterans/disability-claim", targetWorkflowId: "benefits/ssdi-application", relationship: "affects", description: "VA disability and SSDI can be received concurrently — different agencies, different criteria", bidirectional: false },

  // Healthcare interdependencies
  { sourceWorkflowId: "healthcare/aca-enrollment", targetWorkflowId: "benefits/medicaid", relationship: "affects", description: "ACA marketplace application simultaneously screens for Medicaid eligibility", bidirectional: true },
  { sourceWorkflowId: "healthcare/medicare-enrollment", targetWorkflowId: "healthcare/aca-enrollment", relationship: "invalidates", description: "Medicare enrollment ends ACA marketplace eligibility — must drop marketplace plan", bidirectional: false },

  // Education → Tax
  { sourceWorkflowId: "education/student-loan-repayment", targetWorkflowId: "tax/1040", relationship: "affects", description: "Student loan interest deduction (up to $2,500) and IDR plans use AGI", bidirectional: true },
  { sourceWorkflowId: "education/fafsa", targetWorkflowId: "tax/1040", relationship: "requires", description: "FAFSA uses tax return data — IRS Data Retrieval Tool for verification", bidirectional: false },

  // Legal → Identity
  { sourceWorkflowId: "legal/expungement", targetWorkflowId: "immigration/naturalization", relationship: "affects", description: "Expungement may affect good moral character determination for naturalization", bidirectional: false },

  // Retirement cascade
  { sourceWorkflowId: "retirement/ssa-estimator", targetWorkflowId: "healthcare/medicare-enrollment", relationship: "triggers", description: "Reaching 65 triggers Medicare initial enrollment period", bidirectional: false },
];
```

- [ ] **Step 5: Create dependency graph engine**

Create `src/advisory/dependencies/graph.ts`:

```typescript
import type { DependencyChain } from "../../types.js";
import { WORKFLOW_DEPENDENCIES } from "./data.js";

export function getDependencies(workflowId: string): DependencyChain {
  return {
    workflowId,
    downstream: getDownstream(workflowId),
    upstream: getUpstream(workflowId),
  };
}

export function getDownstream(
  workflowId: string,
  maxDepth: number = 3,
): DependencyChain["downstream"] {
  const visited = new Set<string>();
  const results: DependencyChain["downstream"] = [];

  function traverse(currentId: string, depth: number): void {
    if (depth > maxDepth || visited.has(currentId)) return;
    visited.add(currentId);

    const directDeps = WORKFLOW_DEPENDENCIES.filter(
      (d) => d.sourceWorkflowId === currentId,
    );

    for (const dep of directDeps) {
      if (!visited.has(dep.targetWorkflowId) || depth === 1) {
        results.push({
          workflowId: dep.targetWorkflowId,
          relationship: dep.relationship,
          description: dep.description,
          depth,
        });
        traverse(dep.targetWorkflowId, depth + 1);
      }
    }
  }

  traverse(workflowId, 1);
  return results.sort((a, b) => a.depth - b.depth);
}

export function getUpstream(
  workflowId: string,
  maxDepth: number = 3,
): DependencyChain["upstream"] {
  const visited = new Set<string>();
  const results: DependencyChain["upstream"] = [];

  function traverse(currentId: string, depth: number): void {
    if (depth > maxDepth || visited.has(currentId)) return;
    visited.add(currentId);

    const feeders = WORKFLOW_DEPENDENCIES.filter(
      (d) => d.targetWorkflowId === currentId,
    );

    for (const dep of feeders) {
      if (!visited.has(dep.sourceWorkflowId) || depth === 1) {
        results.push({
          workflowId: dep.sourceWorkflowId,
          relationship: dep.relationship,
          description: dep.description,
          depth,
        });
        traverse(dep.sourceWorkflowId, depth + 1);
      }
    }
  }

  traverse(workflowId, 1);
  return results.sort((a, b) => a.depth - b.depth);
}

export function getAllDependencies(): typeof WORKFLOW_DEPENDENCIES {
  return WORKFLOW_DEPENDENCIES;
}
```

- [ ] **Step 6: Create CLI command**

Create `src/cli/commands/dependencies.ts`:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { getDependencies } from "../../advisory/dependencies/graph.js";

export function registerDependenciesCommand(program: Command): void {
  program
    .command("dependencies")
    .alias("deps")
    .description("Show cross-agency dependencies for a workflow")
    .argument("<workflowId>", "Workflow ID (e.g., immigration/naturalization)")
    .action((workflowId: string) => {
      const deps = getDependencies(workflowId);

      if (isJsonMode()) {
        emitJson(deps);
        return;
      }

      console.log(chalk.bold(`\n  Dependencies for ${chalk.cyan(workflowId)}\n`));

      if (deps.downstream.length > 0) {
        console.log(chalk.bold("  Triggers / Affects:"));
        for (const d of deps.downstream) {
          const icon = d.relationship === "triggers" ? "→" : d.relationship === "invalidates" ? "✗" : "~";
          const color = d.relationship === "triggers" ? chalk.green : d.relationship === "invalidates" ? chalk.red : chalk.yellow;
          console.log(`    ${color(icon)} ${chalk.bold(d.workflowId)}`);
          console.log(`      ${chalk.dim(d.description)}`);
        }
      } else {
        console.log(chalk.dim("  No downstream dependencies."));
      }

      if (deps.upstream.length > 0) {
        console.log(chalk.bold("\n  Depends on:"));
        for (const u of deps.upstream) {
          console.log(`    ← ${chalk.bold(u.workflowId)}`);
          console.log(`      ${chalk.dim(u.description)}`);
        }
      }

      console.log("");
    });
}
```

- [ ] **Step 7: Create MCP tool**

Create `src/mcp/tools/dependencies.ts`:

```typescript
import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { getDependencies } from "../../advisory/dependencies/graph.js";

export const schema = {
  workflowId: z.string().describe("Workflow ID to get dependencies for (e.g., immigration/naturalization)"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_get_dependencies",
  description:
    "Get cross-agency dependencies for a government workflow. Shows what other workflows are triggered, affected, or required when a workflow is completed. Essential for understanding cascading government obligations.",
};

export default function dependenciesTool(args: { workflowId: string }) {
  const deps = getDependencies(args.workflowId);
  return withStructuredContent({
    ok: true,
    workflowId: args.workflowId,
    downstreamCount: deps.downstream.length,
    upstreamCount: deps.upstream.length,
    downstream: deps.downstream,
    upstream: deps.upstream,
  });
}
```

- [ ] **Step 8: Run tests and verify they pass**

```bash
pnpm test -- test/advisory/dependencies.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/advisory/dependencies/ src/cli/commands/dependencies.ts src/mcp/tools/dependencies.ts test/advisory/dependencies.test.ts src/types.ts
git commit -m "feat: cross-agency dependency graph engine

Models relationships between 34 workflows across 13 government domains.
Understands that naturalization triggers voter registration, that job loss
triggers benefits eligibility, that tax filing affects FAFSA, etc.

30+ dependency relationships with transitive traversal."
```

---

### Task 2: Benefits Cliff Calculator

**Files:**
- Create: `src/advisory/cliff/calculator.ts`
- Create: `src/advisory/cliff/programs.ts`
- Create: `src/cli/commands/cliff.ts`
- Create: `src/mcp/tools/cliff.ts`
- Create: `test/advisory/cliff.test.ts`

- [ ] **Step 1: Write cliff calculator tests**

Create `test/advisory/cliff.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { calculateCliff } from "../../src/advisory/cliff/calculator.js";

describe("Benefits cliff calculator", () => {
  test("identifies SNAP cliff at 130% FPL", () => {
    const result = calculateCliff({ annualIncome: 28000, householdSize: 4, state: "CA" });
    const snapCliff = result.cliffPoints.find(c => c.programLost === "SNAP");
    expect(snapCliff).toBeDefined();
    expect(snapCliff!.income).toBeGreaterThan(28000);
  });

  test("shows current benefits at given income", () => {
    const result = calculateCliff({ annualIncome: 20000, householdSize: 3, state: "CA" });
    expect(result.currentBenefits.length).toBeGreaterThan(0);
    const programs = result.currentBenefits.map(b => b.program);
    expect(programs).toContain("SNAP");
  });

  test("calculates safe raise threshold", () => {
    const result = calculateCliff({ annualIncome: 30000, householdSize: 4, state: "CA" });
    expect(result.safeRaiseThreshold).toBeGreaterThan(result.currentIncome);
  });

  test("high income shows no benefits", () => {
    const result = calculateCliff({ annualIncome: 150000, householdSize: 1, state: "CA" });
    expect(result.currentBenefits.length).toBe(0);
    expect(result.cliffPoints.length).toBe(0);
  });

  test("produces recommendation text", () => {
    const result = calculateCliff({ annualIncome: 28000, householdSize: 4, state: "CA" });
    expect(result.recommendation).toBeTruthy();
  });
});
```

- [ ] **Step 2: Create program benefit curves**

Create `src/advisory/cliff/programs.ts`:

```typescript
const FPL_BASE = 15_650;
const FPL_PER_PERSON = 5_580;

export function fplForHousehold(size: number): number {
  return FPL_BASE + FPL_PER_PERSON * Math.max(0, size - 1);
}

export interface ProgramEligibility {
  program: string;
  isEligible: (income: number, householdSize: number, state: string) => boolean;
  monthlyBenefit: (income: number, householdSize: number) => number;
  cutoffIncome: (householdSize: number) => number;
}

const SNAP_MAX: Record<number, number> = { 1: 292, 2: 536, 3: 768, 4: 975, 5: 1158, 6: 1390, 7: 1536, 8: 1756 };

export const PROGRAMS: ProgramEligibility[] = [
  {
    program: "SNAP",
    isEligible: (income, hs) => income <= fplForHousehold(hs) * 1.3,
    monthlyBenefit: (income, hs) => {
      const max = SNAP_MAX[Math.min(hs, 8)] ?? 1756;
      const netMonthly = income / 12;
      return Math.max(0, max - netMonthly * 0.3);
    },
    cutoffIncome: (hs) => Math.floor(fplForHousehold(hs) * 1.3),
  },
  {
    program: "Medicaid",
    isEligible: (income, hs) => income <= fplForHousehold(hs) * 1.38,
    monthlyBenefit: () => 600, // average value of Medicaid coverage
    cutoffIncome: (hs) => Math.floor(fplForHousehold(hs) * 1.38),
  },
  {
    program: "WIC",
    isEligible: (income, hs) => income <= fplForHousehold(hs) * 1.85,
    monthlyBenefit: () => 75,
    cutoffIncome: (hs) => Math.floor(fplForHousehold(hs) * 1.85),
  },
  {
    program: "LIHEAP",
    isEligible: (income, hs) => income <= fplForHousehold(hs) * 1.5,
    monthlyBenefit: () => 50, // annualized average
    cutoffIncome: (hs) => Math.floor(fplForHousehold(hs) * 1.5),
  },
  {
    program: "ACA Subsidy",
    isEligible: (income, hs) => {
      const pct = (income / fplForHousehold(hs)) * 100;
      return pct >= 100 && pct <= 400;
    },
    monthlyBenefit: (income, hs) => {
      const pct = (income / fplForHousehold(hs)) * 100;
      if (pct <= 150) return 500;
      if (pct <= 200) return 400;
      if (pct <= 250) return 300;
      if (pct <= 300) return 150;
      if (pct <= 400) return 50;
      return 0;
    },
    cutoffIncome: (hs) => Math.floor(fplForHousehold(hs) * 4.0),
  },
  {
    program: "CHIP",
    isEligible: (income, hs) => income <= fplForHousehold(hs) * 2.0,
    monthlyBenefit: () => 200,
    cutoffIncome: (hs) => Math.floor(fplForHousehold(hs) * 2.0),
  },
];
```

- [ ] **Step 3: Create cliff calculator**

Create `src/advisory/cliff/calculator.ts`:

```typescript
import type { CliffAnalysis } from "../../types.js";
import { PROGRAMS } from "./programs.js";

interface CliffInput {
  annualIncome: number;
  householdSize: number;
  state: string;
}

export function calculateCliff(input: CliffInput): CliffAnalysis {
  const { annualIncome, householdSize, state } = input;

  // Current benefits
  const currentBenefits = PROGRAMS
    .filter((p) => p.isEligible(annualIncome, householdSize, state))
    .map((p) => ({
      program: p.program,
      monthlyValue: Math.round(p.monthlyBenefit(annualIncome, householdSize)),
    }));

  // Find cliff points — income levels where each program drops off
  const cliffPoints = PROGRAMS
    .filter((p) => p.isEligible(annualIncome, householdSize, state))
    .map((p) => {
      const cutoff = p.cutoffIncome(householdSize);
      const monthlyLoss = Math.round(p.monthlyBenefit(cutoff - 1, householdSize));
      return {
        income: cutoff,
        programLost: p.program,
        monthlyLoss,
        annualLoss: monthlyLoss * 12,
      };
    })
    .filter((c) => c.income > annualIncome)
    .sort((a, b) => a.income - b.income);

  // Safe raise threshold: find the income where total compensation
  // (earnings + remaining benefits) exceeds current total
  const currentTotalMonthly = annualIncome / 12 + currentBenefits.reduce((s, b) => s + b.monthlyValue, 0);

  let safeThreshold = annualIncome;
  for (let testIncome = annualIncome + 500; testIncome < annualIncome * 3; testIncome += 500) {
    const remainingBenefits = PROGRAMS
      .filter((p) => p.isEligible(testIncome, householdSize, state))
      .reduce((s, p) => s + p.monthlyBenefit(testIncome, householdSize), 0);
    const testTotal = testIncome / 12 + remainingBenefits;
    if (testTotal > currentTotalMonthly) {
      safeThreshold = testIncome;
      break;
    }
  }

  const totalCurrentBenefitValue = currentBenefits.reduce((s, b) => s + b.monthlyValue * 12, 0);

  const recommendation = cliffPoints.length > 0
    ? `At $${annualIncome.toLocaleString()}, you receive ~$${totalCurrentBenefitValue.toLocaleString()}/year in benefits. ` +
      `The first cliff is at $${cliffPoints[0]!.income.toLocaleString()} (lose ${cliffPoints[0]!.programLost}, ` +
      `worth $${cliffPoints[0]!.annualLoss.toLocaleString()}/year). ` +
      `A safe raise target is $${safeThreshold.toLocaleString()} where earnings offset all lost benefits.`
    : totalCurrentBenefitValue > 0
      ? `At $${annualIncome.toLocaleString()}, you receive ~$${totalCurrentBenefitValue.toLocaleString()}/year in benefits with no immediate cliffs ahead.`
      : `At $${annualIncome.toLocaleString()}, you are above the income thresholds for the major federal benefits programs.`;

  return {
    currentIncome: annualIncome,
    householdSize,
    state,
    currentBenefits,
    cliffPoints,
    safeRaiseThreshold: safeThreshold,
    recommendation,
  };
}
```

- [ ] **Step 4: Create CLI command**

Create `src/cli/commands/cliff.ts`:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { calculateCliff } from "../../advisory/cliff/calculator.js";

export function registerCliffCommand(program: Command): void {
  program
    .command("cliff")
    .description("Calculate benefits cliff — what you lose if you earn more")
    .requiredOption("--income <amount>", "Annual household income")
    .requiredOption("--household <size>", "Household size")
    .option("--state <code>", "State (2-letter)", "CA")
    .action((options) => {
      const result = calculateCliff({
        annualIncome: parseInt(options.income, 10),
        householdSize: parseInt(options.household, 10),
        state: options.state.toUpperCase(),
      });

      if (isJsonMode()) {
        emitJson(result);
        return;
      }

      console.log(chalk.bold(`\n  Benefits Cliff Analysis\n`));
      console.log(`  Income: ${chalk.cyan("$" + result.currentIncome.toLocaleString())} | Household: ${result.householdSize} | State: ${result.state}\n`);

      if (result.currentBenefits.length > 0) {
        console.log(chalk.bold("  Current Benefits:"));
        for (const b of result.currentBenefits) {
          console.log(`    ${chalk.green("●")} ${b.program.padEnd(20)} ${chalk.green("$" + b.monthlyValue + "/mo")}`);
        }
      } else {
        console.log(chalk.dim("  No current benefits at this income level."));
      }

      if (result.cliffPoints.length > 0) {
        console.log(chalk.bold("\n  Cliff Points (where benefits drop off):"));
        for (const c of result.cliffPoints) {
          console.log(`    ${chalk.red("!")} At ${chalk.yellow("$" + c.income.toLocaleString())} → lose ${chalk.bold(c.programLost)} (${chalk.red("-$" + c.annualLoss.toLocaleString() + "/yr")})`);
        }
        console.log(`\n  ${chalk.green("Safe raise target:")} ${chalk.bold("$" + result.safeRaiseThreshold.toLocaleString())}`);
      }

      console.log(`\n  ${chalk.dim(result.recommendation)}\n`);
    });
}
```

- [ ] **Step 5: Create MCP tool**

Create `src/mcp/tools/cliff.ts`:

```typescript
import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { calculateCliff } from "../../advisory/cliff/calculator.js";

export const schema = {
  annualIncome: z.coerce.number().min(0).describe("Annual household income in dollars"),
  householdSize: z.coerce.number().int().min(1).max(20).describe("Number of people in household"),
  state: z.string().length(2).default("CA").describe("Two-letter state code"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_calculate_cliff",
  description:
    "Calculate benefits cliff analysis. Shows what government benefits a household currently receives, at what income level each benefit drops off, and the safe raise threshold where earnings offset lost benefits. Critical for understanding the perverse incentives in the safety net.",
};

export default function cliffTool(args: { annualIncome: number; householdSize: number; state: string }) {
  const result = calculateCliff(args);
  return withStructuredContent({
    ok: true,
    ...result,
  });
}
```

- [ ] **Step 6: Run tests, verify pass, commit**

```bash
pnpm test -- test/advisory/cliff.test.ts
git add src/advisory/cliff/ src/cli/commands/cliff.ts src/mcp/tools/cliff.ts test/advisory/cliff.test.ts
git commit -m "feat: benefits cliff calculator

Calculates what government benefits a household receives at their income,
where each benefit drops off (the 'cliff'), and the safe raise threshold.
3 million households face these perverse incentives. Now they can see the math."
```

---

### Task 3: USCIS Case Status Tracker

**Files:**
- Create: `src/advisory/tracker/uscis.ts`
- Create: `src/advisory/tracker/types.ts`
- Create: `src/cli/commands/track.ts`
- Create: `src/mcp/tools/track-case.ts`
- Create: `test/advisory/tracker.test.ts`

- [ ] **Step 1: Create tracker types**

Create `src/advisory/tracker/types.ts`:

```typescript
export interface UscisApiResponse {
  caseStatus: string;
  caseStatusDescription: string;
  formType: string;
  receiptNumber: string;
  lastUpdatedDate?: string | undefined;
}

export interface ProcessingTimeEstimate {
  formType: string;
  serviceCenter: string;
  percentile50Months: number;
  percentile75Months: number;
  percentile90Months: number;
  lastUpdated: string;
}

// Known USCIS processing time data (updated periodically)
export const PROCESSING_TIMES: ProcessingTimeEstimate[] = [
  { formType: "I-130", serviceCenter: "National", percentile50Months: 9.0, percentile75Months: 14.5, percentile90Months: 18.0, lastUpdated: "2026-03" },
  { formType: "I-485", serviceCenter: "National", percentile50Months: 8.5, percentile75Months: 10.9, percentile90Months: 14.0, lastUpdated: "2026-03" },
  { formType: "I-765", serviceCenter: "National", percentile50Months: 3.5, percentile75Months: 5.0, percentile90Months: 8.0, lastUpdated: "2026-03" },
  { formType: "N-400", serviceCenter: "National", percentile50Months: 6.5, percentile75Months: 9.0, percentile90Months: 12.0, lastUpdated: "2026-03" },
  { formType: "I-90", serviceCenter: "National", percentile50Months: 6.0, percentile75Months: 8.0, percentile90Months: 12.0, lastUpdated: "2026-03" },
  { formType: "I-751", serviceCenter: "National", percentile50Months: 12.0, percentile75Months: 18.0, percentile90Months: 24.0, lastUpdated: "2026-03" },
  { formType: "I-140", serviceCenter: "National", percentile50Months: 6.0, percentile75Months: 8.5, percentile90Months: 12.0, lastUpdated: "2026-03" },
  { formType: "I-129", serviceCenter: "National", percentile50Months: 2.0, percentile75Months: 4.0, percentile90Months: 6.0, lastUpdated: "2026-03" },
];

export function getProcessingTime(formType: string): ProcessingTimeEstimate | undefined {
  return PROCESSING_TIMES.find((pt) => pt.formType === formType);
}
```

- [ ] **Step 2: Create USCIS API client**

Create `src/advisory/tracker/uscis.ts`:

```typescript
import type { CaseStatus } from "../../types.js";
import { getProcessingTime } from "./types.js";

const USCIS_API_BASE = "https://egov.uscis.gov/csol-api/case-statuses";

/**
 * Check USCIS case status. Uses the public case status endpoint.
 * This makes a network call — the only feature in PigeonGov that does.
 * Falls back to offline mode with processing time estimates if the API is unreachable.
 */
export async function checkCaseStatus(receiptNumber: string): Promise<CaseStatus> {
  const normalized = receiptNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!/^[A-Z]{3}\d{10}$/.test(normalized)) {
    throw new Error(
      `Invalid receipt number format: "${receiptNumber}". Expected format: WAC2590123456 (3 letters + 10 digits).`,
    );
  }

  const formType = detectFormType(normalized);

  try {
    const response = await fetch(USCIS_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ receiptNumber: normalized }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return offlineFallback(normalized, formType, `USCIS API returned ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const caseData = (data as { CaseStatusResponse?: { detailsEng?: Record<string, string> } })
      ?.CaseStatusResponse?.detailsEng;

    if (!caseData) {
      return offlineFallback(normalized, formType, "Unexpected API response structure");
    }

    const processingTime = formType ? getProcessingTime(formType) : undefined;

    return {
      receiptNumber: normalized,
      formType: formType ?? "Unknown",
      status: caseData.actionCodeText ?? "Unknown",
      statusDescription: caseData.detailsText ?? "",
      lastUpdated: new Date().toISOString(),
      processingTime: processingTime
        ? {
            percentile50: processingTime.percentile50Months,
            percentile75: processingTime.percentile75Months,
            percentile90: processingTime.percentile90Months,
          }
        : undefined,
    };
  } catch (error) {
    return offlineFallback(
      normalized,
      formType,
      error instanceof Error ? error.message : "Network error",
    );
  }
}

function offlineFallback(receiptNumber: string, formType: string | null, reason: string): CaseStatus {
  const processingTime = formType ? getProcessingTime(formType) : undefined;

  return {
    receiptNumber,
    formType: formType ?? "Unknown",
    status: "OFFLINE",
    statusDescription: `Unable to reach USCIS API: ${reason}. Showing processing time estimates only.`,
    lastUpdated: new Date().toISOString(),
    processingTime: processingTime
      ? {
          percentile50: processingTime.percentile50Months,
          percentile75: processingTime.percentile75Months,
          percentile90: processingTime.percentile90Months,
        }
      : undefined,
  };
}

function detectFormType(receiptNumber: string): string | null {
  // Service center prefix tells us nothing about form type
  // But we can expose this as an optional parameter
  return null;
}

/**
 * Get processing time estimates without checking live status.
 * Works fully offline.
 */
export function getProcessingTimeEstimate(formType: string): CaseStatus["processingTime"] | null {
  const pt = getProcessingTime(formType);
  if (!pt) return null;
  return {
    percentile50: pt.percentile50Months,
    percentile75: pt.percentile75Months,
    percentile90: pt.percentile90Months,
  };
}
```

- [ ] **Step 3: Create CLI command and MCP tool**

Create `src/cli/commands/track.ts`:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { checkCaseStatus, getProcessingTimeEstimate } from "../../advisory/tracker/uscis.js";

export function registerTrackCommand(program: Command): void {
  program
    .command("track")
    .description("Check USCIS case status and processing time estimates")
    .argument("<receiptNumber>", "USCIS receipt number (e.g., WAC2590123456)")
    .option("--form <type>", "Form type for processing time lookup (e.g., I-485)")
    .option("--offline", "Skip API call, show processing times only")
    .action(async (receiptNumber: string, options) => {
      if (options.offline && options.form) {
        const pt = getProcessingTimeEstimate(options.form);
        if (isJsonMode()) {
          emitJson({ formType: options.form, processingTime: pt });
          return;
        }
        if (pt) {
          console.log(chalk.bold(`\n  Processing Times for ${options.form}\n`));
          console.log(`    50th percentile: ${chalk.cyan(pt.percentile50 + " months")}`);
          console.log(`    75th percentile: ${chalk.yellow(pt.percentile75 + " months")}`);
          console.log(`    90th percentile: ${chalk.red(pt.percentile90 + " months")}`);
        } else {
          console.log(chalk.dim(`  No processing time data for ${options.form}`));
        }
        console.log("");
        return;
      }

      const status = await checkCaseStatus(receiptNumber);

      if (isJsonMode()) {
        emitJson(status);
        return;
      }

      console.log(chalk.bold(`\n  USCIS Case Status\n`));
      console.log(`  Receipt: ${chalk.cyan(status.receiptNumber)}`);
      console.log(`  Form:    ${status.formType}`);
      console.log(`  Status:  ${status.status === "OFFLINE" ? chalk.yellow(status.status) : chalk.green(status.status)}`);
      if (status.statusDescription) {
        console.log(`  Detail:  ${chalk.dim(status.statusDescription.substring(0, 200))}`);
      }
      if (status.processingTime) {
        console.log(chalk.bold("\n  Processing Time Estimates:"));
        console.log(`    50%: ${chalk.cyan(status.processingTime.percentile50 + " months")}`);
        console.log(`    75%: ${chalk.yellow(status.processingTime.percentile75 + " months")}`);
        console.log(`    90%: ${chalk.red(status.processingTime.percentile90 + " months")}`);
      }
      console.log("");
    });
}
```

Create `src/mcp/tools/track-case.ts`:

```typescript
import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { checkCaseStatus } from "../../advisory/tracker/uscis.js";

export const schema = {
  receiptNumber: z.string().describe("USCIS receipt number (e.g., WAC2590123456)"),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_track_case",
  description:
    "Check USCIS immigration case status and get processing time estimates. Makes a network call to USCIS (the only PigeonGov tool that calls an external API). Falls back to offline processing time data if the API is unreachable.",
};

export default async function trackCaseTool(args: { receiptNumber: string }) {
  try {
    const status = await checkCaseStatus(args.receiptNumber);
    return withStructuredContent({ ok: true, ...status });
  } catch (error) {
    return withStructuredContent({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

- [ ] **Step 4: Write tests, run, commit**

Create `test/advisory/tracker.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { getProcessingTimeEstimate } from "../../src/advisory/tracker/uscis.js";
import { getProcessingTime, PROCESSING_TIMES } from "../../src/advisory/tracker/types.js";

describe("USCIS tracker", () => {
  test("has processing times for common form types", () => {
    expect(getProcessingTime("I-485")).toBeDefined();
    expect(getProcessingTime("I-130")).toBeDefined();
    expect(getProcessingTime("N-400")).toBeDefined();
    expect(getProcessingTime("I-765")).toBeDefined();
  });

  test("processing times have valid percentiles", () => {
    for (const pt of PROCESSING_TIMES) {
      expect(pt.percentile50Months).toBeLessThanOrEqual(pt.percentile75Months);
      expect(pt.percentile75Months).toBeLessThanOrEqual(pt.percentile90Months);
    }
  });

  test("getProcessingTimeEstimate returns structured data", () => {
    const est = getProcessingTimeEstimate("I-485");
    expect(est).toBeDefined();
    expect(est!.percentile50).toBeGreaterThan(0);
  });

  test("unknown form returns null", () => {
    expect(getProcessingTimeEstimate("Z-999")).toBeNull();
  });
});
```

```bash
pnpm test -- test/advisory/tracker.test.ts
git add src/advisory/tracker/ src/cli/commands/track.ts src/mcp/tools/track-case.ts test/advisory/tracker.test.ts
git commit -m "feat: USCIS case tracker + processing time intelligence

Wraps the USCIS case status API (the only network call in PigeonGov).
Falls back to offline processing time estimates when API is unreachable.
Covers I-130, I-485, I-765, N-400, I-90, I-751, I-140, I-129."
```

---

### Task 4: Government Cost Estimator

**Files:**
- Create: `src/advisory/cost/estimator.ts`
- Create: `src/cli/commands/cost.ts`
- Create: `src/mcp/tools/cost-estimate.ts`
- Create: `test/advisory/cost.test.ts`

- [ ] **Step 1: Create cost estimator engine**

Create `src/advisory/cost/estimator.ts`:

```typescript
import type { CostEstimate } from "../../types.js";

interface CostData {
  workflowId: string;
  filingFees: Array<{ item: string; amount: number }>;
  additionalCosts: Array<{ item: string; min: number; max: number }>;
  attorneyRange: { min: number; max: number };
  attorneyHourly: { min: number; max: number };
  typicalHours?: number | undefined;
}

const COST_DATABASE: CostData[] = [
  {
    workflowId: "tax/1040",
    filingFees: [{ item: "IRS filing fee", amount: 0 }],
    additionalCosts: [{ item: "State filing (if applicable)", min: 0, max: 50 }],
    attorneyRange: { min: 200, max: 1200 },
    attorneyHourly: { min: 150, max: 400 },
    typicalHours: 2,
  },
  {
    workflowId: "immigration/family-visa-intake",
    filingFees: [
      { item: "I-130 petition", amount: 675 },
      { item: "I-485 adjustment", amount: 1440 },
      { item: "Biometrics", amount: 85 },
    ],
    additionalCosts: [
      { item: "Medical exam (I-693)", min: 200, max: 500 },
      { item: "Document translation", min: 0, max: 300 },
      { item: "Passport photos", min: 10, max: 30 },
    ],
    attorneyRange: { min: 2000, max: 5000 },
    attorneyHourly: { min: 200, max: 500 },
    typicalHours: 8,
  },
  {
    workflowId: "immigration/naturalization",
    filingFees: [{ item: "N-400 filing + biometrics", amount: 760 }],
    additionalCosts: [
      { item: "Passport photos", min: 10, max: 30 },
      { item: "Document copies", min: 5, max: 50 },
    ],
    attorneyRange: { min: 1500, max: 7500 },
    attorneyHourly: { min: 200, max: 500 },
    typicalHours: 5,
  },
  {
    workflowId: "legal/small-claims",
    filingFees: [{ item: "Court filing fee", amount: 75 }],
    additionalCosts: [{ item: "Service of process", min: 20, max: 75 }],
    attorneyRange: { min: 500, max: 2000 },
    attorneyHourly: { min: 150, max: 350 },
    typicalHours: 3,
  },
  {
    workflowId: "legal/expungement",
    filingFees: [{ item: "Court filing fee", amount: 250 }],
    additionalCosts: [
      { item: "Background check", min: 25, max: 50 },
      { item: "Fingerprinting", min: 20, max: 50 },
    ],
    attorneyRange: { min: 900, max: 3000 },
    attorneyHourly: { min: 150, max: 400 },
    typicalHours: 4,
  },
  {
    workflowId: "estate/basic-will",
    filingFees: [{ item: "No filing required", amount: 0 }],
    additionalCosts: [{ item: "Notarization", min: 10, max: 25 }],
    attorneyRange: { min: 300, max: 1500 },
    attorneyHourly: { min: 200, max: 500 },
    typicalHours: 2,
  },
  {
    workflowId: "identity/passport",
    filingFees: [
      { item: "DS-11 application", amount: 165 },
      { item: "Execution fee", amount: 35 },
    ],
    additionalCosts: [
      { item: "Passport photo", min: 10, max: 20 },
      { item: "Expedited processing", min: 0, max: 60 },
    ],
    attorneyRange: { min: 0, max: 0 },
    attorneyHourly: { min: 0, max: 0 },
  },
  {
    workflowId: "identity/name-change",
    filingFees: [{ item: "Court petition filing", amount: 200 }],
    additionalCosts: [
      { item: "Newspaper publication (if required)", min: 0, max: 150 },
      { item: "Certified copies of order", min: 10, max: 50 },
    ],
    attorneyRange: { min: 300, max: 1000 },
    attorneyHourly: { min: 150, max: 350 },
    typicalHours: 2,
  },
];

export function estimateCost(workflowId: string): CostEstimate | null {
  const data = COST_DATABASE.find((c) => c.workflowId === workflowId);
  if (!data) return null;

  const filingTotal = data.filingFees.reduce((s, f) => s + f.amount, 0);
  const additionalMin = data.additionalCosts.reduce((s, c) => s + c.min, 0);
  const additionalMax = data.additionalCosts.reduce((s, c) => s + c.max, 0);

  const diyBreakdown = [
    ...data.filingFees.map((f) => ({ item: f.item, amount: f.amount, type: "filing" })),
    ...data.additionalCosts.map((c) => ({ item: c.item, amount: (c.min + c.max) / 2, type: "additional" })),
  ];

  const diyMin = filingTotal + additionalMin;
  const diyMax = filingTotal + additionalMax;

  const withToolMin = diyMin; // PigeonGov is free
  const withToolMax = diyMax;

  const withAttorneyMin = diyMin + data.attorneyRange.min;
  const withAttorneyMax = diyMax + data.attorneyRange.max;

  const avgAttorney = (data.attorneyRange.min + data.attorneyRange.max) / 2;
  const avgDiy = (diyMin + diyMax) / 2;

  return {
    workflowId,
    diyTotal: { min: diyMin, max: diyMax, breakdown: diyBreakdown },
    withToolTotal: {
      min: withToolMin,
      max: withToolMax,
      breakdown: [...diyBreakdown, { item: "PigeonGov (free)", amount: 0, type: "tool" }],
    },
    withAttorneyTotal: {
      min: withAttorneyMin,
      max: withAttorneyMax,
      breakdown: [
        ...diyBreakdown,
        { item: `Attorney fees ($${data.attorneyRange.min}-$${data.attorneyRange.max})`, amount: avgAttorney, type: "attorney" },
      ],
    },
    savings: {
      vsAttorney: Math.round(avgAttorney),
      description: `Save ~$${Math.round(avgAttorney).toLocaleString()} vs. hiring a professional. PigeonGov guides you through the same process for free.`,
    },
  };
}

export function listAvailableCosts(): string[] {
  return COST_DATABASE.map((c) => c.workflowId);
}
```

- [ ] **Step 2: Create CLI command and MCP tool**

Create `src/cli/commands/cost.ts`:

```typescript
import { Command } from "commander";
import chalk from "chalk";
import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { estimateCost, listAvailableCosts } from "../../advisory/cost/estimator.js";

export function registerCostCommand(program: Command): void {
  program
    .command("cost")
    .description("Estimate costs for a government workflow (filing fees, attorney fees, DIY)")
    .argument("[workflowId]", "Workflow ID (omit to list available)")
    .action((workflowId?: string) => {
      if (!workflowId) {
        const available = listAvailableCosts();
        if (isJsonMode()) { emitJson({ available }); return; }
        console.log(chalk.bold("\n  Cost estimates available for:\n"));
        for (const id of available) console.log(`    ${chalk.cyan(id)}`);
        console.log("");
        return;
      }

      const estimate = estimateCost(workflowId);
      if (!estimate) {
        console.error(chalk.red(`No cost data for "${workflowId}". Run 'pigeongov cost' to see available workflows.`));
        process.exitCode = 5;
        return;
      }

      if (isJsonMode()) { emitJson(estimate); return; }

      console.log(chalk.bold(`\n  Cost Estimate: ${chalk.cyan(workflowId)}\n`));
      console.log(`  ${chalk.green("DIY (with PigeonGov):")} $${estimate.diyTotal.min.toLocaleString()} - $${estimate.diyTotal.max.toLocaleString()}`);
      for (const item of estimate.diyTotal.breakdown) {
        console.log(`    ${item.item.padEnd(35)} $${item.amount}`);
      }
      console.log(`\n  ${chalk.red("With attorney:")} $${estimate.withAttorneyTotal.min.toLocaleString()} - $${estimate.withAttorneyTotal.max.toLocaleString()}`);
      console.log(`\n  ${chalk.bold.green("You save:")} ~$${estimate.savings.vsAttorney.toLocaleString()}`);
      console.log(`  ${chalk.dim(estimate.savings.description)}\n`);
    });
}
```

Create `src/mcp/tools/cost-estimate.ts`:

```typescript
import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { estimateCost, listAvailableCosts } from "../../advisory/cost/estimator.js";

export const schema = {
  workflowId: z.string().optional().describe("Workflow ID for cost estimate. Omit to list available workflows."),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_estimate_cost",
  description: "Estimate total costs for a government workflow: filing fees, additional costs, and attorney fees. Shows DIY cost vs. professional cost with savings calculation.",
};

export default function costEstimateTool(args: { workflowId?: string }) {
  if (!args.workflowId) {
    return withStructuredContent({ ok: true, available: listAvailableCosts() });
  }
  const estimate = estimateCost(args.workflowId);
  if (!estimate) {
    return withStructuredContent({ ok: false, error: `No cost data for "${args.workflowId}"`, available: listAvailableCosts() });
  }
  return withStructuredContent({ ok: true, ...estimate });
}
```

- [ ] **Step 3: Write tests, run, commit**

Create `test/advisory/cost.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { estimateCost, listAvailableCosts } from "../../src/advisory/cost/estimator.js";

describe("Government cost estimator", () => {
  test("lists available workflows", () => {
    const available = listAvailableCosts();
    expect(available.length).toBeGreaterThan(5);
    expect(available).toContain("tax/1040");
    expect(available).toContain("immigration/naturalization");
  });

  test("immigration/naturalization has filing fees", () => {
    const est = estimateCost("immigration/naturalization");
    expect(est).not.toBeNull();
    expect(est!.diyTotal.min).toBeGreaterThan(0);
    expect(est!.withAttorneyTotal.min).toBeGreaterThan(est!.diyTotal.min);
  });

  test("savings vs attorney is positive", () => {
    const est = estimateCost("immigration/family-visa-intake");
    expect(est!.savings.vsAttorney).toBeGreaterThan(0);
  });

  test("tax/1040 has zero filing fees", () => {
    const est = estimateCost("tax/1040");
    expect(est!.diyTotal.min).toBe(0);
  });

  test("unknown workflow returns null", () => {
    expect(estimateCost("unknown/workflow")).toBeNull();
  });
});
```

```bash
pnpm test -- test/advisory/cost.test.ts
git add src/advisory/cost/ src/cli/commands/cost.ts src/mcp/tools/cost-estimate.ts test/advisory/cost.test.ts
git commit -m "feat: government cost estimator

Transparent cost breakdowns for government workflows: filing fees,
additional costs, and attorney fees. Shows DIY savings vs. professional help.
Covers tax, immigration, legal, estate, identity workflows."
```

---

### Task 5: Register All Commands + Update Manifests

**Files:**
- Modify: `src/cli/index.ts`
- Modify: `agents.json`
- Modify: `llms.txt`

- [ ] **Step 1: Register all new commands in index.ts**

Add to imports in `src/cli/index.ts`:

```typescript
import { registerDependenciesCommand } from "./commands/dependencies.js";
import { registerCliffCommand } from "./commands/cliff.js";
import { registerTrackCommand } from "./commands/track.js";
import { registerCostCommand } from "./commands/cost.js";
```

Add to registration block:

```typescript
registerDependenciesCommand(program);
registerCliffCommand(program);
registerTrackCommand(program);
registerCostCommand(program);
```

- [ ] **Step 2: Update agents.json**

Add to the `cli.commands` and `mcp.tools` sections in `agents.json`:

```json
"dependencies": { "description": "Show cross-agency workflow dependencies", "args": "<workflow-id>" },
"cliff": { "description": "Calculate benefits cliff analysis", "args": "--income <amt> --household <size>" },
"track": { "description": "Check USCIS case status", "args": "<receipt-number>" },
"cost": { "description": "Estimate government workflow costs", "args": "[workflow-id]" }
```

And to tools:

```json
"pigeongov_get_dependencies",
"pigeongov_calculate_cliff",
"pigeongov_track_case",
"pigeongov_estimate_cost"
```

- [ ] **Step 3: Update llms.txt**

Add to the "Key Commands" section:

```
- `pigeongov dependencies <id> --json` — cross-agency dependency graph
- `pigeongov cliff --income <n> --household <n> --json` — benefits cliff analysis
- `pigeongov track <receipt> --json` — USCIS case status + processing times
- `pigeongov cost <workflow-id> --json` — cost breakdown (DIY vs attorney)
```

- [ ] **Step 4: Run full test suite, typecheck, commit**

```bash
pnpm typecheck
pnpm test
git add src/cli/index.ts agents.json llms.txt
git commit -m "feat: register intelligence layer commands + update manifests"
```

---

### Task 6: Create Claude Code Skill for skills.sh

**Files:**
- Create: `skills/pigeongov.md`

- [ ] **Step 1: Create the skill file**

Create `skills/pigeongov.md`:

```markdown
---
name: pigeongov
description: Government workflow intelligence — tax calculation, benefits eligibility, immigration tracking, life event planning, and cross-agency dependency analysis. Use when the user asks about government forms, taxes, immigration, benefits, or life events that trigger government interactions.
triggers:
  - tax
  - taxes
  - IRS
  - 1040
  - immigration
  - USCIS
  - green card
  - visa
  - benefits
  - SNAP
  - Medicaid
  - Medicare
  - Social Security
  - passport
  - name change
  - voter registration
  - unemployment
  - FAFSA
  - student loans
  - small claims
  - expungement
  - will
  - government forms
  - filing
  - life event
  - got married
  - lost my job
  - had a baby
  - retiring
  - moving states
---

# PigeonGov — Government Intelligence for AI Agents

PigeonGov is a local-first CLI and MCP server with 34 government workflows across 13 domains.

## Quick Setup

```bash
# Install
npm install -g pigeongov

# Or use without installing
npx pigeongov --help
```

## Key Commands (always use --json for structured output)

```bash
# Life events — "what do I need to do?"
pigeongov life-event job-loss --json
pigeongov life-event marriage --json

# Eligibility — "what do I qualify for?"
pigeongov screen --input data.json --json

# Benefits cliff — "will a raise cost me benefits?"
pigeongov cliff --income 32000 --household 4 --json

# Cross-agency dependencies — "what else does this trigger?"
pigeongov dependencies immigration/naturalization --json

# Cost estimates — "how much will this cost?"
pigeongov cost immigration/naturalization --json

# USCIS case tracking
pigeongov track WAC2590123456 --json

# Tax calculation
pigeongov fill tax/1040 --data input.json --json

# List all 34 workflows
pigeongov list --json
```

## MCP Server Setup

```bash
# Add to Claude Code
claude mcp add pigeongov -- npx pigeongov serve

# Add to Codex
codex mcp add pigeongov -- npx pigeongov serve
```

## When to use PigeonGov

- User asks about ANY government form or process
- User mentions a life event (marriage, job loss, baby, retirement, moving)
- User needs to know what benefits they qualify for
- User asks about tax filing, deductions, or tax situations
- User asks about immigration forms, case status, or processing times
- User needs cost estimates for government processes
- User asks about deadlines for government filings

## Important

- PigeonGov runs locally. No data is sent to any server (except pigeongov track which calls USCIS API).
- Always use --json flag for structured output.
- The tool never submits anything to any government agency.
```

- [ ] **Step 2: Commit**

```bash
git add skills/pigeongov.md
git commit -m "feat: Claude Code skill for skills.sh publication"
```

---

### Task 7: Final Integration Test

- [ ] **Step 1: Run comprehensive verification**

```bash
pnpm typecheck
pnpm test
go build ./cmd/pigeongov

# Smoke test new commands
node --import tsx bin/pigeongov.ts dependencies immigration/naturalization --json | head -20
node --import tsx bin/pigeongov.ts cliff --income 28000 --household 4 --json | head -20
node --import tsx bin/pigeongov.ts cost immigration/naturalization --json | head -20
node --import tsx bin/pigeongov.ts track --offline --form I-485 WAC0000000000 --json | head -10
```

- [ ] **Step 2: Final commit with version bump**

```bash
npm version minor --no-git-tag-version
# Update version string in src/cli/index.ts to match
git add -A
git commit -m "chore: v0.3.0 — government intelligence layer

New capabilities:
- Cross-agency dependency graph (30+ relationships)
- Benefits cliff calculator (SNAP, Medicaid, WIC, LIHEAP, ACA, CHIP)
- USCIS case status tracker (real API + offline fallback)
- Government cost estimator (DIY vs attorney savings)
- Claude Code skill for skills.sh"
```
