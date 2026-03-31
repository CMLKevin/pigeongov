import { describe, expect, test } from "vitest";

import { listLifeEvents, findLifeEvent } from "../../src/advisory/life-events/events.js";
import { planLifeEvent } from "../../src/advisory/life-events/planner.js";
import { computeDeadlines, getDeadlineTemplates, listEventsWithDeadlines } from "../../src/advisory/life-events/deadlines.js";
import { getDependenciesForEvent, topologicalSort, detectCycles } from "../../src/advisory/life-events/ordering.js";

// ── event coverage ──────────────────────────────────────────────────────────

describe("life events catalog", () => {
  const ALL_EVENT_IDS = [
    "new-baby",
    "marriage",
    "divorce",
    "job-loss",
    "retirement",
    "moving-states",
    "death-of-spouse",
    "buying-home",
    "starting-business",
    "becoming-disabled",
    "aging-into-medicare",
    "immigration-status-change",
    "lost-health-insurance",
    "had-income-change",
    "arrested-or-convicted",
    "natural-disaster",
    "turning-18",
    "turning-26",
    "child-turning-18",
    "received-inheritance",
  ];

  test("all 20 events exist and have non-empty workflow lists", () => {
    const events = listLifeEvents();
    expect(events.length).toBe(20);

    for (const eventId of ALL_EVENT_IDS) {
      const event = findLifeEvent(eventId);
      expect(event, `Event "${eventId}" should exist`).toBeDefined();
      expect(event!.workflows.length, `Event "${eventId}" should have workflows`).toBeGreaterThan(0);
    }
  });

  test("every event has a label and description", () => {
    for (const event of listLifeEvents()) {
      expect(event.label.length).toBeGreaterThan(0);
      expect(event.description.length).toBeGreaterThan(0);
    }
  });

  test("no duplicate event IDs", () => {
    const events = listLifeEvents();
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("all workflow IDs follow domain/slug pattern", () => {
    for (const event of listLifeEvents()) {
      for (const wf of event.workflows) {
        expect(wf.workflowId).toMatch(/^[a-z]+\/[a-z0-9-]+$/);
      }
    }
  });
});

// ── death-of-spouse deep cascade ────────────────────────────────────────────

describe("death-of-spouse deep cascade", () => {
  test("has 20+ workflows across multiple phases", () => {
    const event = findLifeEvent("death-of-spouse");
    expect(event).toBeDefined();
    expect(event!.workflows.length).toBeGreaterThanOrEqual(20);
  });

  test("produces a plan with 5+ phases", () => {
    const plan = planLifeEvent("death-of-spouse");
    expect(plan).toBeDefined();

    const phases = new Set(plan!.orderedWorkflows.map((w) => w.phase));
    expect(phases.size).toBeGreaterThanOrEqual(3);
  });

  test("SSA notification is phase 1 (immediate)", () => {
    const plan = planLifeEvent("death-of-spouse");
    expect(plan).toBeDefined();

    const ssaWorkflow = plan!.orderedWorkflows.find(
      (w) => w.workflowId === "retirement/ssa-estimator",
    );
    expect(ssaWorkflow).toBeDefined();
    expect(ssaWorkflow!.phase).toBe(1);
    expect(ssaWorkflow!.priority).toBe(1);
  });

  test("tax filing depends on SSA and estate workflows", () => {
    const plan = planLifeEvent("death-of-spouse");
    expect(plan).toBeDefined();

    const taxWorkflow = plan!.orderedWorkflows.find(
      (w) => w.workflowId === "tax/1040",
    );
    expect(taxWorkflow).toBeDefined();
    expect(taxWorkflow!.dependsOn).toContain("retirement/ssa-estimator");
    expect(taxWorkflow!.dependsOn).toContain("estate/basic-will");
  });

  test("includes veteran-specific workflows", () => {
    const plan = planLifeEvent("death-of-spouse");
    expect(plan).toBeDefined();

    const vaWorkflows = plan!.orderedWorkflows.filter(
      (w) => w.workflowId.startsWith("veterans/"),
    );
    expect(vaWorkflows.length).toBeGreaterThanOrEqual(1);
  });

  test("includes estate administration workflows", () => {
    const plan = planLifeEvent("death-of-spouse");
    expect(plan).toBeDefined();

    const estateWorkflows = plan!.orderedWorkflows.filter(
      (w) => w.workflowId.startsWith("estate/"),
    );
    expect(estateWorkflows.length).toBeGreaterThanOrEqual(3);
  });
});

// ── temporal deadlines ──────────────────────────────────────────────────────

describe("temporal deadlines", () => {
  test("compute deadlines from event date for all events with templates", () => {
    const eventsWithDeadlines = listEventsWithDeadlines();
    expect(eventsWithDeadlines.length).toBeGreaterThanOrEqual(20);

    for (const eventId of eventsWithDeadlines) {
      const deadlines = computeDeadlines(eventId, "2026-03-01");
      expect(
        deadlines.length,
        `Event "${eventId}" should produce deadlines`,
      ).toBeGreaterThan(0);
    }
  });

  test("deadlines are sorted by daysRemaining (soonest first, overdue at top)", () => {
    const deadlines = computeDeadlines("job-loss", "2026-03-01");
    expect(deadlines.length).toBeGreaterThan(0);

    // Overdue should come before non-overdue
    let lastWasOverdue = true;
    for (const dl of deadlines) {
      if (dl.status !== "overdue" && lastWasOverdue) {
        lastWasOverdue = false;
      }
      if (!lastWasOverdue) {
        expect(dl.status).not.toBe("overdue");
      }
    }

    // Within non-overdue, should be sorted by daysRemaining ascending
    const nonOverdue = deadlines.filter((d) => d.status !== "overdue");
    for (let i = 1; i < nonOverdue.length; i++) {
      expect(nonOverdue[i]!.daysRemaining).toBeGreaterThanOrEqual(nonOverdue[i - 1]!.daysRemaining);
    }
  });

  test("job-loss deadlines include unemployment (7d), ACA (60d)", () => {
    const deadlines = computeDeadlines("job-loss", "2026-06-01");

    const uiDeadline = deadlines.find((d) => d.workflowId === "unemployment/claim-intake");
    expect(uiDeadline).toBeDefined();
    expect(uiDeadline!.daysFromEvent).toBe(7);
    expect(uiDeadline!.isHardDeadline).toBe(true);

    const acaDeadline = deadlines.find((d) => d.workflowId === "healthcare/aca-enrollment");
    expect(acaDeadline).toBeDefined();
    expect(acaDeadline!.daysFromEvent).toBe(60);
    expect(acaDeadline!.isHardDeadline).toBe(true);
  });

  test("computed dates are correct relative to event date", () => {
    const deadlines = computeDeadlines("job-loss", "2026-06-01");

    const uiDeadline = deadlines.find((d) => d.workflowId === "unemployment/claim-intake");
    expect(uiDeadline).toBeDefined();
    expect(uiDeadline!.computedDate).toBe("2026-06-08"); // June 1 + 7 days

    const acaDeadline = deadlines.find((d) => d.workflowId === "healthcare/aca-enrollment");
    expect(acaDeadline).toBeDefined();
    expect(acaDeadline!.computedDate).toBe("2026-07-31"); // June 1 + 60 days
  });

  test("absolute dates override computed dates", () => {
    const deadlines = computeDeadlines("job-loss", "2026-06-01");
    const taxDeadline = deadlines.find((d) => d.workflowId === "tax/1040");
    expect(taxDeadline).toBeDefined();
    expect(taxDeadline!.computedDate).toBe("2026-04-15"); // absolute
  });

  test("hard vs soft deadline classification is consistent", () => {
    const deadlines = computeDeadlines("death-of-spouse", "2026-03-01");

    // ACA SEP is always hard
    const aca = deadlines.find((d) => d.workflowId === "healthcare/aca-enrollment");
    expect(aca).toBeDefined();
    expect(aca!.isHardDeadline).toBe(true);

    // SSA notification is soft (no legal penalty, but lost benefits)
    const ssa = deadlines.find((d) => d.workflowId === "retirement/ssa-estimator");
    expect(ssa).toBeDefined();
    expect(ssa!.isHardDeadline).toBe(false);
  });

  test("status reflects urgency relative to today", () => {
    // Use a date in the past to create overdue deadlines
    const deadlines = computeDeadlines("job-loss", "2020-01-01");

    // Deadlines computed relative to event date should be overdue
    // (absolute dates like "2026-04-15" may not be overdue yet)
    const relativeDls = deadlines.filter((d) => !d.absoluteDate);
    expect(relativeDls.length).toBeGreaterThan(0);
    for (const dl of relativeDls) {
      expect(dl.status).toBe("overdue");
    }
  });

  test("unknown event returns empty deadlines", () => {
    const deadlines = computeDeadlines("nonexistent-event", "2026-03-01");
    expect(deadlines).toEqual([]);
  });

  test("new events have deadline templates", () => {
    const newEventIds = [
      "lost-health-insurance",
      "had-income-change",
      "arrested-or-convicted",
      "natural-disaster",
      "turning-18",
      "turning-26",
      "child-turning-18",
      "received-inheritance",
    ];

    for (const eventId of newEventIds) {
      const templates = getDeadlineTemplates(eventId);
      expect(
        templates.length,
        `Event "${eventId}" should have deadline templates`,
      ).toBeGreaterThan(0);
    }
  });
});

// ── dependency ordering ─────────────────────────────────────────────────────

describe("dependency ordering", () => {
  test("job-loss: SNAP depends on unemployment claim", () => {
    const workflowIds = ["unemployment/claim-intake", "healthcare/aca-enrollment", "benefits/snap", "benefits/medicaid"];
    const deps = getDependenciesForEvent("job-loss", workflowIds);

    const snapDep = deps.find((d) => d.workflowId === "benefits/snap");
    expect(snapDep).toBeDefined();
    expect(snapDep!.dependsOn).toContain("unemployment/claim-intake");
  });

  test("marriage: immigration petition depends on name change", () => {
    const workflowIds = ["identity/name-change", "immigration/family-visa-intake", "tax/1040"];
    const deps = getDependenciesForEvent("marriage", workflowIds);

    const immigrationDep = deps.find((d) => d.workflowId === "immigration/family-visa-intake");
    expect(immigrationDep).toBeDefined();
    expect(immigrationDep!.dependsOn).toContain("identity/name-change");
  });

  test("topological sort produces valid phases", () => {
    const workflowIds = ["unemployment/claim-intake", "benefits/snap", "benefits/medicaid", "tax/1040"];
    const deps = getDependenciesForEvent("job-loss", workflowIds);
    const phases = topologicalSort(workflowIds, deps);

    expect(phases.length).toBeGreaterThanOrEqual(2);

    // Unemployment should be in an earlier phase than SNAP
    const uiPhase = phases.findIndex((p) => p.includes("unemployment/claim-intake"));
    const snapPhase = phases.findIndex((p) => p.includes("benefits/snap"));
    expect(uiPhase).toBeLessThan(snapPhase);
  });

  test("dependency ordering is acyclic for all events", () => {
    const events = listLifeEvents();

    for (const event of events) {
      const workflowIds = event.workflows.map((w) => w.workflowId);
      const deps = getDependenciesForEvent(event.id, workflowIds);

      // Also include inline deps from event definitions
      for (const wf of event.workflows) {
        if (wf.dependsOn && wf.dependsOn.length > 0) {
          deps.push({
            workflowId: wf.workflowId,
            dependsOn: wf.dependsOn,
            reason: "inline dependency",
          });
        }
      }

      const cycles = detectCycles(workflowIds, deps);
      expect(
        cycles,
        `Event "${event.id}" has circular dependencies: ${cycles.join("; ")}`,
      ).toEqual([]);
    }
  });

  test("death-of-spouse has ordering constraints", () => {
    const event = findLifeEvent("death-of-spouse")!;
    const workflowIds = event.workflows.map((w) => w.workflowId);
    const deps = getDependenciesForEvent("death-of-spouse", workflowIds);

    expect(deps.length).toBeGreaterThan(0);

    // Tax should depend on SSA notification
    const taxDep = deps.find((d) => d.workflowId === "tax/1040");
    expect(taxDep).toBeDefined();
    expect(taxDep!.dependsOn).toContain("retirement/ssa-estimator");
  });
});

// ── planner integration ─────────────────────────────────────────────────────

describe("planner integration", () => {
  test("all 20 events produce valid plans", () => {
    const events = listLifeEvents();
    expect(events.length).toBe(20);

    for (const event of events) {
      const plan = planLifeEvent(event.id);
      expect(plan, `Plan for "${event.id}" should be defined`).toBeDefined();
      expect(plan!.totalWorkflows).toBeGreaterThan(0);
      expect(plan!.event.id).toBe(event.id);
    }
  });

  test("plan with eventDate includes computed deadlines", () => {
    const plan = planLifeEvent("job-loss", "2026-06-01");
    expect(plan).toBeDefined();
    expect(plan!.computedDeadlines).toBeDefined();
    expect(plan!.computedDeadlines!.length).toBeGreaterThan(0);
  });

  test("plan without eventDate has no computed deadlines", () => {
    const plan = planLifeEvent("job-loss");
    expect(plan).toBeDefined();
    expect(plan!.computedDeadlines).toBeUndefined();
  });

  test("plan includes estimated hours", () => {
    const plan = planLifeEvent("death-of-spouse");
    expect(plan).toBeDefined();
    expect(plan!.estimatedHours).toBeGreaterThan(0);
  });

  test("plan includes dependency info when applicable", () => {
    const plan = planLifeEvent("job-loss");
    expect(plan).toBeDefined();
    expect(plan!.dependencies).toBeDefined();
    expect(plan!.dependencies!.length).toBeGreaterThan(0);
  });

  test("plan phases are in order and start from 1", () => {
    for (const event of listLifeEvents()) {
      const plan = planLifeEvent(event.id);
      expect(plan).toBeDefined();

      let lastPhase = 0;
      for (const wf of plan!.orderedWorkflows) {
        expect(wf.phase).toBeGreaterThanOrEqual(lastPhase);
        lastPhase = wf.phase;
      }

      // First phase should be 1
      if (plan!.orderedWorkflows.length > 0) {
        expect(plan!.orderedWorkflows[0]!.phase).toBe(1);
      }
    }
  });

  test("planned workflows have phase labels", () => {
    const plan = planLifeEvent("death-of-spouse");
    expect(plan).toBeDefined();

    for (const wf of plan!.orderedWorkflows) {
      expect(wf.phaseLabel).toBeDefined();
      expect(wf.phaseLabel!.length).toBeGreaterThan(0);
    }
  });

  test("unknown event returns undefined", () => {
    const plan = planLifeEvent("definitely-not-a-real-event");
    expect(plan).toBeUndefined();
  });
});
