/**
 * Dependency ordering for life-event workflow cascades.
 *
 * Government paperwork has an infuriating property: things must happen in a
 * specific order, but nobody tells you what that order is until you've already
 * done step 3 before step 1 and are now starting over. This module encodes
 * those orderings so you don't have to learn them the hard way.
 */

export interface CascadeDependency {
  workflowId: string;
  dependsOn: string[];
  reason: string;
}

// ── global ordering rules ───────────────────────────────────────────────────
// These apply regardless of which life event triggered the cascade.

const GLOBAL_DEPENDENCIES: CascadeDependency[] = [
  // Identity cascade: court order → SSA → DMV → passport → everything else
  {
    workflowId: "identity/real-id",
    dependsOn: ["identity/name-change"],
    reason: "DMV requires SSA name change to be complete first — SSA card is primary evidence",
  },
  {
    workflowId: "identity/passport",
    dependsOn: ["identity/name-change"],
    reason: "Passport Office requires SSA-issued card with new name as supporting document",
  },
  {
    workflowId: "identity/voter-registration",
    dependsOn: ["identity/name-change"],
    reason: "Voter registration must match current legal name on file with SSA",
  },

  // Tax depends on identity being settled
  {
    workflowId: "tax/1040",
    dependsOn: ["identity/name-change"],
    reason: "IRS e-file rejects returns where name doesn't match SSA records",
  },

  // Benefits depend on unemployment filing for income verification
  {
    workflowId: "benefits/snap",
    dependsOn: ["unemployment/claim-intake"],
    reason: "Unemployment income documentation needed for SNAP income verification",
  },
  {
    workflowId: "benefits/medicaid",
    dependsOn: ["unemployment/claim-intake"],
    reason: "Unemployment determination establishes income level for Medicaid eligibility",
  },

  // Healthcare depends on qualifying event being established
  {
    workflowId: "healthcare/aca-enrollment",
    dependsOn: [],
    reason: "ACA enrollment requires proof of qualifying life event — gather documentation first",
  },

  // Estate planning chain
  {
    workflowId: "estate/power-of-attorney",
    dependsOn: [],
    reason: "POA should be established early — capacity may diminish",
  },
  {
    workflowId: "estate/advance-directive",
    dependsOn: [],
    reason: "Healthcare directive should be established early — capacity may diminish",
  },

  // Immigration chains
  {
    workflowId: "immigration/family-visa-intake",
    dependsOn: ["identity/name-change"],
    reason: "Petition must use current legal name matching SSA and passport",
  },

  // Education depends on income being determined
  {
    workflowId: "education/fafsa",
    dependsOn: ["tax/1040"],
    reason: "FAFSA requires prior-year tax information for income verification",
  },
  {
    workflowId: "education/student-loan-repayment",
    dependsOn: ["tax/1040"],
    reason: "IDR recalculation requires current AGI from tax return",
  },
];

// ── event-specific ordering overrides ───────────────────────────────────────
// Some events create ordering constraints that don't apply globally.

