import { z } from "zod";

/**
 * Zod schema that mirrors the WorkflowBundle shape.
 * Used to validate plugin output at runtime so we never pass
 * structurally broken bundles downstream.
 */
const validationFlagSchema = z.object({
  field: z.string(),
  severity: z.enum(["warning", "error", "review"]),
  message: z.string(),
  source: z.string().optional(),
});

const validationCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  passed: z.boolean(),
  severity: z.enum(["warning", "error"]),
  message: z.string(),
});

const evidenceItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean(),
  status: z.enum(["provided", "missing", "review"]),
  notes: z.string().optional(),
  source: z.string().optional(),
});

const artifactSchema = z.object({
  kind: z.string(),
  label: z.string(),
  format: z.enum(["json", "pdf", "checklist", "summary"]),
  path: z.string().optional(),
  content: z.unknown().optional(),
});

const workflowBundleSchema = z.object({
  workflowId: z.string(),
  domain: z.string(),
  title: z.string(),
  summary: z.string(),
  year: z.number().optional(),
  legacyFormId: z.string().optional(),
  applicant: z.record(z.string(), z.unknown()).optional(),
  household: z.array(
    z.object({
      name: z.string(),
      relationship: z.string(),
      age: z.number().optional(),
      notes: z.string().optional(),
    }),
  ),
  evidence: z.array(evidenceItemSchema),
  answers: z.record(z.string(), z.unknown()),
  derived: z.record(z.string(), z.unknown()),
  validation: z.object({
    checks: z.array(validationCheckSchema),
    flaggedFields: z.array(validationFlagSchema),
  }),
  review: z.object({
    headline: z.string(),
    notes: z.array(z.string()),
    flaggedFields: z.array(validationFlagSchema),
  }),
  outputArtifacts: z.array(artifactSchema),
  provenance: z.array(z.string()),
  filledForm: z.unknown().optional(),
  calculation: z.unknown().optional(),
});

/**
 * Validate that a plugin's buildBundle output conforms to
 * the WorkflowBundle shape. Returns true if valid, false otherwise.
 */
export function validatePluginOutput(bundle: unknown): boolean {
  const result = workflowBundleSchema.safeParse(bundle);
  return result.success;
}

/**
 * Same as validatePluginOutput but returns the Zod error for diagnostics.
 */
export function validatePluginOutputDetailed(
  bundle: unknown,
): { valid: true } | { valid: false; error: string } {
  const result = workflowBundleSchema.safeParse(bundle);
  if (result.success) return { valid: true };
  return {
    valid: false,
    error: result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; "),
  };
}
