import { type IncomingMessage, type ServerResponse } from "node:http";

export interface Route {
  method: "GET" | "POST";
  pattern: RegExp;
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
  ) => Promise<void>;
}

export function createRouter(
  routes: Route[],
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    for (const route of routes) {
      if (req.method !== route.method) continue;
      const match = url.pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        if (match.groups) Object.assign(params, match.groups);

        try {
          await route.handler(req, res, params);
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "internal_error",
              message: String(err),
            }),
          );
        }
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "not_found",
        message: `${req.method ?? "UNKNOWN"} ${url.pathname} not found`,
      }),
    );
  };
}

/**
 * Read the full request body as a string.
 */
export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

/**
 * Read the request body as parsed JSON.
 */
export async function readJsonBody<T = unknown>(
  req: IncomingMessage,
): Promise<T> {
  const raw = await readBody(req);
  return JSON.parse(raw) as T;
}

/**
 * Send a JSON response with the given status code.
 */
export function sendJson(
  res: ServerResponse,
  status: number,
  data: unknown,
): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}
