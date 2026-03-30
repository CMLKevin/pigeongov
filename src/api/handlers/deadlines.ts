import type { IncomingMessage, ServerResponse } from "node:http";

import { sendJson } from "../router.js";
import {
  DEFAULT_DEADLINES,
  getUpcomingDeadlines,
} from "../../workflows/deadlines.js";

export async function deadlinesHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>,
): Promise<void> {
  const upcoming = getUpcomingDeadlines(DEFAULT_DEADLINES);
  sendJson(res, 200, { deadlines: upcoming });
}
