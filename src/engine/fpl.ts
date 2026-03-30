// ---------------------------------------------------------------------------
// Federal Poverty Level Guidelines — 2025
// ---------------------------------------------------------------------------
// Used by benefits eligibility screening across SNAP, Medicaid, WIC,
// LIHEAP, ACA subsidies, CHIP, school lunch programs, and more.
//
// Source: HHS Federal Register, effective January 2025.
// Alaska and Hawaii have their own guidelines because cost of living
// there makes the lower-48 numbers look like a cruel joke.
// ---------------------------------------------------------------------------

export const FPL_2025 = {
  baseAmount: 15_650,
  perAdditionalPerson: 5_580,
  // Alaska and Hawaii have higher FPLs
  alaska: { baseAmount: 19_560, perAdditionalPerson: 6_980 },
  hawaii: { baseAmount: 18_000, perAdditionalPerson: 6_420 },
} as const;

/**
 * Common program eligibility thresholds as percentages of FPL.
 * These are the magic numbers that determine who qualifies for what.
 */
export const PROGRAM_THRESHOLDS = {
  snap: { gross: 130, net: 100 }, // % of FPL
  medicaid_expansion: 138,
  wic: 185,
  liheap: 150,
  aca_subsidy_max: 400,
  chip_typical: 200,
  reduced_school_lunch: 185,
  free_school_lunch: 130,
} as const;

/**
 * Maximum monthly SNAP allotments for 2025 by household size.
 * For households larger than 8, add $220 per additional person.
 */
export const SNAP_MAX_ALLOTMENT_2025: Record<number, number> = {
  1: 292,
  2: 536,
  3: 768,
  4: 975,
  5: 1158,
  6: 1390,
  7: 1536,
  8: 1756,
};

const SNAP_PER_ADDITIONAL_PERSON = 220;

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Determine the FPL parameters for a given state.
 * Alaska and Hawaii get their own numbers; everyone else uses the
 * contiguous-US guidelines.
 */
function fplParamsForState(state?: string): {
  baseAmount: number;
  perAdditionalPerson: number;
} {
  const normalized = state?.toUpperCase().trim();
  if (normalized === "AK" || normalized === "ALASKA") {
    return FPL_2025.alaska;
  }
  if (normalized === "HI" || normalized === "HAWAII") {
    return FPL_2025.hawaii;
  }
  return { baseAmount: FPL_2025.baseAmount, perAdditionalPerson: FPL_2025.perAdditionalPerson };
}

/**
 * Calculate the Federal Poverty Level for a given household size.
 * Household size must be at least 1.
 *
 * Formula: base amount + (per-additional × (size - 1))
 */
export function fplForHousehold(size: number, state?: string): number {
  const effectiveSize = Math.max(1, Math.round(size));
  const params = fplParamsForState(state);
  return params.baseAmount + params.perAdditionalPerson * (effectiveSize - 1);
}

/**
 * Calculate what percentage of FPL a household's income represents.
 *
 * Returns the percentage as a number (e.g., 138 means 138% of FPL).
 * This is the key number for virtually every means-tested benefit
 * in the United States.
 */
export function fplPercentage(
  income: number,
  householdSize: number,
  state?: string,
): number {
  const fpl = fplForHousehold(householdSize, state);
  if (fpl === 0) return 0;
  return roundCurrency((income / fpl) * 100);
}

/**
 * Check whether a household's income falls below a given FPL percentage
 * threshold. This is the actual eligibility gate for most programs.
 *
 * Example: isBelow(25000, 3, 130) checks if $25k for a household of 3
 * is below 130% FPL (SNAP gross income test).
 */
export function isBelow(
  income: number,
  householdSize: number,
  percentage: number,
  state?: string,
): boolean {
  const fpl = fplForHousehold(householdSize, state);
  const threshold = (fpl * percentage) / 100;
  return income <= threshold;
}

/**
 * Estimate monthly SNAP benefit for a household.
 *
 * The basic formula: max allotment - (30% of net monthly income).
 * The 30% figure reflects the USDA's assumption that households
 * should spend 30% of their net income on food. Whether that's
 * realistic in 2025 is another conversation entirely.
 *
 * Returns 0 if the household doesn't qualify (benefit would be negative).
 * Minimum benefit for 1-2 person households is typically $23/month,
 * but we don't enforce that here since state rules vary.
 */
export function estimateSnapBenefit(
  householdSize: number,
  netMonthlyIncome: number,
): number {
  const effectiveSize = Math.max(1, Math.round(householdSize));

  let maxAllotment: number;
  if (effectiveSize <= 8) {
    maxAllotment = SNAP_MAX_ALLOTMENT_2025[effectiveSize] ?? 0;
  } else {
    const base8 = SNAP_MAX_ALLOTMENT_2025[8] ?? 1756;
    maxAllotment = base8 + SNAP_PER_ADDITIONAL_PERSON * (effectiveSize - 8);
  }

  const expectedContribution = roundCurrency(netMonthlyIncome * 0.3);
  const benefit = roundCurrency(
    Math.max(0, maxAllotment - expectedContribution),
  );

  return benefit;
}
