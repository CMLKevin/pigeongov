import type { LifeEvent, LifeEventWorkflow } from "../../types.js";
import { findLifeEvent, listLifeEvents } from "./events.js";
import { computeDeadlines, type ComputedDeadline } from "./deadlines.js";
import { getDependenciesForEvent, topologicalSort, detectCycles, type CascadeDependency } from "./ordering.js";

export interface LifeEventPlan {
  event: LifeEvent;
  orderedWorkflows: PlannedWorkflow[];
  totalWorkflows: number;
  hasUrgentDeadlines: boolean;
  /** Present when eventDate is provided */
  computedDeadlines?: ComputedDeadline[] | undefined;
  /** Dependency ordering constraints */
  dependencies?: CascadeDependency[] | undefined;
  /** Estimated total paperwork hours (rough) */
  estimatedHours?: number | undefined;
}

export interface PlannedWorkflow {
  workflowId: string;
  priority: number;
  deadline: string | undefined;
  notes: string;
  dependsOn: string[];
  phase: number;
  phaseLabel?: string | undefined;
  /** Computed deadline info when event date is provided */
  computedDeadline?: ComputedDeadline | undefined;
}

// ── phase label heuristics ──────────────────────────────────────────────────

function phaseLabel(phase: number, totalPhases: number): string {
  if (phase === 1) return "Immediate";
  if (phase === 2 && totalPhases <= 3) return "Soon";
  if (phase === 2) return "First Month";
  if (phase === totalPhases) return "Ongoing";
  return `Phase ${phase}`;
}

// ── estimated hours per workflow (very rough) ───────────────────────────────

const HOURS_BY_DOMAIN: Record<string, number> = {
  tax: 4,
  immigration: 8,
  healthcare: 2,
  unemployment: 1.5,
  business: 3,
  permits: 2,
  education: 2,
  retirement: 1.5,
  identity: 1,
  benefits: 1.5,
  veterans: 3,
  legal: 4,
  estate: 3,
};

function estimateHours(workflowId: string): number {
  const domain = workflowId.split("/")[0] ?? "";
  return HOURS_BY_DOMAIN[domain] ?? 2;
}

// ── core planner ────────────────────────────────────────────────────────────

export function planLifeEvent(eventId: string, eventDate?: string): LifeEventPlan | undefined {
  const event = findLifeEvent(eventId);
  if (!event) return undefined;

  // Gather dependency info
  const workflowIds = event.workflows.map((w) => w.workflowId);
  const eventDeps = getDependenciesForEvent(eventId, workflowIds);

  // Merge inline dependsOn from event definitions with computed dependencies
  const mergedDeps = mergeInlineDependencies(event.workflows, eventDeps);

  // Compute topological phases
  const phases = topologicalSort(workflowIds, mergedDeps);

  // Build workflow-to-phase map
  const workflowPhaseMap = new Map<string, number>();
  for (let i = 0; i < phases.length; i++) {
    for (const wId of phases[i]!) {
      workflowPhaseMap.set(wId, i + 1);
    }
  }

  // Compute deadlines if event date provided
  const deadlines = eventDate ? computeDeadlines(eventId, eventDate) : undefined;
  const deadlineMap = new Map<string, ComputedDeadline>();
  if (deadlines) {
    for (const dl of deadlines) {
      deadlineMap.set(dl.workflowId, dl);
    }
  }

  // Build dependency lookup (workflowId → dependsOn[])
  const depLookup = new Map<string, string[]>();
  for (const dep of mergedDeps) {
    const existing = depLookup.get(dep.workflowId) ?? [];
    depLookup.set(dep.workflowId, [...existing, ...dep.dependsOn]);
  }

  // Build planned workflows
  const totalPhases = phases.length;
  const orderedWorkflows: PlannedWorkflow[] = [];

  for (const workflow of event.workflows) {
    const phase = workflowPhaseMap.get(workflow.workflowId) ?? 1;
    const deps = [
      ...(workflow.dependsOn ?? []),
      ...(depLookup.get(workflow.workflowId) ?? []),
    ];
    // Deduplicate
    const uniqueDeps = [...new Set(deps)];

    orderedWorkflows.push({
      workflowId: workflow.workflowId,
      priority: workflow.priority,
      deadline: workflow.deadline,
      notes: workflow.notes,
      dependsOn: uniqueDeps,
      phase,
      phaseLabel: phaseLabel(phase, totalPhases),
      computedDeadline: deadlineMap.get(workflow.workflowId),
    });
  }

  // Sort by phase, then priority within phase
  orderedWorkflows.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    return a.priority - b.priority;
  });

  const hasUrgentDeadlines = deadlines
    ? deadlines.some((d) => d.status === "overdue" || d.status === "urgent")
    : orderedWorkflows.some((w) => w.deadline !== undefined && w.priority <= 2);

  const estimatedHours = orderedWorkflows.reduce(
    (sum, w) => sum + estimateHours(w.workflowId),
    0,
  );

  return {
    event,
    orderedWorkflows,
    totalWorkflows: orderedWorkflows.length,
    hasUrgentDeadlines,
    computedDeadlines: deadlines,
    dependencies: mergedDeps.length > 0 ? mergedDeps : undefined,
    estimatedHours,
  };
}

