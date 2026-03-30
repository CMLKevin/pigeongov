import type { IncomingMessage, ServerResponse } from "node:http";

import { readJsonBody, sendJson } from "../router.js";
import {
  listWorkflowSummaries,
  describeWorkflow,
  buildWorkflowBundle,
  validateWorkflowBundle,
} from "../../workflows/registry.js";

export async function listWorkflowsHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  _params: Record<string, string>,
): Promise<void> {
  const workflows = listWorkflowSummaries();
  sendJson(res, 200, { workflows });
}

export async function describeWorkflowHandler(
  _req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
): Promise<void> {
  const id = params["id"];
  if (!id) {
    sendJson(res, 400, { error: "missing_param", message: "Workflow ID is required" });
    return;
  }

  try {
    const description = describeWorkflow(id);
    sendJson(res, 200, description);
  } catch (err) {
    sendJson(res, 404, {
      error: "not_found",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function fillWorkflowHandler(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
): Promise<void> {
  const id = params["id"];
  if (!id) {
    sendJson(res, 400, { error: "missing_param", message: "Workflow ID is required" });
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "invalid_json", message: "Request body must be valid JSON" });
    return;
  }

  try {
    const bundle = buildWorkflowBundle(id, body);
    sendJson(res, 200, bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Unsupported workflow") ? 404 : 422;
    sendJson(res, status, { error: "build_error", message });
  }
}

export async function validateWorkflowHandler(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
): Promise<void> {
  const id = params["id"];
  if (!id) {
    sendJson(res, 400, { error: "missing_param", message: "Workflow ID is required" });
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "invalid_json", message: "Request body must be valid JSON" });
    return;
  }

  try {
    const bundle = buildWorkflowBundle(id, body);
    const validation = validateWorkflowBundle(bundle);
    sendJson(res, 200, { workflowId: id, validation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Unsupported workflow") ? 404 : 422;
    sendJson(res, status, { error: "validation_error", message });
  }
}
