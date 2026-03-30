export type FilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household"
  | "qualifying_surviving_spouse";

export interface DependentInput {
  name: string;
  ssn: string;
  relationship: string;
  childTaxCreditEligible: boolean;
  eitcEligible?: boolean | undefined;
}

export interface Address {
  street1: string;
  street2?: string | undefined;
  city: string;
  state: string;
  zipCode: string;
}

export interface PersonIdentity {
  firstName: string;
  lastName: string;
  ssn: string;
  address: Address;
}

export interface ValidationFlag {
  field: string;
  severity: "warning" | "error" | "review";
  message: string;
  source?: string | undefined;
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

export interface W2Document {
  type: "w2";
  employerName: string;
  employerEin?: string | undefined;
  wages: number;
  federalWithheld: number;
  socialSecurityWages?: number | undefined;
  medicareWages?: number | undefined;
  employeeName?: string | undefined;
}

export interface Form1099NecDocument {
  type: "1099-nec";
  payerName: string;
  nonemployeeCompensation: number;
  federalWithheld?: number | undefined;
}

export interface Form1099IntDocument {
  type: "1099-int";
  payerName: string;
  interestIncome: number;
  federalWithheld?: number | undefined;
}

export type ImportedDocument = W2Document | Form1099NecDocument | Form1099IntDocument;

export interface TaxBracketBreakdown {
  rate: number;
  lowerBound: number;
  upperBound?: number | undefined;
  taxableAmount: number;
  taxAmount: number;
}

export type WorkflowDomain =
  | "tax"
  | "immigration"
  | "healthcare"
  | "unemployment"
  | "business"
  | "permits";

export type WorkflowArtifactFormat = "json" | "pdf" | "checklist" | "summary";

export interface WorkflowArtifact {
  kind: string;
  label: string;
  format: WorkflowArtifactFormat;
  path?: string | undefined;
  content?: unknown;
}

export interface WorkflowEvidenceItem {
  id: string;
  label: string;
  required: boolean;
  status: "provided" | "missing" | "review";
  notes?: string | undefined;
  source?: string | undefined;
}

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
  helpText?: string | undefined;
  placeholder?: string | undefined;
  options?: WorkflowQuestionOption[] | undefined;
}

export interface WorkflowQuestionSection {
  id: string;
  title: string;
  description?: string | undefined;
  fields: WorkflowQuestionField[];
}

export interface WorkflowDefinitionSummary {
  id: string;
  domain: WorkflowDomain;
  title: string;
  summary: string;
  status: "active" | "preview" | "planned";
  audience: "individual" | "household" | "business";
  tags: string[];
  year?: number | undefined;
  legacyFormId?: string | undefined;
}

export interface WorkflowBundle {
  workflowId: string;
  domain: WorkflowDomain;
  title: string;
  summary: string;
  year?: number | undefined;
  legacyFormId?: string | undefined;
  applicant?: PersonIdentity | undefined;
  household: Array<{
    name: string;
    relationship: string;
    age?: number | undefined;
    notes?: string | undefined;
  }>;
  evidence: WorkflowEvidenceItem[];
  answers: Record<string, unknown>;
  derived: Record<string, unknown>;
  validation: {
    checks: ValidationCheck[];
    flaggedFields: ValidationFlag[];
  };
  review: ReviewSummary;
  outputArtifacts: WorkflowArtifact[];
  provenance: string[];
  filledForm?: unknown;
  calculation?: unknown;
}
