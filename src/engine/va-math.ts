// ---------------------------------------------------------------------------
// VA Combined Disability Rating Calculator
// ---------------------------------------------------------------------------
// The VA uses "whole person" theory for combining disability ratings.
// You don't add percentages — you apply each rating to the remaining
// "healthy" portion of the veteran.
//
// Formula: combined = 1 - ((1 - r1) × (1 - r2) × ...)
// Final rating rounds to nearest 10%.
//
// Example: 50% + 30% = 1 - (0.50 × 0.70) = 1 - 0.35 = 0.65 = 65% → 70%
//
// The bilateral factor: when disabilities affect both arms, both legs,
// or paired skeletal muscles, a 10% bonus is added to the combined value
// of those bilateral disabilities before combining with other ratings.
// We flag when this might apply but leave the determination to the user,
// since the bilateral factor requires medical classification data we
// don't have.
// ---------------------------------------------------------------------------

export interface CombinedRatingStep {
  rating: number;
  remainder: number; // remaining "healthy" percentage before this step
  combined: number; // running combined percentage after this step
}

export interface CombinedRatingResult {
  combinedPercent: number; // exact combined percentage
  roundedRating: number; // rounded to nearest 10%
  bilateralFactor: boolean; // whether bilateral factor may apply
  steps: CombinedRatingStep[];
}

/**
 * Round a combined rating to the nearest 10%.
 * Per VA rules, 0.5 rounds up (so 65% → 70%, 64% → 60%).
 */
function roundToNearest10(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Calculate the VA combined disability rating.
 *
 * Ratings are sorted highest-first (VA procedure), then applied
 * sequentially using the whole-person method. Each rating reduces
 * the remaining "healthy" portion of the veteran.
 *
 * The math is straightforward but the implications are not:
 * a veteran with ten 10% disabilities gets a combined rating of ~65%,
 * not 100%. The system is designed so that approaching 100% requires
 * increasingly severe individual disabilities.
 */
export function calculateCombinedRating(
  ratings: number[],
): CombinedRatingResult {
  if (ratings.length === 0) {
    return {
      combinedPercent: 0,
      roundedRating: 0,
      bilateralFactor: false,
      steps: [],
    };
  }

  // Validate and normalize ratings to decimals
  const validRatings = ratings
    .filter((r) => r > 0 && r <= 100)
    .sort((a, b) => b - a); // highest first, per VA procedure

  if (validRatings.length === 0) {
    return {
      combinedPercent: 0,
      roundedRating: 0,
      bilateralFactor: false,
      steps: [],
    };
  }

  const steps: CombinedRatingStep[] = [];
  let remainder = 100; // start with 100% "healthy"

  for (const rating of validRatings) {
    const previousRemainder = remainder;
    const disabilityValue = (rating / 100) * remainder;
    remainder = remainder - disabilityValue;

    const combined = 100 - remainder;
    steps.push({
      rating,
      remainder: Number(previousRemainder.toFixed(2)),
      combined: Number(combined.toFixed(2)),
    });
  }

  const combinedPercent = Number((100 - remainder).toFixed(2));
  const roundedRating = roundToNearest10(combinedPercent);

  // Bilateral factor heuristic: flag if there are 2+ ratings that could
  // plausibly be bilateral (we can't determine this definitively without
  // medical classification, but multiple same-value ratings are a hint)
  const ratingCounts = new Map<number, number>();
  for (const r of validRatings) {
    ratingCounts.set(r, (ratingCounts.get(r) ?? 0) + 1);
  }
  const bilateralFactor = Array.from(ratingCounts.values()).some(
    (count) => count >= 2,
  );

  return {
    combinedPercent,
    roundedRating,
    bilateralFactor,
    steps,
  };
}
