import { describe, expect, test } from "vitest";
import { calculateCliff } from "../../src/advisory/cliff/calculator.js";
import { getFpl } from "../../src/advisory/cliff/programs.js";

describe("calculateCliff", () => {
  test("identifies SNAP cliff at 130% FPL for household of 4", () => {
    const fpl4 = getFpl(4);
    const snapCutoff = Math.floor(fpl4 * 1.3);

    // Income just below the SNAP cutoff
    const result = calculateCliff({
      annualIncome: snapCutoff - 1_000,
      householdSize: 4,
      state: "TX",
    });

    const snapCliff = result.cliffPoints.find((cp) =>
      cp.programLost.includes("SNAP"),
    );
    expect(snapCliff).toBeDefined();
    expect(snapCliff!.income).toBe(snapCutoff);
    expect(snapCliff!.annualLoss).toBeGreaterThan(0);
  });

  test("shows current benefits at low income", () => {
    // $20,000 for a household of 4 should qualify for most programs
    const result = calculateCliff({
      annualIncome: 20_000,
      householdSize: 4,
      state: "CA",
    });

    expect(result.currentBenefits.length).toBeGreaterThanOrEqual(3);

    const programNames = result.currentBenefits.map((b) => b.program);
    expect(programNames.some((p) => p.includes("SNAP"))).toBe(true);
    expect(programNames.some((p) => p.includes("Medicaid"))).toBe(true);

    // Every benefit should have a positive monthly value
    for (const b of result.currentBenefits) {
      expect(b.monthlyValue).toBeGreaterThan(0);
    }
  });

  test("calculates safe raise threshold above current income", () => {
    const result = calculateCliff({
      annualIncome: 25_000,
      householdSize: 4,
      state: "CA",
    });

    // Should have cliff points and a threshold above current income
    expect(result.cliffPoints.length).toBeGreaterThan(0);
    expect(result.safeRaiseThreshold).toBeGreaterThan(25_000);
  });

  test("high income ($150K) shows no benefits or cliffs", () => {
    const result = calculateCliff({
      annualIncome: 150_000,
      householdSize: 4,
      state: "NY",
    });

    expect(result.currentBenefits).toHaveLength(0);
    expect(result.cliffPoints).toHaveLength(0);
    expect(result.safeRaiseThreshold).toBe(150_000);
  });

  test("produces recommendation text", () => {
    const result = calculateCliff({
      annualIncome: 22_000,
      householdSize: 3,
      state: "FL",
    });

    expect(result.recommendation).toBeTruthy();
    expect(typeof result.recommendation).toBe("string");
    expect(result.recommendation.length).toBeGreaterThan(50);

    // At this income the recommendation should mention benefits
    expect(result.recommendation).toContain("benefit");
  });
});
