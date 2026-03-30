// ---------------------------------------------------------------------------
// ESPP (Employee Stock Purchase Plan) Handler — IRC §423
// ---------------------------------------------------------------------------
// ESPPs let employees buy company stock at a discount (typically 15%).
// The tax treatment depends on when you sell:
//
// Qualifying disposition: held >2 years from offering date AND >1 year
// from purchase date. Ordinary income = lesser of (discount at offering,
// actual gain). Rest is long-term capital gain.
//
// Disqualifying disposition: either holding period not met.
// Ordinary income = FMV at purchase - purchase price (the actual discount).
// Rest is capital gain/loss.
// ---------------------------------------------------------------------------

export interface EsppPurchaseResult {
  purchaseDate: string;
  shares: number;
  purchasePrice: number; // discounted price per share
  fairMarketValue: number; // FMV at purchase per share
  discount: number; // total discount = (FMV - purchase price) × shares
  costBasis: number; // total cost basis = purchase price × shares
}

export interface EsppSaleResult {
  dispositionType: "qualifying" | "disqualifying";
  ordinaryIncome: number; // discount portion taxed as ordinary income
  capitalGain: number; // remainder taxed as capital gain/loss
  totalGain: number;
  proceeds: number;
  adjustedCostBasis: number; // cost basis + ordinary income recognized
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const TWO_YEARS_MS = ONE_YEAR_MS * 2;

/**
 * Calculate the purchase details of an ESPP transaction.
 *
 * Employees typically buy shares at 85% of the lower of (FMV at offering
 * start, FMV at purchase date). The discount is a future tax liability
 * waiting to happen — the IRS always gets its cut.
 */
export function calculateEsppPurchase(
  shares: number,
  purchasePrice: number,
  fairMarketValue: number,
  purchaseDate: string,
): EsppPurchaseResult {
  const discount = roundCurrency((fairMarketValue - purchasePrice) * shares);
  const costBasis = roundCurrency(purchasePrice * shares);

  return {
    purchaseDate,
    shares,
    purchasePrice,
    fairMarketValue,
    discount,
    costBasis,
  };
}

/**
 * Calculate the tax consequences of selling ESPP shares.
 *
 * Qualifying disposition (both required):
 *   - >2 years from offering date
 *   - >1 year from purchase date
 *   Ordinary income = lesser of:
 *     (a) actual gain (sale price - purchase price) × shares
 *     (b) offering discount (offering FMV × discount %) × shares
 *   For simplicity, we use (FMV at purchase - purchase price) as the
 *   discount baseline when offering-date FMV isn't provided.
 *
 * Disqualifying disposition:
 *   Ordinary income = (FMV at purchase - purchase price) × shares
 *   Capital gain = total gain - ordinary income
 */
export function calculateEsppSale(
  purchase: EsppPurchaseResult,
  salePrice: number,
  saleDate: string,
  offeringDate: string,
): EsppSaleResult {
  const saleDateMs = new Date(saleDate).getTime();
  const purchaseDateMs = new Date(purchase.purchaseDate).getTime();
  const offeringDateMs = new Date(offeringDate).getTime();

  const offeringHoldingMet = saleDateMs - offeringDateMs > TWO_YEARS_MS;
  const purchaseHoldingMet = saleDateMs - purchaseDateMs > ONE_YEAR_MS;
  const isQualifying = offeringHoldingMet && purchaseHoldingMet;

  const proceeds = roundCurrency(purchase.shares * salePrice);
  const totalGain = roundCurrency(proceeds - purchase.costBasis);

  if (isQualifying) {
    // Qualifying: ordinary income is capped at the discount or actual gain,
    // whichever is less (and never negative)
    const ordinaryIncome = roundCurrency(
      Math.max(0, Math.min(purchase.discount, totalGain)),
    );
    const capitalGain = roundCurrency(totalGain - ordinaryIncome);

    return {
      dispositionType: "qualifying",
      ordinaryIncome,
      capitalGain,
      totalGain,
      proceeds,
      adjustedCostBasis: roundCurrency(purchase.costBasis + ordinaryIncome),
    };
  }

  // Disqualifying: full discount at purchase is ordinary income
  const ordinaryIncome = roundCurrency(
    Math.max(0, purchase.discount),
  );
  const capitalGain = roundCurrency(totalGain - ordinaryIncome);

  return {
    dispositionType: "disqualifying",
    ordinaryIncome,
    capitalGain,
    totalGain,
    proceeds,
    adjustedCostBasis: roundCurrency(purchase.costBasis + ordinaryIncome),
  };
}
