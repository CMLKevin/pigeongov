"use server";

import { fillWorkflow } from "@/lib/engine";
import type { WorkflowBundle } from "@/lib/types";

/**
 * Server Action: submit a workflow with user-provided answers.
 *
 * This runs on the server, shells out to the PigeonGov CLI to fill the
 * workflow, and returns the validated bundle. The client component calls
 * this after the user finishes the last section of the wizard.
 */
export async function submitWorkflow(
  workflowId: string,
  data: Record<string, unknown>
): Promise<WorkflowBundle> {
  try {
    const bundle = fillWorkflow(workflowId, data);
    return bundle;
  } catch (err) {
    // If the CLI fails, we still want to return something meaningful
    // rather than just letting the error propagate as a cryptic string
    const message =
      err instanceof Error ? err.message : "Unknown error during workflow fill";

    // Try to extract the structured error if the CLI output it
    if (message.includes("{")) {
      try {
        const jsonStart = message.indexOf("{");
        const jsonEnd = message.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const parsed = JSON.parse(message.slice(jsonStart, jsonEnd + 1));
          if (parsed && typeof parsed === "object" && "review" in parsed) {
            return parsed as WorkflowBundle;
          }
        }
      } catch {
        // Not valid JSON, fall through
      }
    }

    throw new Error(
      `Workflow processing failed: ${message.slice(0, 500)}`
    );
  }
}
