/**
 * State-by-state Medicaid income limits (2025).
 *
 * These are expressed as percentages of FPL. The data here covers all
 * 50 states + DC. Expansion states use 138% FPL for adults under ACA;
 * non-expansion states have sharply lower (or zero) limits for
 * childless adults and often very low limits for parents.
 *
 * Sources: KFF State Health Facts, Medicaid.gov, individual state
 * Medicaid agency publications (2024-2025 figures).
 */

export interface StateMedicaidLimits {
  expansion: boolean;
  /** % FPL for childless adults */
  adultLimit: number;
  /** % FPL for parents/caretakers */
  parentLimit: number;
  /** % FPL for children (ages 1-18) */
  childLimit: number;
  /** % FPL for pregnant women */
  pregnantLimit: number;
}

// Helper to reduce repetition for expansion states with standard adult limits
function exp(
  childLimit: number,
  pregnantLimit: number,
  parentLimit = 138,
): StateMedicaidLimits {
  return {
    expansion: true,
    adultLimit: 138,
    parentLimit,
    childLimit,
    pregnantLimit,
  };
}

function nonExp(
  parentLimit: number,
  childLimit: number,
  pregnantLimit: number,
): StateMedicaidLimits {
  return {
    expansion: false,
    adultLimit: 0, // childless adults ineligible in non-expansion states
    parentLimit,
    childLimit,
    pregnantLimit,
  };
}

/**
 * Medicaid income limits by state. All values are percentages of FPL.
 *
 * Expansion states set adultLimit = 138% per ACA. Non-expansion states
 * have adultLimit = 0 (childless adults generally ineligible under
 * traditional Medicaid). Parent limits in non-expansion states are
 * based on pre-ACA categorical eligibility, which varies wildly.
 */
export const STATE_MEDICAID_LIMITS: Record<string, StateMedicaidLimits> = {
  // --- Expansion states ---
  AK: exp(203, 200),
  AZ: exp(147, 156),
  AR: exp(216, 209),
  CA: exp(266, 213),
  CO: exp(260, 195),
  CT: exp(323, 258),
  DE: exp(217, 212),
  DC: exp(324, 319),
  HI: exp(313, 191),
  ID: exp(190, 138),
  IL: exp(318, 213),
  IN: exp(272, 208),
  IA: exp(302, 375),
  KY: exp(218, 195),
  LA: exp(217, 138),
  ME: exp(213, 209),
  MD: exp(322, 264),
  MA: exp(317, 200),
  MI: exp(217, 195),
  MN: exp(288, 278),
  MO: exp(196, 196),
  MT: exp(261, 157),
  NE: exp(218, 194),
  NV: exp(205, 165),
  NH: exp(318, 196),
  NJ: exp(355, 200),
  NM: exp(300, 250),
  NY: exp(405, 223),
  NC: exp(216, 196),
  ND: exp(175, 152),
  OH: exp(211, 200),
  OK: exp(210, 138),
  OR: exp(305, 185),
  PA: exp(324, 215),
  RI: exp(266, 253),
  SD: exp(209, 138),
  UT: exp(200, 138),
  VT: exp(317, 213),
  VA: exp(205, 200),
  WA: exp(317, 193),
  WV: exp(305, 185),

  // --- Non-expansion states ---
  AL: nonExp(18, 146, 146),
  FL: nonExp(26, 216, 191),
  GA: nonExp(35, 252, 220),
  KS: nonExp(38, 170, 166),
  MS: nonExp(27, 209, 194),
  SC: nonExp(67, 213, 194),
  TN: nonExp(98, 250, 195),
  TX: nonExp(14, 198, 198),
  WI: nonExp(100, 306, 306), // WI covers adults up to 100% via waiver, but hasn't formally expanded
  WY: nonExp(54, 200, 154),
};

/**
 * Look up Medicaid limits for a state. Falls back to a conservative
 * default for unknown state codes (assumes non-expansion with
 * generous child/pregnant limits).
 */
export function getStateMedicaidLimits(state: string): StateMedicaidLimits {
  const upper = state.toUpperCase();
  return (
    STATE_MEDICAID_LIMITS[upper] ?? {
      expansion: false,
      adultLimit: 0,
      parentLimit: 50,
      childLimit: 200,
      pregnantLimit: 185,
    }
  );
}
