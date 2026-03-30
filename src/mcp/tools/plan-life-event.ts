import { z } from "zod";
import type { ToolMetadata } from "xmcp";
import { withStructuredContent } from "../result.js";
import { planLifeEvent, listLifeEvents } from "../../advisory/life-events/planner.js";

export const schema = {
  eventId: z.string().optional().describe("Life event ID (e.g., 'job-loss', 'marriage'). Omit to list all events."),
};

export const metadata: ToolMetadata = {
  name: "pigeongov_plan_life_event",
  description:
    "Get a prioritized action plan for a life event. Returns ordered workflow recommendations with deadlines and dependencies. Omit eventId to list available life events.",
};

export default function planLifeEventTool(args: { eventId?: string }) {
  if (!args.eventId) {
    const events = listLifeEvents().map((e) => ({
      id: e.id,
      label: e.label,
      description: e.description,
      workflowCount: e.workflows.length,
    }));
    return withStructuredContent({ ok: true, events });
  }

  const plan = planLifeEvent(args.eventId);
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
    workflows: plan.orderedWorkflows,
  });
}