const EVENT_SPECIFIC_DEPENDENCIES: Record<string, CascadeDependency[]> = {
  "death-of-spouse": [
    {
      workflowId: "estate/basic-will",
      dependsOn: ["retirement/ssa-estimator"],
      reason: "SSA notification must happen first — death certificate needed; survivor benefits establish baseline income for estate planning",
    },
    {
      workflowId: "tax/1040",
      dependsOn: ["retirement/ssa-estimator"],
      reason: "Need SSA survivor benefit amount to accurately report income on final joint return",
    },
    {
      workflowId: "healthcare/aca-enrollment",
      dependsOn: ["retirement/ssa-estimator"],
      reason: "Survivor benefit amount affects APTC calculation for marketplace enrollment",
    },
    {
      workflowId: "benefits/ssdi-application",
      dependsOn: ["retirement/ssa-estimator"],
      reason: "SSA processes survivor and disability claims together — file survivor claim first",
    },
    {
      workflowId: "identity/name-change",
      dependsOn: ["estate/basic-will"],
      reason: "Probate may affect property titles — complete estate administration first",
    },
  ],

  marriage: [
    {
      workflowId: "healthcare/aca-enrollment",
      dependsOn: ["identity/name-change"],
      reason: "Health plan enrollment should use current legal name",
    },
    {
      workflowId: "immigration/family-visa-intake",
      dependsOn: ["identity/name-change"],
      reason: "Immigration petition requires consistent name across all documents",
    },
  ],

  divorce: [
    {
      workflowId: "identity/name-change",
      dependsOn: [],
      reason: "Divorce decree authorizes name change — no additional court order needed",
    },
    {
      workflowId: "estate/basic-will",
      dependsOn: ["legal/child-support-modification"],
      reason: "Child support order affects estate obligations — update will after support is finalized",
    },
    {
      workflowId: "retirement/ssa-estimator",
      dependsOn: ["legal/child-support-modification"],
      reason: "QDRO must be filed as part of divorce proceedings — coordinate with support order",
    },
  ],

  "job-loss": [
    {
      workflowId: "healthcare/aca-enrollment",
      dependsOn: ["unemployment/claim-intake"],
      reason: "Unemployment filing date establishes qualifying life event for ACA SEP",
    },
    {
      workflowId: "benefits/snap",
      dependsOn: ["unemployment/claim-intake"],
      reason: "Need unemployment determination letter for income verification",
    },
    {
      workflowId: "benefits/medicaid",
      dependsOn: ["unemployment/claim-intake"],
      reason: "Unemployment benefits amount determines Medicaid eligibility threshold",
    },
    {
      workflowId: "benefits/liheap",
      dependsOn: ["unemployment/claim-intake"],
      reason: "LIHEAP income verification requires unemployment documentation",
    },
  ],

  "new-baby": [
    {
      workflowId: "healthcare/aca-enrollment",
      dependsOn: ["identity/passport"],
      reason: "Need child's SSN to add to health insurance plan",
    },
    {
      workflowId: "tax/1040",
      dependsOn: ["identity/passport"],
      reason: "Cannot claim child as dependent without SSN on tax return",
    },
    {
      workflowId: "benefits/snap",
      dependsOn: ["identity/passport"],
      reason: "SSN required for household member on SNAP application",
    },
  ],

  retirement: [
    {
      workflowId: "healthcare/medicare-enrollment",
      dependsOn: ["retirement/ssa-estimator"],
      reason: "Medicare enrollment is often coordinated with Social Security claiming",
    },
    {
      workflowId: "tax/1040",
      dependsOn: ["retirement/ssa-estimator"],
      reason: "Need SS benefit amount to plan retirement income taxation",
    },
  ],

  "received-inheritance": [
    {
      workflowId: "benefits/snap",
      dependsOn: ["benefits/medicaid"],
      reason: "Report to Medicaid first — asset limit consequences are more severe (fraud vs. overpayment)",
    },
    {
      workflowId: "estate/basic-will",
      dependsOn: ["tax/1040"],
      reason: "Understand tax implications of inheritance before updating estate plan",
    },
  ],

  "arrested-or-convicted": [
    {
      workflowId: "legal/expungement",
      dependsOn: [],
      reason: "Expungement eligibility should be assessed early — waiting periods may apply from conviction date",
    },
    {
      workflowId: "identity/voter-registration",
      dependsOn: ["legal/expungement"],
      reason: "Voting rights restoration may depend on expungement or completion of sentence",
    },
    {
      workflowId: "education/fafsa",
      dependsOn: ["legal/expungement"],
      reason: "Expungement may restore FAFSA eligibility for drug-related convictions",
    },
  ],
};

// ── ordering engine ─────────────────────────────────────────────────────────

/**
 * Get all dependency rules applicable to a specific life event.
 * Merges global rules with event-specific overrides.
 */
