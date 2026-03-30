import type { Command } from "commander";

import { emitJson } from "../support.js";
import { getLocalStats, formatStats } from "../../analytics/stats.js";

export function registerStatsCommand(program: Command): void {
  program
    .command("stats")
    .description("Show local usage statistics")
    .option("--json", "Print JSON output")
    .action(async (options: { json?: boolean }) => {
      const stats = await getLocalStats();

      if (options.json) {
        emitJson(stats);
        return;
      }

      console.log(formatStats(stats));
    });
}
