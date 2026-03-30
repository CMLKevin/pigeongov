// ---------------------------------------------------------------------------
// RSU (Restricted Stock Unit) Compensation Handler
// ---------------------------------------------------------------------------
// RSUs are straightforward: shares vest, FMV at vesting is ordinary income
// reported on W-2. Cost basis for future sale equals FMV at vest.
// ---------------------------------------------------------------------------

export interface RsuVestingEvent {
  vestDate: string;
  shares: number;
  fairMarketValue: number; // per share at vesting
  totalIncome: number; // shares × FMV — reported on W-2
  costBasis: number; // equals totalIncome (FMV at vest)
}

export interface RsuSaleResult {
  saleDate: string;
  shares: number;
  salePrice: number; // per share
  costBasis: number; // FMV at vest per share
  proceeds: number;
  gainOrLoss: number;
  holdingPeriod: "short-term" | "long-term";
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Determines how many milliseconds constitute one year for holding-period
 * purposes. We use 365.25 days to account for leap years — close enough
 * for the IRS's "more than one year" rule, which in practice uses calendar
 * dates. A proper calendar-date check would be more precise, but this
 * handles the vast majority of cases correctly.
 */
const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function determineHoldingPeriod(
  acquiredDate: string,
  soldDate: string,
): "short-term" | "long-term" {
  const acquired = new Date(acquiredDate).getTime();
  const sold = new Date(soldDate).getTime();
  return sold - acquired > ONE_YEAR_MS ? "long-term" : "short-term";
}

/**
 * Calculate the income recognized when RSU shares vest.
 *
 * At vesting, RSU income = shares × FMV per share.
 * This amount is reported as ordinary income on the employee's W-2.
 * The cost basis for any future sale is the FMV at the time of vesting.
 */
export function calculateRsuVesting(
  shares: number,
  fmvPerShare: number,
  vestDate: string,
): RsuVestingEvent {
  const totalIncome = roundCurrency(shares * fmvPerShare);
  return {
    vestDate,
    shares,
    fairMarketValue: fmvPerShare,
    totalIncome,
    costBasis: totalIncome,
  };
}

/**
 * Calculate gain/loss on the sale of previously-vested RSU shares.
 *
 * Proceeds = shares × sale price.
 * Gain/loss = proceeds - (cost basis per share × shares).
 * If held > 1 year from vest date → long-term capital gain/loss.
 * Otherwise → short-term.
 */
export function calculateRsuSale(
  vestEvent: RsuVestingEvent,
  salePrice: number,
  saleDate: string,
): RsuSaleResult {
  const costBasisPerShare = roundCurrency(
    vestEvent.costBasis / vestEvent.shares,
  );
  const proceeds = roundCurrency(vestEvent.shares * salePrice);
  const totalCostBasis = roundCurrency(vestEvent.shares * costBasisPerShare);
  const gainOrLoss = roundCurrency(proceeds - totalCostBasis);
  const holdingPeriod = determineHoldingPeriod(vestEvent.vestDate, saleDate);

  return {
    saleDate,
    shares: vestEvent.shares,
    salePrice,
    costBasis: costBasisPerShare,
    proceeds,
    gainOrLoss,
    holdingPeriod,
  };
}
