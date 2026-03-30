import type { CryptoDisposal, ParsedCryptoLot } from "./transaction-parser.js";

export interface WashSaleResult {
  disallowedLoss: number;
  adjustedDisposals: CryptoDisposal[];
  washSaleEvents: WashSaleEvent[];
}

export interface WashSaleEvent {
  disposalId: string;
  asset: string;
  originalLoss: number;
  disallowedAmount: number;
  replacementLotId: string;
  reason: string;
}

const WASH_SALE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Detect wash sales in crypto disposals.
 *
 * The IRS hasn't definitively required wash sale rules for crypto (as of 2025),
 * but applying them is the conservative approach and aligns with pending legislation.
 *
 * Wash sale: selling at a loss and buying substantially identical asset within
 * 30 days before or after the sale. The loss is disallowed and added to the
 * replacement lot's cost basis.
 */
export function detectWashSales(
  disposals: CryptoDisposal[],
  lots: ParsedCryptoLot[],
): WashSaleResult {
  const events: WashSaleEvent[] = [];
  const adjustedDisposals = disposals.map((d) => ({ ...d }));
  let totalDisallowed = 0;

  for (const disposal of adjustedDisposals) {
    // Only check losses
    if (disposal.gainOrLoss >= 0) continue;

    const saleDate = new Date(disposal.dateSold).getTime();
    const windowStart = saleDate - WASH_SALE_WINDOW_MS;
    const windowEnd = saleDate + WASH_SALE_WINDOW_MS;

    // Look for replacement purchases of the same asset within the window
    const replacementLot = lots.find((lot) => {
      if (lot.asset !== disposal.asset) return false;
      const acquiredDate = new Date(lot.dateAcquired).getTime();
      return acquiredDate >= windowStart && acquiredDate <= windowEnd && acquiredDate !== saleDate;
    });

    if (replacementLot) {
      const disallowedAmount = Math.abs(disposal.gainOrLoss);
      totalDisallowed += disallowedAmount;

      events.push({
        disposalId: disposal.id,
        asset: disposal.asset,
        originalLoss: disposal.gainOrLoss,
        disallowedAmount,
        replacementLotId: replacementLot.id,
        reason: `Substantially identical asset (${disposal.asset}) purchased within 30 days of sale at a loss`,
      });

      // Adjust the disposal: loss is disallowed
      disposal.gainOrLoss = 0;
    }
  }

  return {
    disallowedLoss: Number(totalDisallowed.toFixed(2)),
    adjustedDisposals,
    washSaleEvents: events,
  };
}
