/**
 * Shared types mirrored from the PigeonGov engine.
 * These are the subset of engine types the web app actually needs at runtime.
 * We define them here rather than importing from the engine to avoid
 * pulling zod and the full module graph into the Next.js bundle.
 */

export interface WorkflowQuestionOption {
  label: string;
  value: string;
}

export type WorkflowQuestionFieldType =
  | "text"
  | "textarea"
  | "currency"
  | "number"
  | "select"
  | "confirm"
  | "date";

export interface WorkflowQuestionField {
  key: string;
  label: string;
  type: WorkflowQuestionFieldType;
  helpText?: string;
  placeholder?: string;
  options?: WorkflowQuestionOption[];
}

export interface WorkflowQuestionSection {
  id: string;
  title: string;
  description?: string;
  fields: WorkflowQuestionField[];
}

export interface WorkflowSummary {
  id: string;
  domain: string;
  title: string;
  summary: string;
  status: "active" | "preview" | "planned";
  audience: "individual" | "household" | "business";
  tags: string[];
  year?: number;
  legacyFormId?: string;
}

export interface WorkflowDescription extends WorkflowSummary {
  sections: WorkflowQuestionSection[];
  starterData: Record<string, unknown>;
  inputSchema: unknown[];
}

export interface ValidationFlag {
  field: string;
  severity: "warning" | "error" | "review";
  message: string;
  source?: string;
}

export interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "warning" | "error";
  message: string;
}

export interface ReviewSummary {
  headline: string;
  notes: string[];
  flaggedFields: ValidationFlag[];
}

export interface WorkflowArtifact {
  kind: string;
  label: string;
  format: "json" | "pdf" | "checklist" | "summary";
  path?: string;
  content?: unknown;
}

export interface WorkflowBundle {
  workflowId: string;
  domain: string;
  title: string;
  summary: string;
  year?: number;
  legacyFormId?: string;
  household: Array<{
    name: string;
    relationship: string;
    age?: number;
    notes?: string;
  }>;
  evidence: Array<{
    id: string;
    label: string;
    required: boolean;
    status: "provided" | "missing" | "review";
    notes?: string;
    source?: string;
  }>;
  answers: Record<string, unknown>;
  derived: Record<string, unknown>;
  validation: {
    checks: ValidationCheck[];
    flaggedFields: ValidationFlag[];
  };
  review: ReviewSummary;
  outputArtifacts: WorkflowArtifact[];
  provenance: string[];
}
