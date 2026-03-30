import type { WorkflowFee } from "../types.js";

/**
 * Filter fees by workflow ID.
 */
export function getWorkflowFees(fees: WorkflowFee[], workflowId: string): WorkflowFee[] {
  return fees.filter((f) => f.workflowId === workflowId);
}

/**
 * Sum fee amounts, optionally including optional fees.
 */
export function calculateTotalFees(
  fees: WorkflowFee[],
  options?: { includeOptional?: boolean },
): number {
  const includeOptional = options?.includeOptional ?? false;
  return fees
    .filter((f) => includeOptional || f.type !== "optional")
    .reduce((sum, f) => sum + f.amount, 0);
}

/**
 * Hardcoded fee data for existing workflows.
 */
export const DEFAULT_FEES: WorkflowFee[] = [
  // tax/1040 — no fees
  {
    workflowId: "tax/1040",
    label: "No filing fee",
    amount: 0,
    currency: "USD",
    type: "filing",
    waivable: false,
  },
  // immigration/family-visa-intake
  {
    workflowId: "immigration/family-visa-intake",
    label: "I-130 Petition filing fee",
    amount: 675,
    currency: "USD",
    type: "filing",
    waivable: false,
  },
  {
    workflowId: "immigration/family-visa-intake",
    label: "I-485 Adjustment of Status filing fee",
    amount: 1440,
    currency: "USD",
    type: "filing",
    waivable: true,
    waiverCriteria: "Income below 150% FPL; use Form I-912",
  },
  {
    workflowId: "immigration/family-visa-intake",
    label: "Biometrics services fee",
    amount: 85,
    currency: "USD",
    type: "biometric",
    waivable: true,
    waiverCriteria: "Included in I-485 fee waiver if approved",
  },
  // healthcare/aca-enrollment — no fees
  {
    workflowId: "healthcare/aca-enrollment",
    label: "No enrollment fee",
    amount: 0,
    currency: "USD",
    type: "filing",
    waivable: false,
  },
  // unemployment/claim-intake — no fees
  {
    workflowId: "unemployment/claim-intake",
    label: "No filing fee",
    amount: 0,
    currency: "USD",
    type: "filing",
    waivable: false,
  },
  // business/license-starter
  {
    workflowId: "business/license-starter",
    label: "Business license filing fee (varies by state)",
    amount: 100,
    currency: "USD",
    type: "filing",
    waivable: false,
  },
  // permits/local-permit-planner
  {
    workflowId: "permits/local-permit-planner",
    label: "Permit application fee (varies by locality)",
    amount: 75,
    currency: "USD",
    type: "filing",
    waivable: false,
  },
];
