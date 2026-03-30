import type { Command } from "commander";

import { emitJson } from "../support.js";
import { isJsonMode } from "../output.js";
import { getLocalStats, formatStats } from "../../analytics/stats.js";

export function registerStatsCommand(program: Command): void {
  program
    .command("stats")
    .description("Show local usage statistics")
    .action(async () => {
      const stats = await getLocalStats();

      if (isJsonMode()) {
        emitJson(stats);
        return;
      }

      console.log(formatStats(stats));
    });
}
