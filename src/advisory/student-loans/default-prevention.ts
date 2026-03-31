// ---------------------------------------------------------------------------
// Default Prevention Navigator
//
// For borrowers at risk of or already in default on federal student loans.
// ~5M borrowers defaulted October 2025; 10M projected by end of 2026.
// ---------------------------------------------------------------------------

import { discretionaryIncome150 } from "./save-transition.js";

export interface DefaultPreventionInput {
  isInDefault: boolean;
  monthsSinceDefault: number;
  loanBalance: number;
  annualIncome: number;
  householdSize: number;
  hasWageGarnishment: boolean;
  hasTreasuryOffset: boolean;
  previousRehabAttempts: number;
  isWillingToConsolidate: boolean;
}

export interface RehabilitationOption {
  eligible: boolean;
  monthlyPayment: number;
  totalPayments: number;
  duration: string;
  description: string;
  benefits: string[];
  limitations: string[];
}

export interface ConsolidationOption {
  eligible: boolean;
  description: string;
  benefits: string[];
  limitations: string[];
  requiredPlan: string;
}

export interface DefaultPreventionResult {
  status: "pre-default" | "in-default" | "post-rehab";
  rehabilitation: RehabilitationOption;
  consolidation: ConsolidationOption;
  idrEnrollment: {
    recommended: boolean;
    suggestedPlan: string;
    estimatedMonthlyPayment: number;
    description: string;
  };
  freshStart: {
    available: boolean;
    description: string;
  };
  urgentActions: Array<{ action: string; priority: number; note: string }>;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Core navigator
// ---------------------------------------------------------------------------

export function navigateDefaultPrevention(
  input: DefaultPreventionInput,
): DefaultPreventionResult {
  const di = discretionaryIncome150(input.annualIncome, input.householdSize);

  // Status determination
  const status: "pre-default" | "in-default" | "post-rehab" = input.isInDefault
    ? "in-default"
    : input.previousRehabAttempts > 0
      ? "post-rehab"
      : "pre-default";

  // -----------------------------------------------------------------------
  // Rehabilitation option
  // -----------------------------------------------------------------------
  // 9 voluntary payments of 15% of discretionary income / 12
  const rehabMonthlyPayment = Math.max(5, Math.round((di * 0.15) / 12 * 100) / 100);
  const rehabEligible = input.isInDefault && input.previousRehabAttempts === 0;

  const rehabilitation: RehabilitationOption = {
    eligible: rehabEligible,
    monthlyPayment: rehabMonthlyPayment,
    totalPayments: 9,
    duration: "9 months (payments within 10 consecutive months)",
    description: rehabEligible
      ? `Make 9 voluntary, on-time payments of $${rehabMonthlyPayment}/month within 10 consecutive months to exit default.`
      : input.previousRehabAttempts > 0
        ? "Rehabilitation can only be used once per loan. You have already used your rehabilitation opportunity."
        : "Rehabilitation is only available for loans currently in default.",
    benefits: rehabEligible
      ? [
          "Default removed from credit report",
          "Wage garnishment stops",
          "Treasury offset stops",
          "Eligibility for IDR plans restored",
          "Eligibility for additional federal student aid restored",
        ]
      : [],
    limitations: rehabEligible
      ? [
          "Can only rehabilitate each loan once",
          "Late payments on original loan remain on credit report",
          "Process takes approximately 9-10 months",
        ]
      : ["Not eligible — rehabilitation can only be used once per loan"],
  };

  // -----------------------------------------------------------------------
  // Consolidation option
  // -----------------------------------------------------------------------
  const consolidationEligible =
    input.isInDefault && (input.isWillingToConsolidate || input.previousRehabAttempts > 0);

  const consolidation: ConsolidationOption = {
    eligible: consolidationEligible,
    description: consolidationEligible
      ? "Take out a Direct Consolidation Loan to pay off defaulted loans. " +
        "You must agree to an IDR plan or make 3 consecutive on-time payments first."
      : input.isInDefault
        ? "Consolidation is available but you indicated unwillingness to consolidate. " +
          "This is your remaining option if rehabilitation has been used."
        : "Consolidation to exit default is only available for loans currently in default.",
    benefits: consolidationEligible
      ? [
          "Immediately exits default status",
          "Stops wage garnishment and Treasury offset",
          "Can be used even if rehabilitation was already used",
          "Access to IDR plans after consolidation",
        ]
      : [],
    limitations: consolidationEligible
      ? [
          "Default not removed from credit report (unlike rehabilitation)",
          "Must enroll in IDR plan or make 3 consecutive payments",
          "Outstanding interest capitalizes into new principal",
          "Resets forgiveness payment count to zero",
        ]
      : [],
    requiredPlan: consolidationEligible ? "IBR or RAP (income-driven repayment)" : "N/A",
  };

  // -----------------------------------------------------------------------
  // IDR enrollment recommendation
  // -----------------------------------------------------------------------
  const ibrPayment = Math.round((di * 0.10) / 12 * 100) / 100;
  const idrEnrollment = {
    recommended: true,
    suggestedPlan: input.loanBalance > 50_000 ? "IBR (post-2014)" : "RAP",
    estimatedMonthlyPayment: Math.max(10, ibrPayment),
    description:
      "After exiting default (via rehabilitation or consolidation), enroll in an IDR plan " +
      "to keep payments affordable and prevent future default. " +
      "IDR payments are based on income, not loan balance.",
  };

  // -----------------------------------------------------------------------
  // Fresh Start program
  // -----------------------------------------------------------------------
  const freshStart = {
    available: false,
    description:
      "The Fresh Start program ended on October 1, 2025. Borrowers who did not enroll " +
      "during the program window must use rehabilitation or consolidation to exit default. " +
      "Fresh Start provided a one-time opportunity to return defaulted loans to good " +
      "standing without the typical rehabilitation or consolidation requirements.",
  };

  // -----------------------------------------------------------------------
  // Urgent actions
  // -----------------------------------------------------------------------
  const urgentActions: Array<{ action: string; priority: number; note: string }> = [];

  if (input.isInDefault) {
    if (input.hasWageGarnishment) {
      urgentActions.push({
        action: "Request wage garnishment hearing immediately",
        priority: 1,
        note:
          "You have 30 days from garnishment notice to request a hearing. " +
          "Garnishment can take up to 15% of disposable pay.",
      });
    }

    if (input.hasTreasuryOffset) {
      urgentActions.push({
        action: "File hardship exemption for Treasury offset if applicable",
        priority: 1,
        note:
          "Treasury offset can intercept tax refunds, Social Security, and other federal payments.",
      });
    }

    if (rehabEligible) {
      urgentActions.push({
        action: "Begin loan rehabilitation — contact your servicer",
        priority: 2,
        note: `9 payments of $${rehabMonthlyPayment}/month. This is the best option to restore your credit.`,
      });
    } else {
      urgentActions.push({
        action: "Apply for Direct Consolidation Loan to exit default",
        priority: 2,
        note:
          "Rehabilitation already used. Consolidation is your remaining path out of default.",
      });
    }
  } else {
    // Pre-default or post-rehab: prevent (re-)default
    urgentActions.push({
      action: "Enroll in IDR plan to keep payments affordable",
      priority: 1,
      note: `Estimated payment: $${idrEnrollment.estimatedMonthlyPayment}/month on ${idrEnrollment.suggestedPlan}.`,
    });

    urgentActions.push({
      action: "Set up auto-pay to avoid missed payments",
      priority: 2,
      note: "Auto-pay also provides a 0.25% interest rate reduction.",
    });

    urgentActions.push({
      action: "Recertify income annually to maintain IDR eligibility",
      priority: 3,
      note: "Failure to recertify can result in capitalized interest and payment increases.",
    });
  }

  // -----------------------------------------------------------------------
  // Recommendation
  // -----------------------------------------------------------------------
  let recommendation: string;

  if (input.isInDefault && rehabEligible) {
    recommendation =
      `Start rehabilitation immediately: 9 payments of $${rehabMonthlyPayment}/month. ` +
      "This is the only way to remove the default from your credit report. " +
      "After rehabilitation, enroll in an IDR plan to prevent re-default.";
  } else if (input.isInDefault) {
    recommendation =
      "Apply for a Direct Consolidation Loan to exit default. " +
      "Since you have already used rehabilitation, consolidation is your remaining option. " +
      "Enroll in an IDR plan immediately after consolidation.";
  } else if (status === "post-rehab") {
    recommendation =
      "You successfully rehabilitated your loan. Stay on an IDR plan, set up auto-pay, " +
      "and recertify income annually. A second default cannot be cured by rehabilitation.";
  } else {
    recommendation =
      "Enroll in an IDR plan now to prevent default. If you are struggling to make payments, " +
      "contact your servicer about deferment or forbearance as a temporary measure — " +
      "but note that forbearance months do not count toward forgiveness.";
  }

  return {
    status,
    rehabilitation,
    consolidation,
    idrEnrollment,
    freshStart,
    urgentActions,
    recommendation,
  };
}
