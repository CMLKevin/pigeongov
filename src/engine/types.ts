import type {
  CapitalGainsInput,
  CryptoTransactionInput,
  DividendDetailInput,
  EquityCompensationInput,
  FilingStatus,
  HsaInput,
  RentalIncomeInput,
  ValidationCheck,
} from "../types.js";

// ---------------------------------------------------------------------------
// Form Plugin Interface
// ---------------------------------------------------------------------------

export interface FormPlugin {
  formId: string;
  displayName: string;
  triggerCondition: (input: TaxOrchestratorInput) => boolean;
  dependencies: string[];
  calculate: (
    input: TaxOrchestratorInput,
    intermediateResults: Map<string, unknown>,
  ) => unknown;
  validate: (result: unknown, input: TaxOrchestratorInput) => ValidationCheck[];
  mapToFormLines: (result: unknown) => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Orchestrator Input — superset of TaxCalculationInput with Phase 2 extensions
// ---------------------------------------------------------------------------

export interface TaxOrchestratorInput {
  filingStatus: FilingStatus;
  wages: number;
  taxableInterest: number;
  ordinaryDividends: number;
  scheduleCNet: number;
  otherIncome: number;
  adjustments: {
    educatorExpenses: number;
    hsaDeduction: number;
    selfEmploymentTaxDeduction: number;
    iraDeduction: number;
    studentLoanInterest: number;
  };
  useItemizedDeductions: boolean;
  itemizedDeductions: number;
  dependents: Array<{
    name: string;
    ssn: string;
    relationship: string;
    childTaxCreditEligible: boolean;
    eitcEligible?: boolean | undefined;
  }>;
  federalWithheld: number;
  estimatedPayments: number;

  // Phase 2 extensions — all optional
  capitalGains?: CapitalGainsInput | undefined;
  dividendsDetail?: DividendDetailInput | undefined;
  rentalIncome?: RentalIncomeInput[] | undefined;
  hsaActivity?: HsaInput | undefined;
  cryptoTransactions?: CryptoTransactionInput[] | undefined;
  equityCompensation?: EquityCompensationInput[] | undefined;

  // OBBB Act fields — all optional with 0 defaults
  tipIncome?: number | undefined;
  overtimePay?: number | undefined;
  autoLoanInterest?: number | undefined;
  taxpayerAge?: number | undefined;
  spouseAge?: number | undefined;
  saltDeduction?: number | undefined;
}

// ---------------------------------------------------------------------------
// Orchestrator Result
// ---------------------------------------------------------------------------

export interface OrchestratorResult {
  coreResult: unknown;
  formResults: Map<string, unknown>;
  allValidationChecks: ValidationCheck[];
  triggeredForms: string[];
  formLinesMerged: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// State Tax Plugin (future — interface defined now for forward compatibility)
// ---------------------------------------------------------------------------

export interface StateTaxPlugin {
  stateCode: string;
  displayName: string;
  taxType: "progressive" | "flat" | "none";
  calculate: (
    federalResult: unknown,
    stateInput: StateTaxInput,
  ) => StateTaxResult;
  validate: (result: StateTaxResult) => ValidationCheck[];
}

export interface StateTaxInput {
  residencyStatus: "full-year" | "part-year" | "nonresident";
  stateWages: number;
  stateWithholding: number;
  localTaxInput?: Record<string, unknown> | undefined;
}

export interface StateTaxResult {
  stateCode: string;
  stateTaxableIncome: number;
  stateTax: number;
  stateCredits: number;
  localTax: number;
  totalStateTax: number;
  stateRefund: number;
  stateOwed: number;
  breakdown: Array<{
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }>;
}
