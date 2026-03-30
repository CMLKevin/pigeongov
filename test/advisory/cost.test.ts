import { describe, expect, test } from "vitest";

import {
  estimateCost,
  listAvailableCosts,
} from "../../src/advisory/cost/estimator.js";

describe("cost estimator", () => {
  test("lists 5+ available workflows", () => {
    const available = listAvailableCosts();
    expect(available.length).toBeGreaterThanOrEqual(5);
  });

  test("immigration/naturalization has filing fees > 0", () => {
    const estimate = estimateCost("immigration/naturalization");
    expect(estimate).not.toBeNull();
    expect(estimate!.diyTotal.min).toBeGreaterThan(0);
    expect(estimate!.diyTotal.max).toBeGreaterThan(0);
  });

  test("attorney total > DIY total for every workflow", () => {
    const available = listAvailableCosts();
    for (const id of available) {
      const estimate = estimateCost(id);
      expect(estimate).not.toBeNull();
      expect(estimate!.withAttorneyTotal.min).toBeGreaterThan(estimate!.diyTotal.min);
    }
  });

  test("savings vs attorney is positive for immigration", () => {
    const estimate = estimateCost("immigration/family-visa-intake");
    expect(estimate).not.toBeNull();
    expect(estimate!.savings.vsAttorney).toBeGreaterThan(0);
  });

  test("tax/1040 has zero filing fees", () => {
    const estimate = estimateCost("tax/1040");
    expect(estimate).not.toBeNull();
    expect(estimate!.diyTotal.min).toBe(0);
    expect(estimate!.diyTotal.max).toBe(0);
  });

  test("unknown workflow returns null", () => {
    const estimate = estimateCost("nonexistent/workflow");
    expect(estimate).toBeNull();
  });
});
