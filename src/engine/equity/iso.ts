// ---------------------------------------------------------------------------
// ISO (Incentive Stock Option) Compensation Handler
// ---------------------------------------------------------------------------
// ISOs are the tax code's way of saying "congratulations on your options,
// now here's a parallel tax universe (AMT) to worry about."
//
// Key rules:
// - No ordinary income at exercise (for regular tax purposes)
// - Bargain element (FMV - exercise price) is an AMT preference item
// - Qualifying disposition: >2 years from grant AND >1 year from exercise
//   → entire gain is long-term capital gain
// - Disqualifying disposition: ordinary income on bargain element,
//   remainder is capital gain
// ---------------------------------------------------------------------------

export interface IsoExerciseResult {
  exerciseDate: string;
  shares: number;
  exercisePrice: number;
  fairMarketValue: number;
  bargainElement: number; // FMV - exercise price (AMT preference item)
  amtPreferenceItem: number;
  regularTaxIncome: number; // $0 at exercise for qualifying disposition
}

export interface IsoDispositionResult {
  dispositionType: "qualifying" | "disqualifying";
  ordinaryIncome: number;
  capitalGain: number;
  holdingPeriodMet: boolean; // >2 years from grant, >1 year from exercise
  totalGain: number;
  costBasis: number;
  proceeds: number;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const TWO_YEARS_MS = ONE_YEAR_MS * 2;

/**
 * Calculate the tax consequences of exercising an ISO.
 *
 * For regular tax: $0 income recognized at exercise.
 * For AMT: the bargain element (FMV - exercise price) × shares
 * is added as a preference item. This is where ISOs get people —
 * you owe no regular tax, but might owe AMT on phantom income.
 */
export function calculateIsoExercise(
  shares: number,
  exercisePrice: number,
  fairMarketValue: number,
  exerciseDate: string,
): IsoExerciseResult {
  const bargainElement = roundCurrency(
    Math.max(0, (fairMarketValue - exercisePrice) * shares),
  );

  return {
    exerciseDate,
    shares,
    exercisePrice,
    fairMarketValue,
    bargainElement,
    amtPreferenceItem: bargainElement,
    regularTaxIncome: 0, // No regular tax income at exercise
  };
}

/**
 * Determine whether an ISO disposition is qualifying or disqualifying,
 * and compute the resulting income breakdown.
 *
 * Qualifying disposition (both must be true):
 *   - Sale date > 2 years after grant date
 *   - Sale date > 1 year after exercise date
 *   → Entire gain (sale price - exercise price) is long-term capital gain
 *
 * Disqualifying disposition (either holding period not met):
 *   → Ordinary income = (FMV at exercise - exercise price) × shares
 *      (but capped at actual gain if sale price < FMV at exercise)
 *   → Remainder = capital gain/loss
 */
export function calculateIsoDisposition(
  shares: number,
  exercisePrice: number,
  fairMarketValue: number,
  salePrice: number,
  grantDate: string,
  exerciseDate: string,
  saleDate: string,
): IsoDispositionResult {
  const saleDateMs = new Date(saleDate).getTime();
  const grantDateMs = new Date(grantDate).getTime();
  const exerciseDateMs = new Date(exerciseDate).getTime();

  const grantHoldingMet = saleDateMs - grantDateMs > TWO_YEARS_MS;
  const exerciseHoldingMet = saleDateMs - exerciseDateMs > ONE_YEAR_MS;
  const holdingPeriodMet = grantHoldingMet && exerciseHoldingMet;

  const totalProceeds = roundCurrency(shares * salePrice);
  const totalExerciseCost = roundCurrency(shares * exercisePrice);
  const totalGain = roundCurrency(totalProceeds - totalExerciseCost);

  if (holdingPeriodMet) {
    // Qualifying disposition: all gain is long-term capital gain
    return {
      dispositionType: "qualifying",
      ordinaryIncome: 0,
      capitalGain: totalGain,
      holdingPeriodMet: true,
      totalGain,
      costBasis: totalExerciseCost,
      proceeds: totalProceeds,
    };
  }

  // Disqualifying disposition: bargain element becomes ordinary income
  const bargainElement = roundCurrency(
    Math.max(0, (fairMarketValue - exercisePrice) * shares),
  );

  // If the stock dropped below FMV, ordinary income is capped at actual gain
  // (you don't recognize more ordinary income than you actually gained)
  const ordinaryIncome =
    totalGain <= 0
      ? Math.max(0, totalGain)
      : Math.min(bargainElement, totalGain);

  const capitalGain = roundCurrency(totalGain - ordinaryIncome);

  return {
    dispositionType: "disqualifying",
    ordinaryIncome: roundCurrency(ordinaryIncome),
    capitalGain,
    holdingPeriodMet: false,
    totalGain,
    costBasis: totalExerciseCost,
    proceeds: totalProceeds,
  };
}
