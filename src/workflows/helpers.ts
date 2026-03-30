import type {
  ReviewSummary,
  ValidationCheck,
  ValidationFlag,
  WorkflowArtifact,
  WorkflowEvidenceItem,
} from "../types.js";

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function slugifyWorkflowId(workflowId: string): string {
  return workflowId.replace(/[^\w]+/g, "-");
}

export function makeCheck(
  id: string,
  label: string,
  passed: boolean,
  severity: "warning" | "error",
  message: string,
): ValidationCheck {
  return { id, label, passed, severity, message };
}

export function makeFlag(
  field: string,
  severity: "warning" | "error" | "review",
  message: string,
  source = "workflow",
): ValidationFlag {
  return { field, severity, message, source };
}

export function buildEvidenceItem(
  id: string,
  label: string,
  required: boolean,
  provided: boolean,
  reviewNote?: string,
): WorkflowEvidenceItem {
  if (reviewNote) {
    return {
      id,
      label,
      required,
      status: "review",
      notes: reviewNote,
      source: "user-input",
    };
  }

  return {
    id,
    label,
    required,
    status: provided ? "provided" : "missing",
    source: "user-input",
  };
}

export function buildGenericSummary(
  title: string,
  readinessLabel: string,
  evidence: WorkflowEvidenceItem[],
  flags: ValidationFlag[],
  notes: string[],
): ReviewSummary {
  const complete = evidence.filter((item) => item.status === "provided").length;
  return {
    headline: `${title}: ${readinessLabel} (${complete}/${evidence.length} evidence items ready)`,
    notes,
    flaggedFields: flags,
  };
}

export function genericArtifacts(workflowId: string, evidence: WorkflowEvidenceItem[]): WorkflowArtifact[] {
  return [
    {
      kind: "bundle",
      label: "Workflow bundle JSON",
      format: "json",
      path: `${slugifyWorkflowId(workflowId)}-bundle.json`,
    },
    {
      kind: "review",
      label: "Review PDF",
      format: "pdf",
      path: `${slugifyWorkflowId(workflowId)}-review.pdf`,
    },
    {
      kind: "checklist",
      label: "Evidence checklist",
      format: "checklist",
      content: evidence,
    },
  ];
}
