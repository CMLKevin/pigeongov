/**
 * Types for the student-loans advisory engine output.
 *
 * Mirrors the shapes exported by:
 *   src/advisory/student-loans/save-transition.ts
 *   src/advisory/student-loans/pslf-tracker.ts
 *
 * Defined here to avoid importing engine internals into the Next.js bundle.
 */

// ---------------------------------------------------------------------------
// Transition advisor
// ---------------------------------------------------------------------------

export interface SaveTransitionInput {
  currentPlan: "SAVE" | "PAYE" | "IBR" | "ICR" | "REPAYE" | "standard";
  loanBalance: number;
  interestRate: number;
  annualIncome: number;
  householdSize: number;
  state: string;
  filingStatus: "single" | "married_filing_jointly" | "married_filing_separately";
  monthsInRepayment: number;
  monthsInSaveForbearance: number;
  isParentPlusLoan: boolean;
  hasConsolidatedLoans: boolean;
  employerType: "government" | "nonprofit" | "forprofit" | "other";
  monthsOfPSLFEmployment: number;
}

export interface PlanComparisonEntry {
  plan: string;
  monthlyPayment: number;
  totalPaid: number;
  forgivenessDate: string | null;
  forgivenessAmount: number;
  yearsToPayoff: number;
}

export interface UrgentAction {
  action: string;
  deadline: string;
  consequence: string;
}

export interface PSLFAssessment {
  eligible: boolean;
  paymentsRemaining: number;
  estimatedForgivenessDate: string | null;
  atRisk: boolean;
  riskReason: string | null;
}

export interface SaveTransitionResult {
  urgentActions: UrgentAction[];
  planComparison: PlanComparisonEntry[];
  pslf: PSLFAssessment;
  recommendation: string;
  consolidationDeadline: string | null;
}

// ---------------------------------------------------------------------------
// PSLF tracker
// ---------------------------------------------------------------------------

export interface PSLFTrackerInput {
  qualifyingPaymentsMade: number;
  monthsInForbearance: number;
  monthsInDeferment: number;
  employerType: "government" | "nonprofit" | "forprofit" | "other";
  employerName?: string;
  loanBalance: number;
  annualIncome: number;
  householdSize: number;
  isOnIDRPlan: boolean;
  currentMonthlyPayment: number;
}

export interface PSLFRiskAssessment {
  level: "low" | "medium" | "high" | "ineligible";
  reason: string;
}

export interface PSLFBuybackOpportunity {
  eligible: boolean;
  monthsAvailable: number;
  estimatedCost: number;
  benefitDescription: string;
}

export interface PSLFTrackerResult {
  qualifyingPayments: number;
  paymentsNeeded: number;
  paymentsRemaining: number;
  progressPercent: number;
  estimatedForgivenessDate: string | null;
  estimatedForgivenessAmount: number;
  employerEligible: boolean;
  riskAssessment: PSLFRiskAssessment;
  buybackOpportunity: PSLFBuybackOpportunity;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Compare (reuses transition engine, narrower output)
// ---------------------------------------------------------------------------

export interface CompareResult {
  input: {
    loanBalance: number;
    interestRate: number;
    annualIncome: number;
    householdSize: number;
  };
  plans: PlanComparisonEntry[];
  recommendation: string;
}
