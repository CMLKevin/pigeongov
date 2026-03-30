export interface AuditRiskAssessment {
  score: number; // 1-10, where 10 = highest risk
  riskLevel: "low" | "moderate" | "elevated" | "high";
  factors: AuditRiskFactor[];
  disclaimer: string;
}

export interface AuditRiskFactor {
  id: string;
  label: string;
  contribution: number; // 0-3 points added to score
  description: string;
  severity: "info" | "warning" | "concern";
}

interface TaxProfile {
  filingStatus: string;
  agi: number;
  totalIncome: number;
  scheduleCNet?: number;
  scheduleCExpenses?: number;
  hasHomeOffice?: boolean;
  charitableDeductions?: number;
  useItemized?: boolean;
  totalItemized?: number;
  hasCryptoActivity?: boolean;
  hasRentalIncome?: boolean;
  selfEmploymentIncome?: number;
  cashBusinessIndicators?: boolean;
}

/**
 * Estimate audit risk based on publicly available IRS audit rate data and known patterns.
 *
 * THIS IS NOT LEGAL ADVICE. This is a statistical estimate based on published IRS data.
 * Actual audit selection involves many factors not captured here.
 */
export function assessAuditRisk(profile: TaxProfile): AuditRiskAssessment {
  const factors: AuditRiskFactor[] = [];
  let baseScore = 1; // Everyone starts at 1

  // Factor 1: Income level (IRS audits high earners disproportionately)
  if (profile.agi > 1_000_000) {
    factors.push({
      id: "high_income",
      label: "High income",
      contribution: 2,
      description: "AGI over $1M has historically higher audit rates (~2-4% vs ~0.4% average)",
      severity: "concern",
    });
    baseScore += 2;
  } else if (profile.agi > 500_000) {
    factors.push({
      id: "elevated_income",
      label: "Elevated income",
      contribution: 1,
      description: "AGI $500K-$1M has moderately elevated audit rates",
      severity: "warning",
    });
    baseScore += 1;
  }

  // Factor 2: Schedule C with high expenses
  if (profile.scheduleCNet !== undefined && profile.scheduleCExpenses !== undefined) {
    const expenseRatio = profile.scheduleCNet !== 0
      ? profile.scheduleCExpenses / Math.abs(profile.scheduleCNet + profile.scheduleCExpenses)
      : 0;

    if (profile.scheduleCNet < 0) {
      factors.push({
        id: "schedule_c_loss",
        label: "Schedule C loss",
        contribution: 2,
        description: "Reporting a business loss increases scrutiny, especially if recurring",
        severity: "concern",
      });
      baseScore += 2;
    } else if (expenseRatio > 0.75) {
      factors.push({
        id: "high_expense_ratio",
        label: "High expense-to-income ratio",
        contribution: 1,
        description: `Schedule C expenses are ${(expenseRatio * 100).toFixed(0)}% of gross receipts`,
        severity: "warning",
      });
      baseScore += 1;
    }
  }

  // Factor 3: Home office deduction
  if (profile.hasHomeOffice && profile.scheduleCNet !== undefined) {
    factors.push({
      id: "home_office",
      label: "Home office deduction",
      contribution: 1,
      description: "Home office deductions receive additional scrutiny — ensure exclusive and regular use",
      severity: "warning",
    });
    baseScore += 1;
  }

  // Factor 4: Large charitable deductions relative to income
  if (profile.charitableDeductions !== undefined && profile.agi > 0) {
    const charitableRatio = profile.charitableDeductions / profile.agi;
    if (charitableRatio > 0.3) {
      factors.push({
        id: "high_charitable",
        label: "Large charitable deductions",
        contribution: 2,
        description: `Charitable deductions are ${(charitableRatio * 100).toFixed(0)}% of AGI (above typical levels)`,
        severity: "concern",
      });
      baseScore += 2;
    }
  }

  // Factor 5: Crypto activity
  if (profile.hasCryptoActivity) {
    factors.push({
      id: "crypto_activity",
      label: "Cryptocurrency activity",
      contribution: 1,
      description: "IRS has increased focus on crypto reporting compliance",
      severity: "info",
    });
    baseScore += 1;
  }

  // Factor 6: Very low income with high deductions
  if (profile.agi > 0 && profile.agi < 25_000 && profile.useItemized && profile.totalItemized !== undefined) {
    if (profile.totalItemized > profile.agi * 0.5) {
      factors.push({
        id: "low_income_high_deductions",
        label: "Low income with high itemized deductions",
        contribution: 1,
        description: "Itemized deductions exceeding 50% of AGI on low income may draw attention",
        severity: "warning",
      });
      baseScore += 1;
    }
  }

  // Factor 7: EITC (IRS audits EITC returns at elevated rates — unfortunately)
  if (profile.agi > 0 && profile.agi < 60_000 && profile.filingStatus !== "married_filing_separately") {
    // We note this but don't add to score — the elevated rate is an IRS enforcement choice,
    // not an indicator the taxpayer did anything wrong.
    factors.push({
      id: "eitc_eligible_range",
      label: "EITC income range",
      contribution: 0,
      description: "EITC-eligible returns are audited at higher-than-average rates (IRS enforcement priority)",
      severity: "info",
    });
  }

  // Cap at 10
  const score = Math.min(10, Math.max(1, baseScore));

  const riskLevel: AuditRiskAssessment["riskLevel"] =
    score <= 2 ? "low" :
    score <= 4 ? "moderate" :
    score <= 6 ? "elevated" : "high";

  return {
    score,
    riskLevel,
    factors,
    disclaimer:
      "This is a statistical estimate based on published IRS audit rate data, not legal or tax advice. " +
      "Actual audit selection involves many factors not captured here. Always report income accurately " +
      "and keep documentation for all deductions.",
  };
}
