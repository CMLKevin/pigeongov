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

export interface Form1098Document {
  type: "1098";
  lenderName: string;
  mortgageInterest: number;
  mortgageInsurancePremiums?: number | undefined;
  pointsPaid?: number | undefined;
  outstandingPrincipal?: number | undefined;
  federalWithheld?: number | undefined;
}

export interface Form1095ADocument {
  type: "1095-a";
  marketplaceName: string;
  policyNumber?: string | undefined;
  monthlyPremiums: number[];
  monthlySlcsp: number[];
  monthlyAdvancePtc: number[];
}

export interface Form1099DivDocument {
  type: "1099-div";
  payerName: string;
  ordinaryDividends: number;
  qualifiedDividends: number;
  totalCapitalGainDistributions?: number | undefined;
  federalWithheld?: number | undefined;
}

export interface Form1099BDocument {
  type: "1099-b";
  brokerName: string;
  proceeds: number;
  costBasis: number;
  gainOrLoss?: number | undefined;
  shortTerm: boolean;
  federalWithheld?: number | undefined;
}

export interface Form1099RDocument {
  type: "1099-r";
  payerName: string;
  grossDistribution: number;
  taxableAmount: number;
  distributionCode?: string | undefined;
  federalWithheld?: number | undefined;
}

export interface K1Document {
  type: "k-1";
  partnershipName: string;
  partnershipEin?: string | undefined;
  ordinaryIncome: number;
  rentalIncome?: number | undefined;
  interestIncome?: number | undefined;
  dividends?: number | undefined;
  capitalGains?: number | undefined;
}

export type ImportedDocument =
  | W2Document
  | Form1099NecDocument
  | Form1099IntDocument
  | Form1098Document
  | Form1095ADocument
  | Form1099DivDocument
  | Form1099BDocument
  | Form1099RDocument
  | K1Document;

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
  | "permits"
  | "education"
  | "retirement"
  | "identity"
  | "benefits"
  | "veterans"
  | "legal"
  | "estate";

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

// --- Structured output & error contract ---

export interface PigeonGovErrorShape {
  error: string;
  message: string;
  field?: string | undefined;
  suggestion?: string | undefined;
  retryable: boolean;
  docs?: string | undefined;
  exitCode: number;
}

export interface StructuredOutput<T = unknown> {
  ok: boolean;
  data?: T | undefined;
  error?: PigeonGovErrorShape | undefined;
  exitCode: number;
}

// --- Storage & infrastructure types ---

export interface HouseholdProfile {
  id: string;
  people: PersonRecord[];
  address: Address;
  income?: IncomeProfile | undefined;
  updatedAt: string;
}

export interface PersonRecord {
  id: string;
  firstName: string;
  lastName: string;
  ssn?: string | undefined;
  dob?: string | undefined;
  relationship: "self" | "spouse" | "child" | "parent" | "other";
}

export interface IncomeProfile {
  taxYear: number;
  sources: Array<{ label: string; amount: number; type: string }>;
  totalGross: number;
}

export interface DraftMetadata {
  id: string;
  workflowId: string;
  schemaVersion: string;
  answers: Record<string, unknown>;
  completedSections: string[];
  resumePoint?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEntry {
  id: string;
  filename: string;
  mimeType: string;
  tags: string[];
  linkedWorkflows: string[];
  addedAt: string;
  sizeBytes: number;
  checksum: string;
}

export interface WorkflowDeadline {
  workflowId: string;
  label: string;
  date: string;
  type: "hard" | "soft";
  consequence: string;
  extensionAvailable: boolean;
}

export interface WorkflowFee {
  workflowId: string;
  label: string;
  amount: number;
  currency: "USD";
  type: "filing" | "biometric" | "expedite" | "optional";
  waivable: boolean;
  waiverCriteria?: string | undefined;
}

export interface GlossaryEntry {
  term: string;
  abbreviation?: string | undefined;
  domain: WorkflowDomain;
  definition: string;
  officialDefinition?: string | undefined;
  source?: string | undefined;
  relatedTerms?: string[] | undefined;
}

// --- Advisory types ---

export interface LifeEvent {
  id: string;
  label: string;
  description: string;
  workflows: LifeEventWorkflow[];
}

export interface LifeEventWorkflow {
  workflowId: string;
  priority: number;
  deadline?: string | undefined;
  dependsOn?: string[] | undefined;
  notes: string;
}

export interface EligibilityResult {
  workflowId: string;
  eligible: "likely" | "possible" | "unlikely" | "ineligible";
  confidence: number;
  reason: string;
  nextSteps: string[];
}

// --- Tax engine extensions ---

export interface CapitalGainsInput {
  transactions: Array<{
    description: string;
    dateAcquired: string;
    dateSold: string;
    proceeds: number;
    costBasis: number;
    shortTerm: boolean;
  }>;
}

export interface DividendDetailInput {
  ordinaryDividends: number;
  qualifiedDividends: number;
  capitalGainDistributions?: number | undefined;
}

export interface RentalIncomeInput {
  propertyAddress: string;
  grossRent: number;
  expenses: number;
  depreciation: number;
  netIncome: number;
}

export interface HsaInput {
  contributions: number;
  employerContributions: number;
  distributions: number;
  qualifiedMedicalExpenses: number;
}

export interface CryptoTransactionInput {
  exchange: string;
  asset: string;
  dateAcquired: string;
  dateSold: string;
  proceeds: number;
  costBasis: number;
  transactionType: "trade" | "staking" | "lending" | "airdrop" | "mining";
}

export interface EquityCompensationInput {
  type: "rsu" | "iso" | "nso" | "espp";
  grantDate: string;
  vestDate?: string | undefined;
  exerciseDate?: string | undefined;
  shares: number;
  fairMarketValue: number;
  exercisePrice?: number | undefined;
  salePrice?: number | undefined;
  saleDate?: string | undefined;
}

// --- Plugin types ---

export interface WorkflowPlugin {
  name: string;
  version: string;
  author?: string | undefined;
  license?: string | undefined;
  workflows: Array<{
    summary: WorkflowDefinitionSummary;
    inputSchema: unknown;
    starterData: unknown;
    sections: WorkflowQuestionSection[];
    buildBundle: (input: unknown) => WorkflowBundle;
  }>;
  glossaryTerms?: GlossaryEntry[] | undefined;
}
