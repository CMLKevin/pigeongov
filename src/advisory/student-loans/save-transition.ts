// ---------------------------------------------------------------------------
// SAVE Transition Advisor
//
// The SAVE plan permanently ended March 10, 2026. ~7.5M borrowers must
// transition by September 30, 2026. This module computes plan comparisons,
// urgent actions, and PSLF risk for affected borrowers.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// FPL 2025 values
// ---------------------------------------------------------------------------

const FPL_BASE = 15_650;
const FPL_PER_PERSON = 5_580;

export function federalPovertyLevel(householdSize: number): number {
  return FPL_BASE + Math.max(0, householdSize - 1) * FPL_PER_PERSON;
}

export function discretionaryIncome150(annualIncome: number, householdSize: number): number {
  return Math.max(0, annualIncome - 1.5 * federalPovertyLevel(householdSize));
}

export function discretionaryIncome225(annualIncome: number, householdSize: number): number {
  return Math.max(0, annualIncome - 2.25 * federalPovertyLevel(householdSize));
}

// ---------------------------------------------------------------------------
// Amortisation helper
// ---------------------------------------------------------------------------

function amortise(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

// ---------------------------------------------------------------------------
// Input / output types
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
// Date helpers
// ---------------------------------------------------------------------------

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

// ---------------------------------------------------------------------------
// Payment calculators
// ---------------------------------------------------------------------------

export function calculateIBRPayment(
  annualIncome: number,
  householdSize: number,
  isNewBorrower: boolean,
): number {
  const di = discretionaryIncome150(annualIncome, householdSize);
  const rate = isNewBorrower ? 0.10 : 0.15;
  return Math.max(0, Math.round((di * rate) / 12 * 100) / 100);
}

export function calculateRAPPayment(
  annualIncome: number,
  householdSize: number,
): number {
  const di = discretionaryIncome225(annualIncome, householdSize);
  const payment = Math.round((di * 0.10) / 12 * 100) / 100;
  // RAP has $10/month minimum — no $0 option
  return Math.max(10, payment);
}

export function calculateICRPayment(
  annualIncome: number,
  householdSize: number,
  loanBalance: number,
  interestRate: number,
): number {
  const di = discretionaryIncome150(annualIncome, householdSize);
  const optionA = Math.round((di * 0.20) / 12 * 100) / 100;
  const optionB = Math.round(amortise(loanBalance, interestRate, 144) * 100) / 100;
  return Math.max(0, Math.min(optionA, optionB));
}

export function calculateStandardPayment(
  loanBalance: number,
  interestRate: number,
): number {
  return Math.round(amortise(loanBalance, interestRate, 120) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Total paid estimator (accounts for forgiveness)
// ---------------------------------------------------------------------------

function estimateTotalPaid(
  monthlyPayment: number,
  loanBalance: number,
  interestRate: number,
  forgivenessMonths: number,
  monthsAlreadyPaid: number,
): { totalPaid: number; months: number; forgivenessAmount: number } {
  const monthlyRate = interestRate / 12;
  let balance = loanBalance;
  let totalPaid = 0;
  const remainingForgivenessMonths = Math.max(0, forgivenessMonths - monthsAlreadyPaid);

  for (let m = 0; m < remainingForgivenessMonths && balance > 0; m++) {
    const interest = balance * monthlyRate;
    const applied = Math.min(monthlyPayment, balance + interest);
    totalPaid += applied;
    balance = balance + interest - applied;
    if (balance <= 0) {
      return { totalPaid, months: m + 1, forgivenessAmount: 0 };
    }
  }

  const forgivenessAmount = Math.max(0, Math.round(balance * 100) / 100);
  return {
    totalPaid: Math.round(totalPaid * 100) / 100,
    months: remainingForgivenessMonths,
    forgivenessAmount,
  };
}

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

export function analyzeSaveTransition(input: SaveTransitionInput): SaveTransitionResult {
  // Early return for zero/negative balance — no repayment analysis needed
  if (input.loanBalance <= 0) {
    return {
      urgentActions: [],
      planComparison: [],
      pslf: {
        eligible: false,
        paymentsRemaining: 0,
        estimatedForgivenessDate: null,
        atRisk: false,
        riskReason: null,
      },
      recommendation: "No outstanding loan balance. No repayment plan needed.",
      consolidationDeadline: null,
    };
  }

  const now = new Date("2026-03-31");

  // -----------------------------------------------------------------------
  // Urgent actions
  // -----------------------------------------------------------------------
  const urgentActions: UrgentAction[] = [];

  if (input.currentPlan === "SAVE" || input.currentPlan === "REPAYE") {
    urgentActions.push({
      action: "Select a new repayment plan immediately — SAVE/REPAYE no longer exists",
      deadline: "2026-09-30",
      consequence:
        "Borrowers who do not select a plan by September 30, 2026 will be placed on the standard plan, potentially tripling monthly payments.",
    });
  }

  if (input.monthsInSaveForbearance > 0) {
    urgentActions.push({
      action:
        `${input.monthsInSaveForbearance} months in SAVE forbearance do NOT count toward IDR forgiveness — ` +
        "consider PSLF buyback if eligible",
      deadline: "2026-09-30",
      consequence:
        "Those months are lost time toward forgiveness. Enrolling in an active IDR plan restarts the clock.",
    });
  }

  if (input.isParentPlusLoan && !input.hasConsolidatedLoans) {
    urgentActions.push({
      action: "Consolidate Parent PLUS loans via Direct Consolidation Loan to access IDR plans",
      deadline: "2026-07-01",
      consequence:
        "After July 1, 2026, consolidated Parent PLUS loans may only access ICR (the most expensive IDR plan). " +
        "Consolidating before that date preserves access to IBR.",
    });
  }

  // Always flag the SAVE end
  if (input.currentPlan === "SAVE" || input.currentPlan === "REPAYE") {
    urgentActions.push({
      action: "SAVE plan permanently ended by court order on March 10, 2026",
      deadline: "2026-03-10",
      consequence:
        "All SAVE/REPAYE enrollees placed in administrative forbearance. " +
        "Forbearance months do not count toward any forgiveness program.",
    });
  }

  // -----------------------------------------------------------------------
  // Plan comparison
  // -----------------------------------------------------------------------
  const plans: PlanComparisonEntry[] = [];

  // Standard 10-year
  const stdPayment = calculateStandardPayment(input.loanBalance, input.interestRate);
  const stdTotal = Math.round(stdPayment * 120 * 100) / 100;
  plans.push({
    plan: "Standard (10-year)",
    monthlyPayment: stdPayment,
    totalPaid: stdTotal,
    forgivenessDate: null,
    forgivenessAmount: 0,
    yearsToPayoff: 10,
  });

  // IBR (old) — 15%, 25 years
  const ibrOldPayment = calculateIBRPayment(input.annualIncome, input.householdSize, false);
  const ibrOldEst = estimateTotalPaid(ibrOldPayment, input.loanBalance, input.interestRate, 300, input.monthsInRepayment);
  const ibrOldForgivenessDate = addMonths(now, ibrOldEst.months);
  plans.push({
    plan: "IBR (pre-2014, 15%)",
    monthlyPayment: ibrOldPayment,
    totalPaid: ibrOldEst.totalPaid,
    forgivenessDate: ibrOldEst.forgivenessAmount > 0 ? formatDate(ibrOldForgivenessDate) : null,
    forgivenessAmount: ibrOldEst.forgivenessAmount,
    yearsToPayoff: Math.round((ibrOldEst.months / 12) * 10) / 10,
  });

  // IBR (new) — 10%, 20 years
  const ibrNewPayment = calculateIBRPayment(input.annualIncome, input.householdSize, true);
  const ibrNewEst = estimateTotalPaid(ibrNewPayment, input.loanBalance, input.interestRate, 240, input.monthsInRepayment);
  const ibrNewForgivenessDate = addMonths(now, ibrNewEst.months);
  plans.push({
    plan: "IBR (post-July 2014, 10%)",
    monthlyPayment: ibrNewPayment,
    totalPaid: ibrNewEst.totalPaid,
    forgivenessDate: ibrNewEst.forgivenessAmount > 0 ? formatDate(ibrNewForgivenessDate) : null,
    forgivenessAmount: ibrNewEst.forgivenessAmount,
    yearsToPayoff: Math.round((ibrNewEst.months / 12) * 10) / 10,
  });

  // RAP (new) — 10% of (AGI - 225% FPL), min $10/mo, 30 years
  const rapPayment = calculateRAPPayment(input.annualIncome, input.householdSize);
  const rapEst = estimateTotalPaid(rapPayment, input.loanBalance, input.interestRate, 360, input.monthsInRepayment);
  const rapForgivenessDate = addMonths(now, rapEst.months);
  plans.push({
    plan: "RAP (new, 10%, min $10/mo)",
    monthlyPayment: rapPayment,
    totalPaid: rapEst.totalPaid,
    forgivenessDate: rapEst.forgivenessAmount > 0 ? formatDate(rapForgivenessDate) : null,
    forgivenessAmount: rapEst.forgivenessAmount,
    yearsToPayoff: Math.round((rapEst.months / 12) * 10) / 10,
  });

  // ICR — 20% DI or 12-year fixed, whichever lower, 25 years
  const icrPayment = calculateICRPayment(
    input.annualIncome,
    input.householdSize,
    input.loanBalance,
    input.interestRate,
  );
  const icrEst = estimateTotalPaid(icrPayment, input.loanBalance, input.interestRate, 300, input.monthsInRepayment);
  const icrForgivenessDate = addMonths(now, icrEst.months);
  plans.push({
    plan: "ICR (20% DI / 12-yr fixed)",
    monthlyPayment: icrPayment,
    totalPaid: icrEst.totalPaid,
    forgivenessDate: icrEst.forgivenessAmount > 0 ? formatDate(icrForgivenessDate) : null,
    forgivenessAmount: icrEst.forgivenessAmount,
    yearsToPayoff: Math.round((icrEst.months / 12) * 10) / 10,
  });

  // -----------------------------------------------------------------------
  // PSLF assessment
  // -----------------------------------------------------------------------
  const pslfEmployerEligible =
    input.employerType === "government" || input.employerType === "nonprofit";

  // Qualifying payments: months of PSLF employment that overlap with active
  // repayment (not forbearance).
  const qualifyingPayments = Math.min(input.monthsOfPSLFEmployment, input.monthsInRepayment);
  const paymentsRemaining = Math.max(0, 120 - qualifyingPayments);

  // Risk assessment for 2026 PSLF changes
  let atRisk = false;
  let riskReason: string | null = null;

  if (pslfEmployerEligible && input.employerType === "nonprofit") {
    atRisk = true;
    riskReason =
      "Under 2026 PSLF rules, forgiveness is denied if employer engages in politically targeted activities. " +
      "Non-profit employers face heightened scrutiny. Verify employer certification annually.";
  }

  const pslfForgivenessDate =
    pslfEmployerEligible && paymentsRemaining > 0
      ? formatDate(addMonths(now, paymentsRemaining))
      : pslfEmployerEligible && paymentsRemaining === 0
        ? formatDate(now)
        : null;

  const pslf: PSLFAssessment = {
    eligible: pslfEmployerEligible,
    paymentsRemaining,
    estimatedForgivenessDate: pslfForgivenessDate,
    atRisk,
    riskReason,
  };

  // -----------------------------------------------------------------------
  // Consolidation deadline
  // -----------------------------------------------------------------------
  const consolidationDeadline =
    input.isParentPlusLoan && !input.hasConsolidatedLoans ? "2026-07-01" : null;

  // -----------------------------------------------------------------------
  // Recommendation
  // -----------------------------------------------------------------------
  let recommendation: string;

  if (pslfEmployerEligible && paymentsRemaining <= 60) {
    recommendation =
      `PSLF is your best path. You have ${qualifyingPayments} qualifying payments and need ${paymentsRemaining} more. ` +
      "Enroll in IBR (post-2014) or RAP for the lowest monthly payment while completing PSLF. " +
      `Estimated forgiveness: ${pslfForgivenessDate ?? "unknown"}.`;
  } else if (pslfEmployerEligible) {
    const lowestIDR = plans
      .filter((p) => p.plan !== "Standard (10-year)")
      .reduce((min, p) => (p.monthlyPayment < min.monthlyPayment ? p : min));
    recommendation =
      `PSLF is available but you have ${paymentsRemaining} payments remaining (${Math.ceil(paymentsRemaining / 12)} years). ` +
      `Enroll in ${lowestIDR.plan} at $${lowestIDR.monthlyPayment}/month to minimize payments while pursuing forgiveness.`;
  } else if (input.isParentPlusLoan && !input.hasConsolidatedLoans) {
    recommendation =
      "URGENT: Consolidate your Parent PLUS loans before July 1, 2026 to preserve access to IBR. " +
      "After that date, only ICR will be available, which has significantly higher payments.";
  } else {
    // Find lowest total cost plan
    const lowestTotal = plans.reduce((min, p) => (p.totalPaid < min.totalPaid ? p : min));
    const lowestMonthly = plans
      .filter((p) => p.plan !== "Standard (10-year)")
      .reduce((min, p) => (p.monthlyPayment < min.monthlyPayment ? p : min));

    if (lowestMonthly.monthlyPayment < stdPayment * 0.5) {
      recommendation =
        `${lowestMonthly.plan} offers the lowest monthly payment at $${lowestMonthly.monthlyPayment}/month ` +
        `(vs. $${stdPayment}/month standard). ` +
        (lowestMonthly.forgivenessAmount > 0
          ? `Estimated forgiveness of $${lowestMonthly.forgivenessAmount.toLocaleString()} after ${lowestMonthly.yearsToPayoff} years.`
          : `Total cost: $${lowestMonthly.totalPaid.toLocaleString()}.`);
    } else {
      recommendation =
        `${lowestTotal.plan} has the lowest total cost at $${lowestTotal.totalPaid.toLocaleString()}. ` +
        `Monthly payment: $${lowestTotal.monthlyPayment}/month over ${lowestTotal.yearsToPayoff} years.`;
    }
  }

  if (input.monthsInSaveForbearance > 0) {
    recommendation +=
      ` WARNING: ${input.monthsInSaveForbearance} months in SAVE forbearance did not count toward forgiveness.`;
  }

  return {
    urgentActions,
    planComparison: plans,
    pslf,
    recommendation,
    consolidationDeadline,
  };
}
