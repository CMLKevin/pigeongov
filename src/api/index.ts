import { createServer, type Server } from "node:http";

import { createRouter, type Route } from "./router.js";
import {
  listWorkflowsHandler,
  describeWorkflowHandler,
  fillWorkflowHandler,
  validateWorkflowHandler,
} from "./handlers/workflows.js";
import { deadlinesHandler } from "./handlers/deadlines.js";
import { openapiHandler } from "./handlers/openapi.js";

/**
 * All REST API routes.
 *
 * Named groups in the regex patterns get passed as `params` to handlers.
 * The /api prefix is included in every pattern so the router can be
 * mounted at the server root without path rewriting.
 */
const API_ROUTES: Route[] = [
  // Workflows
  {
    method: "GET",
    pattern: /^\/api\/workflows$/,
    handler: listWorkflowsHandler,
  },
  {
    method: "GET",
    pattern: /^\/api\/workflows\/(?<id>[^/]+(?:\/[^/]+)?)$/,
    handler: describeWorkflowHandler,
  },
  {
    method: "POST",
    pattern: /^\/api\/workflows\/(?<id>[^/]+(?:\/[^/]+)?)\/fill$/,
    handler: fillWorkflowHandler,
  },
  {
    method: "POST",
    pattern: /^\/api\/workflows\/(?<id>[^/]+(?:\/[^/]+)?)\/validate$/,
    handler: validateWorkflowHandler,
  },

  // Deadlines
  {
    method: "GET",
    pattern: /^\/api\/deadlines$/,
    handler: deadlinesHandler,
  },

  // OpenAPI spec
  {
    method: "GET",
    pattern: /^\/api\/openapi\.json$/,
    handler: openapiHandler,
  },
];

const routeHandler = createRouter(API_ROUTES);

/**
 * Create and start a standalone REST API server.
 */
export function startApiServer(port: number): Server {
  const server = createServer((req, res) => {
    void routeHandler(req, res);
  });

  server.listen(port, () => {
    console.log(`PigeonGov REST API listening on http://localhost:${port}`);
    console.log(`  OpenAPI spec: http://localhost:${port}/api/openapi.json`);
  });

  return server;
}

/**
 * Get the raw route handler for embedding in another HTTP server
 * (e.g. alongside the MCP server).
 */
export function getApiRouteHandler() {
  return routeHandler;
}

export { API_ROUTES };
