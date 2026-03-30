import type { IncomingMessage, ServerResponse } from "node:http";

import { sendJson } from "../router.js";
import { generateOpenApiSpec } from "../openapi.js";

export async function openapiHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>,
): Promise<void> {
  const spec = generateOpenApiSpec();
  sendJson(res, 200, spec);
}
