import { describe, expect, test } from "vitest";

import {
  PROCESSING_TIMES,
  getProcessingTime,
} from "../../src/advisory/tracker/types.js";
import { getProcessingTimeEstimate } from "../../src/advisory/tracker/uscis.js";

describe("USCIS processing times", () => {
  test("has processing times for common forms (I-485, I-130, N-400, I-765)", () => {
    const commonForms = ["I-485", "I-130", "N-400", "I-765"];
    for (const form of commonForms) {
      const pt = getProcessingTime(form);
      expect(pt, `Expected processing time data for ${form}`).not.toBeNull();
      expect(pt!.formType).toBe(form);
    }
  });

  test("processing time percentiles are ordered (50th < 75th < 90th)", () => {
    for (const pt of PROCESSING_TIMES) {
      expect(
        pt.percentile50,
        `${pt.formType}: 50th percentile should be less than 75th`,
      ).toBeLessThan(pt.percentile75);
      expect(
        pt.percentile75,
        `${pt.formType}: 75th percentile should be less than 90th`,
      ).toBeLessThan(pt.percentile90);
    }
  });

  test("getProcessingTimeEstimate returns structured data for I-485", () => {
    const result = getProcessingTimeEstimate("I-485");
    expect(result).not.toBeNull();
    expect(result!.formType).toBe("I-485");
    expect(result!.formTitle).toContain("Adjustment of Status");
    expect(result!.percentile50).toBeTypeOf("number");
    expect(result!.percentile75).toBeTypeOf("number");
    expect(result!.percentile90).toBeTypeOf("number");
    expect(result!.lastUpdated).toBeTypeOf("string");
  });

  test("unknown form returns null", () => {
    const result = getProcessingTimeEstimate("Z-999");
    expect(result).toBeNull();
  });
});
