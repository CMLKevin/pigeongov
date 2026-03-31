import { Command } from "commander";
import chalk from "chalk";
import { isJsonMode, emit } from "../output.js";
import {
  planLifeEvent,
  listLifeEvents,
} from "../../advisory/life-events/planner.js";
import type { LifeEventPlan, PlannedWorkflow } from "../../advisory/life-events/planner.js";
import type { ComputedDeadline } from "../../advisory/life-events/deadlines.js";

function deadlineColor(deadline: ComputedDeadline): string {
  switch (deadline.status) {
    case "overdue": return chalk.bgRed.white.bold(` OVERDUE by ${Math.abs(deadline.daysRemaining)} days `);
    case "urgent": return chalk.red.bold(`${deadline.daysRemaining}d left — URGENT`);
    case "upcoming": return chalk.yellow(`${deadline.daysRemaining}d left`);
    case "distant": return chalk.green(`${deadline.daysRemaining}d left`);
  }
}

function formatDeadlineBlock(deadlines: ComputedDeadline[]): string {
  const lines: string[] = [];
  lines.push(chalk.bold("  Deadline Timeline"));
  lines.push(chalk.dim("  \u2500".repeat(50)));
  lines.push("");

  for (const dl of deadlines) {
    const hardSoft = dl.isHardDeadline
      ? chalk.red.bold("HARD")
      : chalk.dim("soft");

    lines.push(`  ${chalk.white(dl.computedDate)}  ${deadlineColor(dl)}  [${hardSoft}]`);
    lines.push(`    ${chalk.cyan(dl.workflowId)} — ${dl.label}`);
    if (dl.status === "overdue" || dl.status === "urgent") {
      lines.push(`    ${chalk.red("\u26a0 " + dl.consequence)}`);
    } else {
      lines.push(`    ${chalk.dim(dl.consequence)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatDependencyVisualization(workflows: PlannedWorkflow[]): string {
  const withDeps = workflows.filter((w) => w.dependsOn.length > 0);
  if (withDeps.length === 0) return "";

  const lines: string[] = [];
  lines.push("");
  lines.push(chalk.bold("  Dependency Ordering"));
  lines.push(chalk.dim("  \u2500".repeat(50)));
  lines.push("");

  for (const w of withDeps) {
    const deps = w.dependsOn.map((d) => chalk.dim(d)).join(", ");
    lines.push(`  ${deps} ${chalk.dim("\u2192")} ${chalk.white(w.workflowId)}`);
  }

  return lines.join("\n");
}

function formatPlanVisual(plan: LifeEventPlan): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold(`  ${plan.event.label}`));
  lines.push(chalk.dim(`  ${plan.event.description}`));
  lines.push("");

  const maxPhase = Math.max(...plan.orderedWorkflows.map((w) => w.phase));
  lines.push(
    chalk.bold(`  Action Plan`) +
      chalk.dim(` \u2014 ${plan.totalWorkflows} workflows in ${maxPhase} phases`),
  );
  if (plan.estimatedHours) {
    lines.push(chalk.dim(`  Estimated paperwork time: ~${plan.estimatedHours} hours`));
  }
  lines.push("");

  // Computed deadline timeline (if event date provided)
  if (plan.computedDeadlines && plan.computedDeadlines.length > 0) {
    lines.push(formatDeadlineBlock(plan.computedDeadlines));
  }

  // Workflow phases
  let currentPhase = 0;
  for (const workflow of plan.orderedWorkflows) {
    if (workflow.phase !== currentPhase) {
      currentPhase = workflow.phase;
      const label = workflow.phaseLabel ?? (currentPhase === 1 ? "Immediate" : currentPhase === 2 ? "Soon" : `Phase ${currentPhase}`);
      lines.push(`  ${chalk.cyan.bold(`\u250c\u2500\u2500 ${label} `)}`);
    }

    const isLast = plan.orderedWorkflows.indexOf(workflow) === plan.orderedWorkflows.length - 1 ||
      plan.orderedWorkflows[plan.orderedWorkflows.indexOf(workflow) + 1]?.phase !== currentPhase;
    const connector = isLast ? "\u2514" : "\u251c";

    // Priority indicator
    const priorityDots =
      workflow.priority <= 1
        ? chalk.red("\u25cf\u25cf\u25cf")
        : workflow.priority <= 2
          ? chalk.yellow("\u25cf\u25cf\u25cb")
          : chalk.dim("\u25cf\u25cb\u25cb");

    // Deadline coloring (prefer computed deadline)
    let deadlineStr = "";
    if (workflow.computedDeadline) {
      deadlineStr = ` \u2502 ${deadlineColor(workflow.computedDeadline)}`;
    } else if (workflow.deadline) {
      deadlineStr = chalk.red(` \u2502 deadline: ${workflow.deadline}`);
    }

    lines.push(
      `  ${chalk.dim("\u2502")}  ${chalk.dim(connector)} ${priorityDots} ${chalk.white(workflow.workflowId)}${deadlineStr}`,
    );
    lines.push(
      `  ${chalk.dim("\u2502")}  ${isLast ? " " : chalk.dim("\u2502")}       ${chalk.dim(workflow.notes)}`,
    );

    if (workflow.dependsOn.length > 0) {
      lines.push(
        `  ${chalk.dim("\u2502")}  ${isLast ? " " : chalk.dim("\u2502")}       ${chalk.dim(`\u2192 after: ${workflow.dependsOn.join(", ")}`)}`,
      );
    }
  }

  lines.push(`  ${chalk.dim("\u2502")}`);

  // Dependency visualization
  const depViz = formatDependencyVisualization(plan.orderedWorkflows);
  if (depViz) {
    lines.push(depViz);
    lines.push("");
  }

  if (plan.hasUrgentDeadlines) {
    lines.push(`  ${chalk.red.bold("\u26a0")} ${chalk.red("Some workflows have urgent deadlines \u2014 start immediately.")}`);
  }

  lines.push("");
  lines.push(chalk.dim(`  Run: pigeongov fill <workflow-id>`));

  return lines.join("\n");
}

export function registerLifeEventCommand(program: Command): void {
  program
    .command("life-event")
    .description(
      `Get a prioritized action plan for a life event.

  Without an event argument, lists all 20 supported life events. With
  an event ID, returns a phased action plan: which workflows to file,
  in what order, with deadlines and priority levels.

  Use --date to compute concrete deadline dates relative to when the
  event occurred (e.g., "when exactly does my ACA window close?").

  Available events: job-loss, marriage, divorce, new-baby, retirement,
  moving-states, death-of-spouse, buying-home, starting-business,
  becoming-disabled, aging-into-medicare, immigration-status-change,
  lost-health-insurance, had-income-change, arrested-or-convicted,
  natural-disaster, turning-18, turning-26, child-turning-18,
  received-inheritance

  Examples:
    $ pigeongov life-event                                  # list all events
    $ pigeongov life-event job-loss                         # action plan
    $ pigeongov life-event job-loss --date 2026-03-15       # with deadlines
    $ pigeongov life-event death-of-spouse --json           # structured plan`,
    )
    .argument("[event]", "Life event ID (e.g., job-loss, marriage, new-baby)")
    .option("--date <date>", "Event date (ISO format: YYYY-MM-DD) for computed deadlines")
    .action((event: string | undefined, opts: { date?: string }) => {
      if (!event) {
        const events = listLifeEvents();

        if (isJsonMode()) {
          emit(events.map((e) => ({ id: e.id, label: e.label, description: e.description, workflowCount: e.workflows.length })));
          return;
        }

        console.log("");
        console.log(chalk.bold("  Life Events"));
        console.log(chalk.dim("  \u2500".repeat(40)));
        console.log("");

        for (const e of events) {
          const workflowCount = chalk.dim(`(${e.workflows.length} workflows)`);
          console.log(`  ${chalk.cyan.bold(e.id.padEnd(28))} ${e.label} ${workflowCount}`);
          console.log(`  ${"".padEnd(28)} ${chalk.dim(e.description)}`);
          console.log("");
        }

        console.log(chalk.dim("  Usage: pigeongov life-event <event-id> [--date YYYY-MM-DD]"));
        console.log("");
        return;
      }

      // Validate date format if provided
      if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
        console.error(chalk.red(`Invalid date format: "${opts.date}". Use YYYY-MM-DD (e.g., 2026-03-15).`));
        process.exitCode = 5;
        return;
      }

      const plan = planLifeEvent(event, opts.date);
      if (!plan) {
        console.error(chalk.red(`Unknown life event: "${event}"`));
        console.error(chalk.dim("Run 'pigeongov life-event' to see available events."));
        process.exitCode = 5;
        return;
      }

      if (isJsonMode()) {
        // Construct deadlineSummary to match MCP tool output
        if (plan.computedDeadlines && plan.computedDeadlines.length > 0) {
          const overdue = plan.computedDeadlines.filter((d: ComputedDeadline) => d.status === 'overdue').length;
          const urgent = plan.computedDeadlines.filter((d: ComputedDeadline) => d.status === 'urgent').length;
          const nextDeadline = plan.computedDeadlines.find((d: ComputedDeadline) => d.status !== 'overdue');
          (plan as unknown as Record<string, unknown>).deadlineSummary = {
            totalDeadlines: plan.computedDeadlines.length,
            overdue,
            urgent,
            nextDeadline: nextDeadline
              ? { label: nextDeadline.label, date: nextDeadline.computedDate, daysRemaining: nextDeadline.daysRemaining }
              : null,
          };
        }
        emit(plan);
        return;
      }

      console.log("");
      console.log(formatPlanVisual(plan));
      console.log("");
    });
}
