import type { Command } from "commander";

import { isJsonMode, emit } from "../output.js";
import { getLocalStats, formatStats } from "../../analytics/stats.js";

export function registerStatsCommand(program: Command): void {
  program
    .command("stats")
    .description("Show local usage statistics")
    .action(async () => {
      const stats = await getLocalStats();

      if (isJsonMode()) {
        emit(stats);
        return;
      }

      console.log(formatStats(stats));
    });
}
