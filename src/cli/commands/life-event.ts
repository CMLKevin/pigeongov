import { Command } from "commander";
import chalk from "chalk";
import { isJsonMode, emit } from "../output.js";
import {
  planLifeEvent,
  listLifeEvents,
} from "../../advisory/life-events/planner.js";
import type { LifeEventPlan } from "../../advisory/life-events/planner.js";

function formatPlanVisual(plan: LifeEventPlan): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold(`  ${plan.event.label}`));
  lines.push(chalk.dim(`  ${plan.event.description}`));
  lines.push("");
  lines.push(
    chalk.bold(`  Action Plan`) +
      chalk.dim(` \u2014 ${plan.totalWorkflows} workflows in ${Math.max(...plan.orderedWorkflows.map((w) => w.phase))} phases`),
  );
  lines.push("");

  let currentPhase = 0;
  for (const workflow of plan.orderedWorkflows) {
    if (workflow.phase !== currentPhase) {
      currentPhase = workflow.phase;
      const phaseLabel = currentPhase === 1 ? "Immediate" : currentPhase === 2 ? "Soon" : `Phase ${currentPhase}`;
      lines.push(`  ${chalk.cyan.bold(`\u250c\u2500\u2500 ${phaseLabel} `)}`);
    }

    const isLast = plan.orderedWorkflows.indexOf(workflow) === plan.orderedWorkflows.length - 1 ||
      plan.orderedWorkflows[plan.orderedWorkflows.indexOf(workflow) + 1]?.phase !== currentPhase;
    const connector = isLast ? "\u2514" : "\u251c";

    // Priority indicator: filled circles for high priority, empty for low
    const priorityDots =
      workflow.priority <= 1
        ? chalk.red("\u25cf\u25cf\u25cf")
        : workflow.priority <= 2
          ? chalk.yellow("\u25cf\u25cf\u25cb")
          : chalk.dim("\u25cf\u25cb\u25cb");

    // Deadline coloring
    let deadlineStr = "";
    if (workflow.deadline) {
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

  Without an event argument, lists all 12 supported life events. With
  an event ID, returns a phased action plan: which workflows to file,
  in what order, with deadlines and priority levels.

  Available events: job-loss, marriage, divorce, new-baby, retirement,
  moving-states, death-of-spouse, buying-home, starting-business,
  becoming-disabled, aging-into-medicare, immigration-status-change

  Examples:
    $ pigeongov life-event                     # list all events
    $ pigeongov life-event job-loss            # action plan
    $ pigeongov life-event job-loss --json     # structured plan`,
    )
    .argument("[event]", "Life event ID (e.g., job-loss, marriage, new-baby)")
    .action((event: string | undefined) => {
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
          console.log(`  ${chalk.cyan.bold(e.id.padEnd(24))} ${e.label} ${workflowCount}`);
          console.log(`  ${"".padEnd(24)} ${chalk.dim(e.description)}`);
          console.log("");
        }

        console.log(chalk.dim("  Usage: pigeongov life-event <event-id>"));
        console.log("");
        return;
      }

      const plan = planLifeEvent(event);
      if (!plan) {
        console.error(chalk.red(`Unknown life event: "${event}"`));
        console.error(chalk.dim("Run 'pigeongov life-event' to see available events."));
        process.exitCode = 5;
        return;
      }

      if (isJsonMode()) {
        emit(plan);
        return;
      }

      console.log("");
      console.log(formatPlanVisual(plan));
      console.log("");
    });
}
