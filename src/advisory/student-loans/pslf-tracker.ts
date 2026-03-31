// ---------------------------------------------------------------------------
// PSLF (Public Service Loan Forgiveness) Tracker
//
// Tracks qualifying payment progress toward the 120-payment PSLF threshold,
// assesses employer risk under 2026 rules, and computes buyback opportunity
// for months spent in forbearance or deferment.
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

export interface PSLFTrackerResult {
  qualifyingPayments: number;
  paymentsNeeded: number;
  paymentsRemaining: number;
  progressPercent: number;
  estimatedForgivenessDate: string | null;
  estimatedForgivenessAmount: number;
  employerEligible: boolean;
  riskAssessment: {
    level: "low" | "medium" | "high" | "ineligible";
    reason: string;
  };
  buybackOpportunity: {
    eligible: boolean;
    monthsAvailable: number;
    estimatedCost: number;
    benefitDescription: string;
  };
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Core tracker
// ---------------------------------------------------------------------------

export function trackPSLF(input: PSLFTrackerInput): PSLFTrackerResult {
  const now = new Date("2026-03-31");

  const qualifyingPayments = Math.min(120, Math.max(0, input.qualifyingPaymentsMade));
  const paymentsNeeded = 120;
  const paymentsRemaining = Math.max(0, paymentsNeeded - qualifyingPayments);
  const progressPercent = Math.round((qualifyingPayments / paymentsNeeded) * 100 * 10) / 10;

  // Employer eligibility
  const employerEligible =
    input.employerType === "government" || input.employerType === "nonprofit";

  // Risk assessment under 2026 rules
  let riskLevel: "low" | "medium" | "high" | "ineligible";
  let riskReason: string;

  if (!employerEligible) {
    riskLevel = "ineligible";
    riskReason =
      "PSLF requires employment with a government agency or qualifying non-profit (501(c)(3)). " +
      "For-profit and other employers do not qualify.";
  } else if (input.employerType === "government") {
    riskLevel = "low";
    riskReason =
      "Government employers are the safest category for PSLF. " +
      "The 2026 political-activity exclusion primarily targets non-profit organizations.";
  } else {
    // Non-profit: heightened scrutiny under 2026 rules
    riskLevel = "medium";
    riskReason =
      "Under 2026 PSLF changes, forgiveness is denied if your non-profit employer " +
      "engages in politically targeted activities. Submit employer certification (ECF) " +
      "annually and verify your employer's continued qualifying status.";
  }

  if (!input.isOnIDRPlan && employerEligible) {
    riskLevel = riskLevel === "low" ? "medium" : "high";
    riskReason +=
      " You are not currently on an IDR plan — only IDR or 10-year standard plan " +
      "payments count toward PSLF.";
  }

  // Forgiveness date
  const estimatedForgivenessDate =
    employerEligible && paymentsRemaining > 0
      ? formatDate(addMonths(now, paymentsRemaining))
      : employerEligible && paymentsRemaining === 0
        ? formatDate(now)
        : null;

  // Forgiveness amount estimate (rough: current balance minus what will be paid)
  const estimatedForgivenessAmount = employerEligible
    ? Math.max(0, Math.round(
        (input.loanBalance - input.currentMonthlyPayment * paymentsRemaining) * 100,
      ) / 100)
    : 0;

  // Buyback opportunity: months in forbearance/deferment that could be purchased
  const buybackMonths = input.monthsInForbearance + input.monthsInDeferment;
  const buybackEligible = buybackMonths > 0 && employerEligible;
  // Estimated buyback cost: each month costs what a qualifying payment would have been
  const estimatedBuybackCost = buybackEligible
    ? Math.round(input.currentMonthlyPayment * buybackMonths * 100) / 100
    : 0;

  const buybackBenefit = buybackEligible
    ? `Purchasing ${buybackMonths} months of forbearance/deferment time could accelerate ` +
      `forgiveness by up to ${buybackMonths} months, potentially saving thousands in payments.`
    : buybackMonths > 0
      ? "Buyback is only available for PSLF-eligible borrowers."
      : "No forbearance or deferment months to buy back.";

  // Recommendations
  const recommendations: string[] = [];

  if (!employerEligible) {
    recommendations.push(
      "Consider switching to a qualifying employer to access PSLF. " +
      "Government agencies and 501(c)(3) non-profits qualify.",
    );
  }

  if (employerEligible && !input.isOnIDRPlan) {
    recommendations.push(
      "Enroll in an IDR plan immediately. Only IDR plan payments or 10-year standard " +
      "payments count toward PSLF's 120-payment requirement.",
    );
  }

  if (employerEligible && paymentsRemaining <= 24) {
    recommendations.push(
      `You are within ${paymentsRemaining} payments of PSLF forgiveness. ` +
      "Submit ECF immediately and ensure all qualifying payments are properly credited.",
    );
  }

  if (buybackEligible && paymentsRemaining > 0) {
    const newRemaining = Math.max(0, paymentsRemaining - buybackMonths);
    recommendations.push(
      `Buying back ${buybackMonths} months could reduce your remaining payments from ` +
      `${paymentsRemaining} to ${newRemaining} (estimated cost: $${estimatedBuybackCost.toLocaleString()}).`,
    );
  }

  if (employerEligible && input.employerType === "nonprofit") {
    recommendations.push(
      "Submit ECF annually. Under 2026 rules, verify your employer does not engage in " +
      "politically targeted activities that could disqualify PSLF forgiveness.",
    );
  }

  if (qualifyingPayments === 0 && employerEligible) {
    recommendations.push(
      "Start making qualifying payments on an IDR plan as soon as possible. " +
      "Each month of delay adds a month to your PSLF timeline.",
    );
  }

  return {
    qualifyingPayments,
    paymentsNeeded,
    paymentsRemaining,
    progressPercent,
    estimatedForgivenessDate,
    estimatedForgivenessAmount,
    employerEligible,
    riskAssessment: { level: riskLevel, reason: riskReason },
    buybackOpportunity: {
      eligible: buybackEligible,
      monthsAvailable: buybackMonths,
      estimatedCost: estimatedBuybackCost,
      benefitDescription: buybackBenefit,
    },
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}
