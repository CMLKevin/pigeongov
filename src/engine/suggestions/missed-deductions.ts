export interface MissedDeductionSuggestion {
  id: string;
  label: string;
  estimatedSavings: string;
  description: string;
  applies: string;
  confidence: "high" | "medium" | "low";
}

interface TaxSituation {
  filingStatus: string;
  agi: number;
  wages: number;
  selfEmploymentIncome: number;
  hasScheduleC: boolean;
  hasDependents: boolean;
  dependentCount: number;
  isHomeowner: boolean;
  mortgageInterest?: number;
  stateAndLocalTaxes?: number;
  useItemizedDeductions: boolean;
  standardDeduction: number;
  itemizedDeductions: number;
  hasStudentLoans: boolean;
  studentLoanInterest?: number;
  hasHsa: boolean;
  hsaContributions?: number;
  hasIra: boolean;
  iraContributions?: number;
  isEducator: boolean;
  educatorExpenses?: number;
  charitableContributions?: number;
  hasChildCare: boolean;
  childCareExpenses?: number;
  has401k: boolean;
  contributions401k?: number;
  hasEnergyImprovements: boolean;
}

/**
 * Detect commonly missed deductions and credits based on the taxpayer's situation.
 * Returns suggestions ordered by estimated impact.
 */
export function detectMissedDeductions(situation: TaxSituation): MissedDeductionSuggestion[] {
  const suggestions: MissedDeductionSuggestion[] = [];

  // Educator expenses (up to $300 for K-12 educators)
  if (situation.isEducator && (!situation.educatorExpenses || situation.educatorExpenses === 0)) {
    suggestions.push({
      id: "educator_expenses",
      label: "Educator expense deduction",
      estimatedSavings: "$66-$111",
      description: "K-12 teachers can deduct up to $300 for unreimbursed classroom supplies. This is an above-the-line deduction (no itemizing needed).",
      applies: "K-12 teachers, counselors, principals who work 900+ hours",
      confidence: "high",
    });
  }

  // Student loan interest deduction
  if (situation.hasStudentLoans && (!situation.studentLoanInterest || situation.studentLoanInterest === 0)) {
    suggestions.push({
      id: "student_loan_interest",
      label: "Student loan interest deduction",
      estimatedSavings: "$550-$625",
      description: "Deduct up to $2,500 in student loan interest. Above-the-line deduction — no itemizing needed.",
      applies: "Anyone with student loans and MAGI under $90K single / $185K MFJ",
      confidence: "medium",
    });
  }

  // HSA contributions
  if (!situation.hasHsa && situation.hasScheduleC) {
    suggestions.push({
      id: "hsa_opportunity",
      label: "HSA contribution opportunity",
      estimatedSavings: "$880-$2,470",
      description: "Self-employed individuals with high-deductible health plans can contribute to an HSA: $4,300 individual / $8,550 family (2025). Triple tax benefit: deductible, grows tax-free, tax-free withdrawals for medical.",
      applies: "Self-employed with HDHP coverage",
      confidence: "medium",
    });
  }

  // IRA deduction
  if (!situation.hasIra && situation.agi < 77_000 && situation.filingStatus === "single") {
    suggestions.push({
      id: "ira_deduction",
      label: "Traditional IRA contribution",
      estimatedSavings: "$1,540-$2,590",
      description: "Contribute up to $7,000 ($8,000 if 50+) to a Traditional IRA for an above-the-line deduction.",
      applies: "Those without employer retirement plans, or with MAGI below phase-out limits",
      confidence: "medium",
    });
  }

  // Saver's Credit
  if (situation.agi < 38_250 && situation.filingStatus === "single" && situation.has401k) {
    suggestions.push({
      id: "savers_credit",
      label: "Saver's Credit (Retirement Savings Credit)",
      estimatedSavings: "$200-$1,000",
      description: "Credit of 10-50% on first $2,000 of retirement contributions. Non-refundable. Often overlooked.",
      applies: "AGI under $38,250 single / $76,500 MFJ with retirement contributions",
      confidence: "high",
    });
  }

  // Charitable deduction for non-itemizers
  if (!situation.useItemizedDeductions && situation.charitableContributions && situation.charitableContributions > 0) {
    suggestions.push({
      id: "charitable_review",
      label: "Review standard vs. itemized with charitable",
      estimatedSavings: "varies",
      description: "You have charitable contributions but are taking the standard deduction. If your total itemized deductions (mortgage interest, state/local taxes, charitable) exceed the standard deduction, itemizing saves more.",
      applies: "Anyone with significant charitable giving",
      confidence: "low",
    });
  }

  // Self-employment health insurance deduction
  if (situation.hasScheduleC && situation.selfEmploymentIncome > 0) {
    suggestions.push({
      id: "se_health_insurance",
      label: "Self-employed health insurance deduction",
      estimatedSavings: "$1,000-$5,000+",
      description: "Self-employed individuals can deduct 100% of health insurance premiums for themselves, spouse, and dependents. Above-the-line deduction.",
      applies: "Self-employed not eligible for employer-sponsored plan",
      confidence: "medium",
    });
  }

  // Child and Dependent Care Credit
  if (situation.hasChildCare && situation.hasDependents && (!situation.childCareExpenses || situation.childCareExpenses === 0)) {
    suggestions.push({
      id: "child_care_credit",
      label: "Child and Dependent Care Credit",
      estimatedSavings: "$600-$2,100",
      description: "Credit of 20-35% on up to $3,000 per child ($6,000 for 2+) in childcare expenses while you work.",
      applies: "Working parents paying for childcare for children under 13",
      confidence: "high",
    });
  }

  // Energy efficient home improvement credit
  if (situation.hasEnergyImprovements) {
    suggestions.push({
      id: "energy_credit",
      label: "Energy Efficient Home Improvement Credit",
      estimatedSavings: "$150-$3,200",
      description: "Credit of 30% for qualifying improvements: heat pumps, insulation, windows, doors, water heaters. Up to $3,200/year.",
      applies: "Homeowners who made qualifying energy improvements",
      confidence: "high",
    });
  }

  // Standard vs. itemized comparison
  if (situation.isHomeowner && !situation.useItemizedDeductions) {
    const potentialItemized = (situation.mortgageInterest ?? 0) +
      Math.min(situation.stateAndLocalTaxes ?? 0, 10_000) +
      (situation.charitableContributions ?? 0);

    if (potentialItemized > situation.standardDeduction * 0.85) {
      suggestions.push({
        id: "itemize_review",
        label: "Review standard vs. itemized deduction",
        estimatedSavings: "varies",
        description: `Your estimated itemizable expenses ($${potentialItemized.toLocaleString()}) are close to or exceed the standard deduction ($${situation.standardDeduction.toLocaleString()}). Review whether itemizing saves more.`,
        applies: "Homeowners with mortgage interest and/or high state/local taxes",
        confidence: "medium",
      });
    }
  }

  // Sort by confidence (high first), then by estimated impact
  return suggestions.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
}