/**
 * Merge inline dependsOn from event workflow definitions with computed
 * dependency rules, deduplicating.
 */
function mergeInlineDependencies(
  workflows: LifeEventWorkflow[],
  eventDeps: CascadeDependency[],
): CascadeDependency[] {
  const merged = new Map<string, CascadeDependency>();

  // Start with computed deps
  for (const dep of eventDeps) {
    merged.set(dep.workflowId, dep);
  }

  // Add inline deps
  for (const wf of workflows) {
    if (wf.dependsOn && wf.dependsOn.length > 0) {
      const existing = merged.get(wf.workflowId);
      if (existing) {
        // Merge dependsOn arrays
        const allDeps = new Set([...existing.dependsOn, ...wf.dependsOn]);
        merged.set(wf.workflowId, { ...existing, dependsOn: [...allDeps] });
      } else {
        merged.set(wf.workflowId, {
          workflowId: wf.workflowId,
          dependsOn: wf.dependsOn,
          reason: "Defined in event workflow configuration",
        });
      }
    }
  }

  return [...merged.values()];
}

// ── formatting ──────────────────────────────────────────────────────────────

export function formatPlanSummary(plan: LifeEventPlan): string {
  const lines: string[] = [];
  lines.push(`Life Event: ${plan.event.label}`);
  lines.push(`${plan.event.description}`);
  lines.push("");
  lines.push(`Action Plan (${plan.totalWorkflows} workflows):`);

  if (plan.estimatedHours) {
    lines.push(`Estimated total paperwork time: ${plan.estimatedHours} hours`);
  }

  lines.push("");

  let currentPhase = 0;
  for (const workflow of plan.orderedWorkflows) {
    if (workflow.phase !== currentPhase) {
      currentPhase = workflow.phase;
      const label = workflow.phaseLabel ?? `Phase ${currentPhase}`;
      lines.push(`--- ${label} ---`);
    }

    const deadlineStr = workflow.computedDeadline
      ? ` [DEADLINE: ${workflow.computedDeadline.computedDate} — ${workflow.computedDeadline.status}]`
      : workflow.deadline ? ` [DEADLINE: ${workflow.deadline}]` : "";
    const priorityStr = workflow.priority <= 2 ? " (!)" : "";
    lines.push(`  ${workflow.workflowId}${priorityStr}${deadlineStr}`);
    lines.push(`    ${workflow.notes}`);
    if (workflow.dependsOn.length > 0) {
      lines.push(`    (after: ${workflow.dependsOn.join(", ")})`);
    }
  }

  if (plan.hasUrgentDeadlines) {
    lines.push("");
    lines.push("⚠ Some workflows have urgent deadlines — start immediately.");
  }

  return lines.join("\n");
}

export { listLifeEvents, findLifeEvent };
