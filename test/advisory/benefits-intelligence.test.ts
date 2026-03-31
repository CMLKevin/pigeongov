import { describe, expect, test } from "vitest";

import { buildWorkflowBundle } from "../../src/workflows/registry.js";
import { calculateCliff } from "../../src/advisory/cliff/calculator.js";
import { getFpl } from "../../src/advisory/cliff/programs.js";
import { getStateMedicaidLimits } from "../../src/advisory/cliff/state-medicaid.js";
import { screenEligibility } from "../../src/advisory/screener/engine.js";
import type { ScreenerInput } from "../../src/advisory/screener/intake.js";

// ---------------------------------------------------------------------------
// SSI Eligibility Calculator
// ---------------------------------------------------------------------------

describe("SSI eligibility", () => {
  test("eligible: disabled individual with low income and assets", () => {
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Jane Doe",
      age: 45,
      isBlind: false,
      isDisabled: true,
      maritalStatus: "single",
      countableAssets: 1_500,
      monthlyEarnedIncome: 200,
      monthlyUnearnedIncome: 100,
      state: "CA",
      receivingSSA: false,
      livingArrangement: "own_household",
    });

    expect(bundle.workflowId).toBe("benefits/ssi");
    expect(bundle.domain).toBe("benefits");
    expect(bundle.derived.categoricallyEligible).toBe(true);
    expect(bundle.derived.assetsPass).toBe(true);
    expect(bundle.derived.incomePass).toBe(true);
    expect((bundle.derived.estimatedMonthlyPayment as number)).toBeGreaterThan(0);
  });

  test("eligible: elderly individual (65+) with no income", () => {
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Bob Smith",
      age: 72,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "single",
      countableAssets: 500,
      monthlyEarnedIncome: 0,
      monthlyUnearnedIncome: 0,
      state: "NY",
      receivingSSA: false,
      livingArrangement: "own_household",
    });

    expect(bundle.derived.categoricallyEligible).toBe(true);
    expect(bundle.derived.assetsPass).toBe(true);
    expect(bundle.derived.incomePass).toBe(true);
    expect(bundle.derived.estimatedFederalPayment).toBe(967); // Full FBR
  });

  test("ineligible: not 65+, not blind, not disabled", () => {
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Young Healthy",
      age: 30,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "single",
      countableAssets: 500,
      monthlyEarnedIncome: 0,
      monthlyUnearnedIncome: 0,
      state: "CA",
      receivingSSA: false,
      livingArrangement: "own_household",
    });

    expect(bundle.derived.categoricallyEligible).toBe(false);
    const categoryCheck = bundle.validation.checks.find(
      (c) => c.id === "categorical",
    );
    expect(categoryCheck?.passed).toBe(false);
  });

  test("ineligible: assets over limit", () => {
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Asset Rich",
      age: 70,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "single",
      countableAssets: 5_000,
      monthlyEarnedIncome: 0,
      monthlyUnearnedIncome: 0,
      state: "CA",
      receivingSSA: false,
      livingArrangement: "own_household",
    });

    expect(bundle.derived.assetsPass).toBe(false);
    const assetFlag = bundle.validation.flaggedFields.find(
      (f) => f.field === "countableAssets",
    );
    expect(assetFlag).toBeDefined();
    expect(assetFlag!.severity).toBe("error");
  });

  test("income exclusion math: earned income", () => {
    // $500 earned, $0 unearned
    // Countable earned = ($500 - $65) / 2 = $217.50
    // Countable unearned = $0 - $20 = $0
    // Total countable = $217.50
    // SSI payment = $967 - $217.50 = $749.50 -> $750 rounded
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Earner",
      age: 68,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "single",
      countableAssets: 100,
      monthlyEarnedIncome: 500,
      monthlyUnearnedIncome: 0,
      state: "TX",
      receivingSSA: false,
      livingArrangement: "own_household",
    });

    expect(bundle.derived.countableEarned).toBeCloseTo(217.5, 0);
    expect(bundle.derived.countableUnearned).toBe(0);
    expect(bundle.derived.incomePass).toBe(true);
    expect(bundle.derived.estimatedFederalPayment).toBe(750);
  });

  test("income exclusion math: unearned income", () => {
    // $0 earned, $300 unearned
    // Countable unearned = $300 - $20 = $280
    // Total countable = $280
    // SSI payment = $967 - $280 = $687
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Pensioner",
      age: 70,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "single",
      countableAssets: 100,
      monthlyEarnedIncome: 0,
      monthlyUnearnedIncome: 300,
      state: "CA",
      receivingSSA: true,
      livingArrangement: "own_household",
    });

    expect(bundle.derived.countableUnearned).toBe(280);
    expect(bundle.derived.estimatedFederalPayment).toBe(687);
    // CA has state supplement
    expect((bundle.derived.stateSupplement as number)).toBeGreaterThan(0);
  });

  test("married couple gets higher FBR and asset limit", () => {
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Couple",
      age: 68,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "married",
      countableAssets: 2_500, // over individual limit but under couple limit
      monthlyEarnedIncome: 0,
      monthlyUnearnedIncome: 0,
      state: "CA",
      receivingSSA: false,
      livingArrangement: "own_household",
    });

    expect(bundle.derived.fbr).toBe(1_450);
    expect(bundle.derived.assetLimit).toBe(3_000);
    expect(bundle.derived.assetsPass).toBe(true);
  });

  test("asset test: couple asset limit is $3,000", () => {
    const bundle = buildWorkflowBundle("benefits/ssi", {
      applicantName: "Couple Over Limit",
      age: 68,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "married",
      countableAssets: 3_500,
      monthlyEarnedIncome: 0,
      monthlyUnearnedIncome: 0,
      state: "CA",
      receivingSSA: false,
      livingArrangement: "own_household",
    });

    expect(bundle.derived.assetsPass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TANF Eligibility
// ---------------------------------------------------------------------------

describe("TANF eligibility", () => {
  test("eligible: family with children, low income", () => {
    const bundle = buildWorkflowBundle("benefits/tanf", {
      applicantName: "Maria Garcia",
      state: "CA",
      householdSize: 3,
      numberOfChildren: 2,
      youngestChildAge: 3,
      monthlyGrossIncome: 500,
      countableAssets: 0,
      monthsReceived: 0,
      isEmployed: false,
      citizenshipStatus: "us_citizen",
    });

    expect(bundle.workflowId).toBe("benefits/tanf");
    expect(bundle.domain).toBe("benefits");
    expect(bundle.derived.hasChildren).toBe(true);
    expect(bundle.derived.incomePass).toBe(true);
    expect((bundle.derived.estimatedMonthlyBenefit as number)).toBeGreaterThan(0);
    // Should flag SNAP categorical eligibility
    const snapFlag = bundle.validation.flaggedFields.find(
      (f) => f.field === "snapEligibility",
    );
    expect(snapFlag).toBeDefined();
  });

  test("ineligible: no children", () => {
    const bundle = buildWorkflowBundle("benefits/tanf", {
      applicantName: "No Kids",
      state: "CA",
      householdSize: 1,
      numberOfChildren: 0,
      youngestChildAge: 0,
      monthlyGrossIncome: 500,
      countableAssets: 0,
      monthsReceived: 0,
      isEmployed: false,
      citizenshipStatus: "us_citizen",
    });

    expect(bundle.derived.hasChildren).toBe(false);
    const childCheck = bundle.validation.checks.find(
      (c) => c.id === "has-children",
    );
    expect(childCheck?.passed).toBe(false);
  });

  test("ineligible: income too high", () => {
    const bundle = buildWorkflowBundle("benefits/tanf", {
      applicantName: "High Earner",
      state: "CA",
      householdSize: 3,
      numberOfChildren: 1,
      youngestChildAge: 5,
      monthlyGrossIncome: 5_000,
      countableAssets: 0,
      monthsReceived: 0,
      isEmployed: true,
      citizenshipStatus: "us_citizen",
    });

    expect(bundle.derived.incomePass).toBe(false);
  });

  test("time limit: 60 months exhausted", () => {
    const bundle = buildWorkflowBundle("benefits/tanf", {
      applicantName: "Time Limit",
      state: "CA",
      householdSize: 3,
      numberOfChildren: 1,
      youngestChildAge: 5,
      monthlyGrossIncome: 500,
      countableAssets: 0,
      monthsReceived: 60,
      isEmployed: false,
      citizenshipStatus: "us_citizen",
    });

    expect(bundle.derived.timeLimitExhausted).toBe(true);
    expect(bundle.derived.monthsRemaining).toBe(0);
    const timeLimitFlag = bundle.validation.flaggedFields.find(
      (f) => f.field === "monthsReceived" && f.severity === "error",
    );
    expect(timeLimitFlag).toBeDefined();
  });

  test("work requirement triggers after 24 months with child 1+", () => {
    const bundle = buildWorkflowBundle("benefits/tanf", {
      applicantName: "Worker",
      state: "CA",
      householdSize: 3,
      numberOfChildren: 1,
      youngestChildAge: 3,
      monthlyGrossIncome: 300,
      countableAssets: 0,
      monthsReceived: 30,
      isEmployed: false,
      citizenshipStatus: "us_citizen",
    });

    expect(bundle.derived.workRequirementApplies).toBe(true);
    expect(bundle.derived.workHoursNeeded).toBe(20); // youngest child under 6
  });

  test("state-specific: CA has no asset test", () => {
    const bundle = buildWorkflowBundle("benefits/tanf", {
      applicantName: "CA Applicant",
      state: "CA",
      householdSize: 3,
      numberOfChildren: 1,
      youngestChildAge: 5,
      monthlyGrossIncome: 500,
      countableAssets: 50_000, // High assets, but CA has no asset test
      monthsReceived: 0,
      isEmployed: false,
      citizenshipStatus: "us_citizen",
    });

    expect(bundle.derived.assetsPass).toBe(true);
    expect(bundle.derived.stateAssetLimit).toBeNull();
  });

  test("state-specific: TX has $1,000 asset limit", () => {
    const bundle = buildWorkflowBundle("benefits/tanf", {
      applicantName: "TX Applicant",
      state: "TX",
      householdSize: 3,
      numberOfChildren: 1,
      youngestChildAge: 5,
      monthlyGrossIncome: 500,
      countableAssets: 1_500,
      monthsReceived: 0,
      isEmployed: false,
      citizenshipStatus: "us_citizen",
    });

    expect(bundle.derived.assetsPass).toBe(false);
    expect(bundle.derived.stateAssetLimit).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------
// State Medicaid Limits
// ---------------------------------------------------------------------------

describe("state Medicaid limits", () => {
  test("California: expansion state with correct limits", () => {
    const ca = getStateMedicaidLimits("CA");
    expect(ca.expansion).toBe(true);
    expect(ca.adultLimit).toBe(138);
    expect(ca.childLimit).toBe(266);
    expect(ca.pregnantLimit).toBe(213);
  });

  test("Texas: non-expansion state", () => {
    const tx = getStateMedicaidLimits("TX");
    expect(tx.expansion).toBe(false);
    expect(tx.adultLimit).toBe(0); // childless adults ineligible
    expect(tx.parentLimit).toBe(14);
    expect(tx.childLimit).toBe(198);
    expect(tx.pregnantLimit).toBe(198);
  });

  test("New York: expansion state with high child limit", () => {
    const ny = getStateMedicaidLimits("NY");
    expect(ny.expansion).toBe(true);
    expect(ny.adultLimit).toBe(138);
    expect(ny.childLimit).toBe(405);
    expect(ny.pregnantLimit).toBe(223);
  });

  test("Florida: non-expansion state", () => {
    const fl = getStateMedicaidLimits("FL");
    expect(fl.expansion).toBe(false);
    expect(fl.adultLimit).toBe(0);
    expect(fl.parentLimit).toBe(26);
    expect(fl.childLimit).toBe(216);
    expect(fl.pregnantLimit).toBe(191);
  });

  test("case insensitive lookup", () => {
    const ca = getStateMedicaidLimits("ca");
    expect(ca.expansion).toBe(true);
    expect(ca.adultLimit).toBe(138);
  });

  test("unknown state returns conservative defaults", () => {
    const unknown = getStateMedicaidLimits("ZZ");
    expect(unknown.expansion).toBe(false);
    expect(unknown.adultLimit).toBe(0);
    expect(unknown.childLimit).toBe(200);
    expect(unknown.pregnantLimit).toBe(185);
  });
});

// ---------------------------------------------------------------------------
// Cliff Calculator with New Programs
// ---------------------------------------------------------------------------

describe("cliff calculator with TANF/SSI/CCDF", () => {
  test("low-income family of 4 sees TANF in benefits", () => {
    const result = calculateCliff({
      annualIncome: 10_000,
      householdSize: 4,
      state: "CA",
    });

    const programNames = result.currentBenefits.map((b) => b.program);
    expect(programNames.some((p) => p.includes("TANF"))).toBe(true);
  });

  test("very low income individual sees SSI note in recommendation", () => {
    // SSI removed from cliff PROGRAMS because eligibility requires categorical
    // qualification (age 65+, blind, or disabled) that CliffInput doesn't have.
    // Instead, the recommendation text notes potential SSI eligibility.
    const result = calculateCliff({
      annualIncome: 5_000,
      householdSize: 1,
      state: "CA",
    });

    expect(result.recommendation).toContain("SSI");
    expect(result.recommendation).toContain("65+");
  });

  test("Medicaid cliff uses state-specific limits in expansion state", () => {
    // CA: expansion state, 138% FPL for adults
    const fpl4 = getFpl(4);
    const result = calculateCliff({
      annualIncome: Math.floor(fpl4 * 1.2), // ~120% FPL, below 138%
      householdSize: 4,
      state: "CA",
    });

    const medicaidBenefit = result.currentBenefits.find((b) =>
      b.program.includes("Medicaid"),
    );
    expect(medicaidBenefit).toBeDefined();
  });

  test("Medicaid cliff uses state-specific limits in non-expansion state", () => {
    // TX: non-expansion, adult limit = 0%, parent limit = 14%
    const fpl1 = getFpl(1);
    const resultTx = calculateCliff({
      annualIncome: Math.floor(fpl1 * 0.1), // 10% FPL
      householdSize: 1,
      state: "TX",
    });

    // TX has 0% adult limit, so even at 10% FPL a childless adult should not qualify
    const medicaidBenefitTx = resultTx.currentBenefits.find((b) =>
      b.program.includes("Medicaid"),
    );
    expect(medicaidBenefitTx).toBeUndefined();
  });

  test("CCDF appears for low-income families", () => {
    const result = calculateCliff({
      annualIncome: 15_000,
      householdSize: 3,
      state: "CA",
    });

    const ccdfBenefit = result.currentBenefits.find((b) =>
      b.program.includes("CCDF") || b.program.includes("Childcare"),
    );
    expect(ccdfBenefit).toBeDefined();
    expect(ccdfBenefit!.monthlyValue).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Screener with New Programs
// ---------------------------------------------------------------------------

describe("screener with SSI/TANF", () => {
  const baseInput: ScreenerInput = {
    householdSize: 3,
    annualHouseholdIncome: 10_000, // ~38% FPL for household of 3, well below 50%
    state: "CA",
    citizenshipStatus: "us_citizen",
    ages: [35, 10, 8],
    hasDisability: false,
    employmentStatus: "unemployed",
    isVeteran: false,
    hasHealthInsurance: false,
    monthlyRent: 1_200,
  };

  test("TANF appears for family with children at low income", () => {
    const results = screenEligibility(baseInput);
    const tanfResult = results.find((r) => r.workflowId === "benefits/tanf");
    expect(tanfResult).toBeDefined();
    expect(tanfResult!.eligible).toBe("likely");
  });

  test("TANF is ineligible when no children", () => {
    const results = screenEligibility({
      ...baseInput,
      ages: [35],
      householdSize: 1,
    });
    // TANF should be filtered out (ineligible is excluded from results)
    const tanfResult = results.find((r) => r.workflowId === "benefits/tanf");
    expect(tanfResult).toBeUndefined();
  });

  test("SSI appears for disabled person at low income", () => {
    const results = screenEligibility({
      ...baseInput,
      hasDisability: true,
      employmentStatus: "disabled",
    });
    const ssiResult = results.find((r) => r.workflowId === "benefits/ssi");
    expect(ssiResult).toBeDefined();
    expect(["likely", "possible"]).toContain(ssiResult!.eligible);
  });

  test("SSI appears for elderly (65+) at low income", () => {
    const results = screenEligibility({
      ...baseInput,
      ages: [70],
      householdSize: 1,
      annualHouseholdIncome: 8_000,
    });
    const ssiResult = results.find((r) => r.workflowId === "benefits/ssi");
    expect(ssiResult).toBeDefined();
    expect(ssiResult!.eligible).toBe("likely");
  });

  test("SSI is ineligible for non-elderly, non-disabled person", () => {
    const results = screenEligibility({
      ...baseInput,
      ages: [35, 10, 8],
      hasDisability: false,
    });
    // SSI should be filtered out
    const ssiResult = results.find((r) => r.workflowId === "benefits/ssi");
    expect(ssiResult).toBeUndefined();
  });
});
