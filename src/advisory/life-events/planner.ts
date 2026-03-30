import type { LifeEvent, LifeEventWorkflow } from "../../types.js";
import { findLifeEvent, listLifeEvents } from "./events.js";

export interface LifeEventPlan {
  event: LifeEvent;
  orderedWorkflows: PlannedWorkflow[];
  totalWorkflows: number;
  hasUrgentDeadlines: boolean;
}

export interface PlannedWorkflow {
  workflowId: string;
  priority: number;
  deadline: string | undefined;
  notes: string;
  dependsOn: string[];
  phase: number;
}

export function planLifeEvent(eventId: string): LifeEventPlan | undefined {
  const event = findLifeEvent(eventId);
  if (!event) return undefined;

  const orderedWorkflows = prioritizeWorkflows(event.workflows);
  const hasUrgentDeadlines = orderedWorkflows.some(
    (w) => w.deadline !== undefined && w.priority <= 2,
  );

  return {
    event,
    orderedWorkflows,
    totalWorkflows: orderedWorkflows.length,
    hasUrgentDeadlines,
  };
}

function prioritizeWorkflows(workflows: LifeEventWorkflow[]): PlannedWorkflow[] {
  const sorted = [...workflows].sort((a, b) => a.priority - b.priority);

  const phases = new Map<string, number>();
  const result: PlannedWorkflow[] = [];

  for (const workflow of sorted) {
    const deps = workflow.dependsOn ?? [];
    let phase = 1;

    for (const dep of deps) {
      const depPhase = phases.get(dep);
      if (depPhase !== undefined) {
        phase = Math.max(phase, depPhase + 1);
      }
    }

    phases.set(workflow.workflowId, phase);

    result.push({
      workflowId: workflow.workflowId,
      priority: workflow.priority,
      deadline: workflow.deadline,
      notes: workflow.notes,
      dependsOn: deps,
      phase,
    });
  }

  return result.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    return a.priority - b.priority;
  });
}

export function formatPlanSummary(plan: LifeEventPlan): string {
  const lines: string[] = [];
  lines.push(`Life Event: ${plan.event.label}`);
  lines.push(`${plan.event.description}`);
  lines.push("");
  lines.push(`Action Plan (${plan.totalWorkflows} workflows):`);
  lines.push("");

  let currentPhase = 0;
  for (const workflow of plan.orderedWorkflows) {
    if (workflow.phase !== currentPhase) {
      currentPhase = workflow.phase;
      lines.push(`--- Phase ${currentPhase} ---`);
    }

    const deadlineStr = workflow.deadline ? ` [DEADLINE: ${workflow.deadline}]` : "";
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
