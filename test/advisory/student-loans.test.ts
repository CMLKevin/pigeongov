import { describe, expect, test } from "vitest";
import {
  analyzeSaveTransition,
  calculateIBRPayment,
  calculateRAPPayment,
  calculateICRPayment,
  calculateStandardPayment,
  federalPovertyLevel,
  discretionaryIncome150,
  discretionaryIncome225,
  type SaveTransitionInput,
} from "../../src/advisory/student-loans/save-transition.js";
import {
  trackPSLF,
  type PSLFTrackerInput,
} from "../../src/advisory/student-loans/pslf-tracker.js";
import {
  navigateDefaultPrevention,
  type DefaultPreventionInput,
} from "../../src/advisory/student-loans/default-prevention.js";

// ---------------------------------------------------------------------------
// FPL helpers
// ---------------------------------------------------------------------------

describe("federalPovertyLevel", () => {
  test("household of 1 returns base FPL", () => {
    expect(federalPovertyLevel(1)).toBe(15_650);
  });

  test("household of 4 adds 3 increments", () => {
    expect(federalPovertyLevel(4)).toBe(15_650 + 3 * 5_580);
  });
});

describe("discretionaryIncome", () => {
  test("150% FPL threshold for household of 1", () => {
    const fpl = federalPovertyLevel(1);
    const threshold = 1.5 * fpl;
    // Income at threshold => DI = 0
    expect(discretionaryIncome150(threshold, 1)).toBe(0);
    // Income above threshold
    expect(discretionaryIncome150(threshold + 10_000, 1)).toBe(10_000);
  });

  test("225% FPL threshold for household of 1", () => {
    const fpl = federalPovertyLevel(1);
    const threshold = 2.25 * fpl;
    expect(discretionaryIncome225(threshold, 1)).toBe(0);
    expect(discretionaryIncome225(threshold + 5_000, 1)).toBe(5_000);
  });

  test("income below poverty level returns 0", () => {
    expect(discretionaryIncome150(10_000, 1)).toBe(0);
    expect(discretionaryIncome225(10_000, 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// IBR payment calculation
// ---------------------------------------------------------------------------

describe("calculateIBRPayment", () => {
  test("old IBR at 15% for $50K income, household of 1", () => {
    const di = discretionaryIncome150(50_000, 1);
    const expected = Math.round((di * 0.15) / 12 * 100) / 100;
    expect(calculateIBRPayment(50_000, 1, false)).toBe(expected);
  });

  test("new IBR at 10% for $50K income, household of 1", () => {
    const di = discretionaryIncome150(50_000, 1);
    const expected = Math.round((di * 0.10) / 12 * 100) / 100;
    expect(calculateIBRPayment(50_000, 1, true)).toBe(expected);
  });

  test("low income yields $0 for IBR", () => {
    // Income below 150% FPL for household of 4
    expect(calculateIBRPayment(15_000, 4, false)).toBe(0);
    expect(calculateIBRPayment(15_000, 4, true)).toBe(0);
  });

  test("various income levels produce correct IBR payments", () => {
    // $30K income, household of 2
    const di30k = discretionaryIncome150(30_000, 2);
    expect(calculateIBRPayment(30_000, 2, false)).toBe(
      Math.round((di30k * 0.15) / 12 * 100) / 100,
    );

    // $80K income, household of 3
    const di80k = discretionaryIncome150(80_000, 3);
    expect(calculateIBRPayment(80_000, 3, true)).toBe(
      Math.round((di80k * 0.10) / 12 * 100) / 100,
    );
  });
});

// ---------------------------------------------------------------------------
// RAP payment calculation
// ---------------------------------------------------------------------------

describe("calculateRAPPayment", () => {
  test("RAP has $10 minimum — no $0 option", () => {
    // Very low income should still produce $10/month minimum
    const payment = calculateRAPPayment(15_000, 4);
    expect(payment).toBe(10);
  });

  test("RAP uses 225% FPL threshold", () => {
    const fpl = federalPovertyLevel(1);
    const threshold225 = 2.25 * fpl;
    // Income just above 225% FPL should yield small payment, but at least $10
    const payment = calculateRAPPayment(threshold225 + 1_200, 1);
    // 10% of $1200 / 12 = $10
    expect(payment).toBe(10);
  });

  test("RAP at higher income computes 10% of discretionary income", () => {
    const income = 60_000;
    const di = discretionaryIncome225(income, 1);
    const expected = Math.max(10, Math.round((di * 0.10) / 12 * 100) / 100);
    expect(calculateRAPPayment(income, 1)).toBe(expected);
  });

  test("RAP payment lower than IBR for same income", () => {
    // RAP uses 225% FPL (more generous threshold) and 10%
    // IBR old uses 150% FPL and 15%
    const income = 50_000;
    const hs = 1;
    const rap = calculateRAPPayment(income, hs);
    const ibrOld = calculateIBRPayment(income, hs, false);
    expect(rap).toBeLessThan(ibrOld);
  });
});

// ---------------------------------------------------------------------------
// Standard repayment calculation
// ---------------------------------------------------------------------------

describe("calculateStandardPayment", () => {
  test("calculates 10-year amortisation", () => {
    // $30,000 at 5% over 120 months
    const payment = calculateStandardPayment(30_000, 0.05);
    // Known amortisation: approximately $318.20/month
    expect(payment).toBeGreaterThan(310);
    expect(payment).toBeLessThan(330);
  });

  test("$0 balance yields $0 payment", () => {
    expect(calculateStandardPayment(0, 0.05)).toBe(0);
  });

  test("0% interest yields simple division", () => {
    const payment = calculateStandardPayment(12_000, 0);
    expect(payment).toBe(100); // 12000 / 120
  });
});

// ---------------------------------------------------------------------------
// ICR payment calculation
// ---------------------------------------------------------------------------

describe("calculateICRPayment", () => {
  test("ICR is lesser of 20% DI or 12-year fixed", () => {
    const income = 50_000;
    const balance = 30_000;
    const rate = 0.05;
    const hs = 1;

    const di = discretionaryIncome150(income, hs);
    const optionA = Math.round((di * 0.20) / 12 * 100) / 100;
    // 12-year amortisation
    const r = rate / 12;
    const optionB = Math.round(
      ((balance * r * Math.pow(1 + r, 144)) / (Math.pow(1 + r, 144) - 1)) * 100,
    ) / 100;

    const icr = calculateICRPayment(income, hs, balance, rate);
    expect(icr).toBe(Math.round(Math.min(optionA, optionB) * 100) / 100);
  });
});

// ---------------------------------------------------------------------------
// PSLF tracker
// ---------------------------------------------------------------------------

describe("trackPSLF", () => {
  const basePSLFInput: PSLFTrackerInput = {
    qualifyingPaymentsMade: 60,
    monthsInForbearance: 12,
    monthsInDeferment: 6,
    employerType: "government",
    loanBalance: 50_000,
    annualIncome: 55_000,
    householdSize: 1,
    isOnIDRPlan: true,
    currentMonthlyPayment: 300,
  };

  test("computes correct qualifying payment count", () => {
    const result = trackPSLF(basePSLFInput);
    expect(result.qualifyingPayments).toBe(60);
    expect(result.paymentsNeeded).toBe(120);
    expect(result.paymentsRemaining).toBe(60);
    expect(result.progressPercent).toBe(50);
  });

  test("caps qualifying payments at 120", () => {
    const result = trackPSLF({ ...basePSLFInput, qualifyingPaymentsMade: 150 });
    expect(result.qualifyingPayments).toBe(120);
    expect(result.paymentsRemaining).toBe(0);
  });

  test("SAVE forbearance months excluded from qualifying count", () => {
    // The tracker counts qualifyingPaymentsMade, not total months.
    // Forbearance months are tracked separately for buyback.
    const result = trackPSLF(basePSLFInput);
    expect(result.buybackOpportunity.monthsAvailable).toBe(18); // 12 + 6
    expect(result.buybackOpportunity.eligible).toBe(true);
  });

  test("government employer has low risk", () => {
    const result = trackPSLF(basePSLFInput);
    expect(result.employerEligible).toBe(true);
    expect(result.riskAssessment.level).toBe("low");
  });

  test("nonprofit employer has medium risk under 2026 rules", () => {
    const result = trackPSLF({ ...basePSLFInput, employerType: "nonprofit" });
    expect(result.employerEligible).toBe(true);
    expect(result.riskAssessment.level).toBe("medium");
  });

  test("for-profit employer is ineligible", () => {
    const result = trackPSLF({ ...basePSLFInput, employerType: "forprofit" });
    expect(result.employerEligible).toBe(false);
    expect(result.riskAssessment.level).toBe("ineligible");
  });

  test("not on IDR plan increases risk", () => {
    const result = trackPSLF({ ...basePSLFInput, isOnIDRPlan: false });
    expect(result.riskAssessment.level).toBe("medium");
  });

  test("produces estimated forgiveness date", () => {
    const result = trackPSLF(basePSLFInput);
    expect(result.estimatedForgivenessDate).toBeTruthy();
    // Should be roughly 60 months (~5 years) from 2026-03-31
    expect(result.estimatedForgivenessDate).toMatch(/^203[01]-/);
  });

  test("buyback cost calculation", () => {
    const result = trackPSLF(basePSLFInput);
    // 18 months * $300/month = $5,400
    expect(result.buybackOpportunity.estimatedCost).toBe(5_400);
  });
});

// ---------------------------------------------------------------------------
// SAVE transition analysis
// ---------------------------------------------------------------------------

describe("analyzeSaveTransition", () => {
  const baseInput: SaveTransitionInput = {
    currentPlan: "SAVE",
    loanBalance: 40_000,
    interestRate: 0.065,
    annualIncome: 45_000,
    householdSize: 1,
    state: "CA",
    filingStatus: "single",
    monthsInRepayment: 36,
    monthsInSaveForbearance: 12,
    isParentPlusLoan: false,
    hasConsolidatedLoans: false,
    employerType: "forprofit",
    monthsOfPSLFEmployment: 0,
  };

  test("SAVE borrower gets urgent transition actions", () => {
    const result = analyzeSaveTransition(baseInput);
    expect(result.urgentActions.length).toBeGreaterThanOrEqual(2);
    expect(
      result.urgentActions.some((a) => a.action.includes("SAVE")),
    ).toBe(true);
  });

  test("plan comparison includes RAP, IBR, ICR, and Standard", () => {
    const result = analyzeSaveTransition(baseInput);
    const planNames = result.planComparison.map((p) => p.plan);
    expect(planNames.some((n) => n.includes("RAP"))).toBe(true);
    expect(planNames.some((n) => n.includes("IBR"))).toBe(true);
    expect(planNames.some((n) => n.includes("ICR"))).toBe(true);
    expect(planNames.some((n) => n.includes("Standard"))).toBe(true);
  });

  test("RAP vs IBR vs Standard for specific scenario", () => {
    const result = analyzeSaveTransition(baseInput);
    const rap = result.planComparison.find((p) => p.plan.includes("RAP"))!;
    const ibrOld = result.planComparison.find((p) => p.plan.includes("pre-2014"))!;
    const std = result.planComparison.find((p) => p.plan.includes("Standard"))!;

    // RAP should have lowest monthly payment
    expect(rap.monthlyPayment).toBeLessThanOrEqual(ibrOld.monthlyPayment);
    // Standard should have highest monthly payment
    expect(std.monthlyPayment).toBeGreaterThan(rap.monthlyPayment);
  });

  test("SAVE forbearance months flagged in recommendation", () => {
    const result = analyzeSaveTransition(baseInput);
    expect(result.recommendation).toContain("forbearance");
  });

  test("Parent PLUS consolidation deadline detected", () => {
    const result = analyzeSaveTransition({
      ...baseInput,
      isParentPlusLoan: true,
      hasConsolidatedLoans: false,
    });
    expect(result.consolidationDeadline).toBe("2026-07-01");
    expect(
      result.urgentActions.some((a) => a.action.includes("Consolidate")),
    ).toBe(true);
  });

  test("no consolidation deadline when already consolidated", () => {
    const result = analyzeSaveTransition({
      ...baseInput,
      isParentPlusLoan: true,
      hasConsolidatedLoans: true,
    });
    expect(result.consolidationDeadline).toBeNull();
  });

  test("PSLF eligible with government employer", () => {
    const result = analyzeSaveTransition({
      ...baseInput,
      employerType: "government",
      monthsOfPSLFEmployment: 60,
    });
    expect(result.pslf.eligible).toBe(true);
    expect(result.pslf.paymentsRemaining).toBe(84); // 120 - min(60, 36)
  });

  test("PSLF not eligible with for-profit employer", () => {
    const result = analyzeSaveTransition(baseInput);
    expect(result.pslf.eligible).toBe(false);
  });

  test("nonprofit employer flagged as at-risk for PSLF", () => {
    const result = analyzeSaveTransition({
      ...baseInput,
      employerType: "nonprofit",
      monthsOfPSLFEmployment: 100,
    });
    expect(result.pslf.atRisk).toBe(true);
    expect(result.pslf.riskReason).toContain("politically targeted");
  });

  test("all plans have non-negative values", () => {
    const result = analyzeSaveTransition(baseInput);
    for (const plan of result.planComparison) {
      expect(plan.monthlyPayment).toBeGreaterThanOrEqual(0);
      expect(plan.totalPaid).toBeGreaterThanOrEqual(0);
      expect(plan.forgivenessAmount).toBeGreaterThanOrEqual(0);
      expect(plan.yearsToPayoff).toBeGreaterThanOrEqual(0);
    }
  });

  test("recommendation is non-empty", () => {
    const result = analyzeSaveTransition(baseInput);
    expect(result.recommendation.length).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Default rehabilitation payment calculation
// ---------------------------------------------------------------------------

describe("navigateDefaultPrevention", () => {
  const baseDefaultInput: DefaultPreventionInput = {
    isInDefault: true,
    monthsSinceDefault: 6,
    loanBalance: 35_000,
    annualIncome: 30_000,
    householdSize: 2,
    hasWageGarnishment: true,
    hasTreasuryOffset: false,
    previousRehabAttempts: 0,
    isWillingToConsolidate: false,
  };

  test("rehabilitation payment is 15% of discretionary income / 12", () => {
    const result = navigateDefaultPrevention(baseDefaultInput);
    const di = discretionaryIncome150(30_000, 2);
    const expected = Math.max(5, Math.round((di * 0.15) / 12 * 100) / 100);
    expect(result.rehabilitation.monthlyPayment).toBe(expected);
    expect(result.rehabilitation.totalPayments).toBe(9);
    expect(result.rehabilitation.eligible).toBe(true);
  });

  test("rehabilitation not available if previously used", () => {
    const result = navigateDefaultPrevention({
      ...baseDefaultInput,
      previousRehabAttempts: 1,
    });
    expect(result.rehabilitation.eligible).toBe(false);
  });

  test("Fresh Start program ended October 2025", () => {
    const result = navigateDefaultPrevention(baseDefaultInput);
    expect(result.freshStart.available).toBe(false);
    expect(result.freshStart.description).toContain("October");
    expect(result.freshStart.description).toContain("2025");
  });

  test("wage garnishment triggers urgent action", () => {
    const result = navigateDefaultPrevention(baseDefaultInput);
    expect(
      result.urgentActions.some((a) => a.action.includes("garnishment")),
    ).toBe(true);
  });

  test("pre-default borrower gets prevention advice", () => {
    const result = navigateDefaultPrevention({
      ...baseDefaultInput,
      isInDefault: false,
    });
    expect(result.status).toBe("pre-default");
    expect(
      result.urgentActions.some((a) => a.action.includes("IDR")),
    ).toBe(true);
  });

  test("consolidation available when rehab already used", () => {
    const result = navigateDefaultPrevention({
      ...baseDefaultInput,
      previousRehabAttempts: 1,
      isWillingToConsolidate: true,
    });
    expect(result.consolidation.eligible).toBe(true);
    expect(result.rehabilitation.eligible).toBe(false);
  });
});