export function getDependenciesForEvent(eventId: string, workflowIds: string[]): CascadeDependency[] {
  const workflowSet = new Set(workflowIds);
  const eventSpecific = EVENT_SPECIFIC_DEPENDENCIES[eventId] ?? [];

  // Event-specific deps override global deps for the same workflowId
  const overriddenWorkflows = new Set(eventSpecific.map((d) => d.workflowId));

  const merged: CascadeDependency[] = [];

  // Add global deps that aren't overridden (and are relevant to this event's workflows)
  for (const dep of GLOBAL_DEPENDENCIES) {
    if (workflowSet.has(dep.workflowId) && !overriddenWorkflows.has(dep.workflowId)) {
      // Filter dependsOn to only include workflows in this event
      const relevantDeps = dep.dependsOn.filter((d) => workflowSet.has(d));
      if (relevantDeps.length > 0 || dep.dependsOn.length === 0) {
        merged.push({ ...dep, dependsOn: relevantDeps });
      }
    }
  }

  // Add event-specific deps (filtering dependsOn to relevant workflows)
  for (const dep of eventSpecific) {
    if (workflowSet.has(dep.workflowId)) {
      const relevantDeps = dep.dependsOn.filter((d) => workflowSet.has(d));
      merged.push({ ...dep, dependsOn: relevantDeps });
    }
  }

  return merged;
}

/**
 * Topological sort of workflows respecting dependency ordering.
 * Returns workflows grouped into phases where all dependencies in prior phases
 * are satisfied.
 */
export function topologicalSort(workflowIds: string[], dependencies: CascadeDependency[]): string[][] {
  const depMap = new Map<string, Set<string>>();
  for (const wId of workflowIds) {
    depMap.set(wId, new Set());
  }
  for (const dep of dependencies) {
    const existing = depMap.get(dep.workflowId);
    if (existing) {
      for (const d of dep.dependsOn) {
        if (depMap.has(d)) {
          existing.add(d);
        }
      }
    }
  }

  const phases: string[][] = [];
  const placed = new Set<string>();
  let remaining = new Set(workflowIds);

  // Safety: max iterations = number of workflows (prevents infinite loops from cycles)
  let maxIterations = workflowIds.length;
  while (remaining.size > 0 && maxIterations > 0) {
    maxIterations--;
    const phase: string[] = [];

    for (const wId of remaining) {
      const deps = depMap.get(wId)!;
      const unmetDeps = [...deps].filter((d) => !placed.has(d));
      if (unmetDeps.length === 0) {
        phase.push(wId);
      }
    }

    // If no workflows could be placed, we have a cycle — break it by placing all remaining
    if (phase.length === 0) {
      phases.push([...remaining]);
      break;
    }

    phases.push(phase);
    for (const wId of phase) {
      placed.add(wId);
      remaining.delete(wId);
    }
  }

  return phases;
}

/**
 * Validate that dependency graph has no cycles.
 * Returns an array of cycle descriptions (empty = acyclic).
 */
export function detectCycles(workflowIds: string[], dependencies: CascadeDependency[]): string[] {
  const depMap = new Map<string, string[]>();
  for (const wId of workflowIds) {
    depMap.set(wId, []);
  }
  for (const dep of dependencies) {
    if (depMap.has(dep.workflowId)) {
      const relevantDeps = dep.dependsOn.filter((d) => depMap.has(d));
      depMap.set(dep.workflowId, [...(depMap.get(dep.workflowId) ?? []), ...relevantDeps]);
    }
  }

  const cycles: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      cycles.push(cycle.join(" → "));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of depMap.get(node) ?? []) {
      dfs(dep, [...path]);
    }

    inStack.delete(node);
  }

  for (const wId of workflowIds) {
    if (!visited.has(wId)) {
      dfs(wId, []);
    }
  }

  return cycles;
}

/**
 * Format dependency info for display.
 */
export function formatDependencyChain(deps: CascadeDependency[]): string {
  if (deps.length === 0) return "No ordering constraints — workflows can proceed in parallel.";

  const lines: string[] = ["Workflow ordering constraints:"];
  for (const dep of deps) {
    if (dep.dependsOn.length > 0) {
      lines.push(`  ${dep.dependsOn.join(", ")} → ${dep.workflowId}`);
      lines.push(`    ${dep.reason}`);
    }
  }
  return lines.join("\n");
}
