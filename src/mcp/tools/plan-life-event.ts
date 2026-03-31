import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { planLifeEvent, listLifeEvents } from "../../advisory/life-events/planner.js";

export const schema = {
  eventId: z.string().optional().describe("Life event ID (e.g., 'job-loss', 'marriage'). Omit to list all events."),
  eventDate: z.string().optional().describe("ISO date (YYYY-MM-DD) when the event occurred. When provided, returns computed deadlines with concrete dates and urgency status."),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_plan_life_event",
  description:
    "Get a prioritized action plan for a life event. Returns ordered workflow recommendations with deadlines, dependencies, and phase groupings. Provide eventDate for computed deadline dates with urgency indicators. Omit eventId to list available life events. Supports 20 life events including job-loss, death-of-spouse (30+ workflow deep cascade), marriage, divorce, new-baby, and more.",
};

export default function planLifeEventTool(args: { eventId?: string; eventDate?: string }) {
  if (!args.eventId) {
    const events = listLifeEvents().map((e) => ({
      id: e.id,
      label: e.label,
      description: e.description,
      workflowCount: e.workflows.length,
    }));
    return withStructuredContent({ ok: true, events });
  }

  const plan = planLifeEvent(args.eventId, args.eventDate);
  if (!plan) {
    return withStructuredContent({
      ok: false,
      error: `Unknown life event: "${args.eventId}"`,
      availableEvents: listLifeEvents().map((e) => e.id),
    });
  }

  return withStructuredContent({
    ok: true,
    event: {
      id: plan.event.id,
      label: plan.event.label,
      description: plan.event.description,
    },
    totalWorkflows: plan.totalWorkflows,
    hasUrgentDeadlines: plan.hasUrgentDeadlines,
    estimatedHours: plan.estimatedHours,
    workflows: plan.orderedWorkflows.map((w) => ({
      workflowId: w.workflowId,
      priority: w.priority,
      deadline: w.deadline,
      notes: w.notes,
      dependsOn: w.dependsOn,
      phase: w.phase,
      phaseLabel: w.phaseLabel,
      computedDeadline: w.computedDeadline
        ? {
            computedDate: w.computedDeadline.computedDate,
            daysRemaining: w.computedDeadline.daysRemaining,
            status: w.computedDeadline.status,
            isHardDeadline: w.computedDeadline.isHardDeadline,
            consequence: w.computedDeadline.consequence,
          }
        : undefined,
    })),
    ...(plan.computedDeadlines
      ? {
          deadlineSummary: {
            total: plan.computedDeadlines.length,
            overdue: plan.computedDeadlines.filter((d) => d.status === "overdue").length,
            urgent: plan.computedDeadlines.filter((d) => d.status === "urgent").length,
            hardDeadlines: plan.computedDeadlines.filter((d) => d.isHardDeadline).length,
            nextDeadline: plan.computedDeadlines[0]
              ? {
                  workflowId: plan.computedDeadlines[0].workflowId,
                  date: plan.computedDeadlines[0].computedDate,
                  daysRemaining: plan.computedDeadlines[0].daysRemaining,
                  label: plan.computedDeadlines[0].label,
                }
              : undefined,
          },
        }
      : {}),
    ...(plan.dependencies
      ? {
          dependencies: plan.dependencies.map((d) => ({
            workflowId: d.workflowId,
            dependsOn: d.dependsOn,
            reason: d.reason,
          })),
        }
      : {}),
  });
}
