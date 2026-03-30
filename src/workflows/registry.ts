import { z } from "zod";

import type { WorkflowBundle, WorkflowDomain } from "../types.js";
import { businessWorkflows } from "./domains/business.js";
import { healthcareWorkflows } from "./domains/healthcare.js";
import { healthcareExtWorkflows } from "./domains/healthcare-ext.js";
import { immigrationWorkflows } from "./domains/immigration.js";
import { immigrationExtWorkflows } from "./domains/immigration-ext.js";
import { permitsWorkflows } from "./domains/permits.js";
import { taxWorkflows } from "./domains/tax.js";
import { unemploymentWorkflows } from "./domains/unemployment.js";
import { educationWorkflows } from "./domains/education.js";
import { identityWorkflows } from "./domains/identity-domain.js";
import { benefitsWorkflows } from "./domains/benefits.js";
import { veteransWorkflows } from "./domains/veterans.js";
import { legalWorkflows } from "./domains/legal.js";
import { estateWorkflows } from "./domains/estate.js";
import { retirementWorkflows } from "./domains/retirement.js";

export type { WorkflowDefinition } from "./types.js";
export type { TaxWorkflowInput } from "./schemas/tax.js";
export type { ImmigrationWorkflowInput } from "./schemas/immigration.js";
export type { HealthcareWorkflowInput } from "./schemas/healthcare.js";
export type { UnemploymentWorkflowInput } from "./schemas/unemployment.js";
export type { PlanningWorkflowInput } from "./schemas/planning.js";

const workflowDefinitions = {
  ...taxWorkflows,
  ...immigrationWorkflows,
  ...immigrationExtWorkflows,
  ...healthcareWorkflows,
  ...healthcareExtWorkflows,
  ...unemploymentWorkflows,
  ...businessWorkflows,
  ...permitsWorkflows,
  ...educationWorkflows,
  ...identityWorkflows,
  ...benefitsWorkflows,
  ...veteransWorkflows,
  ...legalWorkflows,
  ...estateWorkflows,
  ...retirementWorkflows,
} as const;

export type WorkflowId = keyof typeof workflowDefinitions;

const legacyWorkflowAliases: Record<string, WorkflowId> = {
  "1040": "tax/1040",
  "family-visa": "immigration/family-visa-intake",
  "healthcare-enrollment": "healthcare/aca-enrollment",
  "unemployment-claim": "unemployment/claim-intake",
};

export function normalizeWorkflowId(workflowId: string): WorkflowId {
  const directMatch = workflowId as WorkflowId;
  if (directMatch in workflowDefinitions) {
    return directMatch;
  }

  const alias = legacyWorkflowAliases[workflowId];
  if (alias) {
    return alias;
  }

  throw new Error(`Unsupported workflow: ${workflowId}`);
}

export function listWorkflowSummaries(filters?: { domain?: WorkflowDomain }) {
  return Object.values(workflowDefinitions)
    .map((definition) => definition.summary)
    .filter((summary) => (filters?.domain ? summary.domain === filters.domain : true));
}

export function listDomains(): WorkflowDomain[] {
  return [...new Set(Object.values(workflowDefinitions).map((definition) => definition.summary.domain))];
}

function describeField(name: string, schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodDefault) {
    return describeField(name, schema.unwrap() as z.ZodTypeAny);
  }
  if (schema instanceof z.ZodOptional) {
    const child = describeField(name, schema.unwrap() as z.ZodTypeAny);
    return { ...child, optional: true };
  }
  if (schema instanceof z.ZodObject) {
    return {
      name,
      kind: "object",
      fields: Object.entries(schema.shape).map(([childName, childSchema]) =>
        describeField(childName, childSchema as z.ZodTypeAny),
      ),
    };
  }
  if (schema instanceof z.ZodArray) {
    return {
      name,
      kind: "array",
      items: describeField(`${name}[]`, schema.element as z.ZodTypeAny),
    };
  }
  return {
    name,
    kind: schema.constructor.name.replace(/^Zod/, "").toLowerCase(),
  };
}

export function describeWorkflow(workflowId: string) {
  const normalizedId = normalizeWorkflowId(workflowId);
  const definition = workflowDefinitions[normalizedId];
  const schema =
    definition.inputSchema instanceof z.ZodObject
      ? Object.entries(definition.inputSchema.shape).map(([name, value]) =>
          describeField(name, value as z.ZodTypeAny),
        )
      : [];

  return {
    ...definition.summary,
    sections: definition.sections,
    starterData: definition.starterData,
    inputSchema: schema,
  };
}

export function getWorkflowStarterData(workflowId: string) {
  const normalizedId = normalizeWorkflowId(workflowId);
  return structuredClone(workflowDefinitions[normalizedId].starterData) as unknown;
}

export function buildWorkflowBundle(workflowId: string, data: unknown): WorkflowBundle {
  const normalizedId = normalizeWorkflowId(workflowId);
  const definition = workflowDefinitions[normalizedId];
  const parseResult = definition.inputSchema.safeParse(data);

  if (parseResult.success) {
    return definition.buildBundle(parseResult.data as never);
  }

  // Schema validation failed — try building with raw data anyway.
  // Many workflows can still produce a partial bundle with warnings.
  try {
    const bundle = definition.buildBundle(data as never);
    // Add parse errors as flagged fields
    for (const issue of parseResult.error.issues) {
      bundle.validation.flaggedFields.push({
        field: issue.path.join("."),
        severity: "error",
        message: issue.message,
        source: "schema-validation",
      });
    }
    return bundle;
  } catch {
    // buildBundle also crashed — return an error bundle
    const summary = definition.summary;
    return {
      workflowId: summary.id,
      domain: summary.domain,
      title: summary.title,
      summary: summary.summary,
      household: [],
      evidence: [],
      answers: typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {},
      derived: {},
      validation: {
        checks: [],
        flaggedFields: parseResult.error.issues.map((issue) => ({
          field: issue.path.join("."),
          severity: "error" as const,
          message: issue.message,
          source: "schema-validation",
        })),
      },
      review: {
        headline: `${summary.title} — input validation failed`,
        notes: [
          `${parseResult.error.issues.length} field(s) need attention before this workflow can be completed.`,
        ],
        flaggedFields: parseResult.error.issues.map((issue) => ({
          field: issue.path.join("."),
          severity: "error" as const,
          message: issue.message,
          source: "schema-validation",
        })),
      },
      outputArtifacts: [],
      provenance: ["workflow-registry"],
    };
  }
}

export function validateWorkflowBundle(bundle: WorkflowBundle) {
  return bundle.validation;
}

export function reviewWorkflowBundle(bundle: WorkflowBundle) {
  return bundle.review;
}

export function explainWorkflowFlag(bundle: WorkflowBundle, field: string) {
  const flag = bundle.validation.flaggedFields.find((item) => item.field === field);
  if (!flag) {
    return {
      found: false,
      field,
      explanation: "No flag was found for that field.",
    };
  }

  return {
    found: true,
    field,
    severity: flag.severity,
    explanation: flag.message,
    suggestedNextStep:
      flag.severity === "error"
        ? "Resolve the missing or contradictory data before relying on this packet."
        : "Review the underlying evidence with a human before finalizing the packet.",
  };
}

export function isWorkflowBundle(value: unknown): value is WorkflowBundle {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "workflowId" in value && "validation" in value && "review" in value;
}
