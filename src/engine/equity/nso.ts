// ---------------------------------------------------------------------------
// NSO (Non-Qualified Stock Option) Compensation Handler
// ---------------------------------------------------------------------------
// NSOs are the blunt instrument of equity compensation:
// - At exercise: spread (FMV - exercise price) is ordinary income on W-2
// - Subject to income tax + payroll taxes at exercise
// - Cost basis = FMV at exercise (for subsequent sale calculations)
// - Any gain/loss after exercise is capital gain/loss
//
// The lack of AMT complexity is the only consolation for the higher
// tax bill at exercise compared to ISOs.
// ---------------------------------------------------------------------------

export interface NsoExerciseResult {
  exerciseDate: string;
  shares: number;
  exercisePrice: number;
  fairMarketValue: number;
  spread: number; // (FMV - exercise price) × shares → ordinary income (W-2)
  ordinaryIncome: number;
  costBasis: number; // FMV at exercise × shares
}

export interface NsoSaleResult {
  saleDate: string;
  shares: number;
  salePrice: number;
  costBasis: number; // per share (FMV at exercise)
  proceeds: number;
  capitalGain: number;
  holdingPeriod: "short-term" | "long-term";
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Calculate the tax consequences of exercising non-qualified stock options.
 *
 * The spread (FMV - exercise price) × shares is immediately recognized as
 * ordinary income and included on the employee's W-2. There's no deferral
 * mechanism, no AMT dance — just straightforward (if painful) taxation.
 */
export function calculateNsoExercise(
  shares: number,
  exercisePrice: number,
  fairMarketValue: number,
  exerciseDate: string,
): NsoExerciseResult {
  const spread = roundCurrency(
    Math.max(0, (fairMarketValue - exercisePrice) * shares),
  );
  const costBasis = roundCurrency(fairMarketValue * shares);

  return {
    exerciseDate,
    shares,
    exercisePrice,
    fairMarketValue,
    spread,
    ordinaryIncome: spread,
    costBasis,
  };
}

/**
 * Calculate the capital gain/loss from selling shares acquired via NSO exercise.
 *
 * Post-exercise, the shares are treated like any other stock:
 * - Cost basis = FMV at exercise
 * - Held > 1 year from exercise → long-term capital gain
 * - Otherwise → short-term
 */
export function calculateNsoSale(
  exerciseResult: NsoExerciseResult,
  salePrice: number,
  saleDate: string,
): NsoSaleResult {
  const costBasisPerShare = roundCurrency(
    exerciseResult.costBasis / exerciseResult.shares,
  );
  const proceeds = roundCurrency(exerciseResult.shares * salePrice);
  const totalCostBasis = roundCurrency(
    exerciseResult.shares * costBasisPerShare,
  );
  const capitalGain = roundCurrency(proceeds - totalCostBasis);

  const exerciseDateMs = new Date(exerciseResult.exerciseDate).getTime();
  const saleDateMs = new Date(saleDate).getTime();
  const holdingPeriod: "short-term" | "long-term" =
    saleDateMs - exerciseDateMs > ONE_YEAR_MS ? "long-term" : "short-term";

  return {
    saleDate,
    shares: exerciseResult.shares,
    salePrice,
    costBasis: costBasisPerShare,
    proceeds,
    capitalGain,
    holdingPeriod,
  };
}
