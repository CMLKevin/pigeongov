import { Command } from "commander";
import chalk from "chalk";
import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import {
  planLifeEvent,
  formatPlanSummary,
  listLifeEvents,
} from "../../advisory/life-events/planner.js";

export function registerLifeEventCommand(program: Command): void {
  program
    .command("life-event")
    .description("Get a prioritized action plan for a life event")
    .argument("[event]", "Life event ID (e.g., job-loss, marriage, new-baby)")
    .action((event: string | undefined) => {
      if (!event) {
        const events = listLifeEvents();

        if (isJsonMode()) {
          emitJson(events.map((e) => ({ id: e.id, label: e.label, description: e.description, workflowCount: e.workflows.length })));
          return;
        }

        console.log(chalk.bold("\nAvailable Life Events:\n"));
        for (const e of events) {
          console.log(`  ${chalk.cyan(e.id.padEnd(28))} ${e.label}`);
          console.log(`  ${"".padEnd(28)} ${chalk.dim(e.description)}`);
        }
        console.log(chalk.dim("\nUsage: pigeongov life-event <event-id>"));
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
        emitJson(plan);
        return;
      }

      console.log("");
      console.log(formatPlanSummary(plan));
      console.log("");
    });
}
