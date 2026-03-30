import type { ParsedCryptoLot, CryptoDisposal, RawCryptoTransaction } from "./transaction-parser.js";

export type CostBasisMethod = "fifo" | "lifo" | "specific-id";

const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export function calculateDisposals(
  lots: ParsedCryptoLot[],
  sales: RawCryptoTransaction[],
  method: CostBasisMethod = "fifo",
): CryptoDisposal[] {
  // Clone lots so we can mutate remaining amounts
  const availableLots = lots.map((lot) => ({
    ...lot,
    remaining: lot.amount,
    costBasisPerUnit: lot.amount > 0 ? lot.costBasis / lot.amount : 0,
  }));

  const disposals: CryptoDisposal[] = [];
  let disposalCounter = 0;

  for (const sale of sales.filter((tx) => tx.type === "sell" || tx.type === "trade")) {
    let amountToSell = sale.amount;
    const proceedsPerUnit = sale.amount > 0 ? sale.totalValue / sale.amount : 0;
    const saleDate = new Date(sale.date);
    const lotAllocations: CryptoDisposal["lots"] = [];
    let totalCostBasis = 0;

    // Filter lots for the same asset
    const assetLots = availableLots.filter(
      (lot) => lot.asset === sale.asset && lot.remaining > 0,
    );

    // Sort by method
    if (method === "fifo") {
      assetLots.sort((a, b) => new Date(a.dateAcquired).getTime() - new Date(b.dateAcquired).getTime());
    } else if (method === "lifo") {
      assetLots.sort((a, b) => new Date(b.dateAcquired).getTime() - new Date(a.dateAcquired).getTime());
    }
    // specific-id would require explicit lot matching — not implemented in auto mode

    for (const lot of assetLots) {
      if (amountToSell <= 0) break;

      const amountFromLot = Math.min(lot.remaining, amountToSell);
      const costBasisFromLot = amountFromLot * lot.costBasisPerUnit;

      lotAllocations.push({
        lotId: lot.id,
        amountUsed: amountFromLot,
        costBasis: roundCurrency(costBasisFromLot),
      });

      totalCostBasis += costBasisFromLot;
      lot.remaining -= amountFromLot;
      amountToSell -= amountFromLot;
    }

    if (amountToSell > 0.0001) {
      // Sold more than owned — flag this but still create the disposal
      totalCostBasis = 0; // Unknown cost basis for excess
    }

    const proceeds = sale.totalValue - (sale.fee ?? 0);
    const gainOrLoss = proceeds - totalCostBasis;

    // Determine holding period from the earliest lot used
    const earliestLotDate = lotAllocations.length > 0
      ? new Date(availableLots.find((l) => l.id === lotAllocations[0]!.lotId)?.dateAcquired ?? sale.date)
      : saleDate;
    const holdingPeriodMs = saleDate.getTime() - earliestLotDate.getTime();
    const holdingPeriod: "short-term" | "long-term" =
      holdingPeriodMs > ONE_YEAR_MS ? "long-term" : "short-term";

    disposalCounter++;
    disposals.push({
      id: `disposal-${disposalCounter}`,
      asset: sale.asset,
      dateSold: sale.date,
      proceeds: roundCurrency(proceeds),
      amount: sale.amount,
      costBasis: roundCurrency(totalCostBasis),
      gainOrLoss: roundCurrency(gainOrLoss),
      holdingPeriod,
      lots: lotAllocations,
    });
  }

  return disposals;
}

export interface CryptoTaxSummary {
  totalProceeds: number;
  totalCostBasis: number;
  totalGainOrLoss: number;
  shortTermGain: number;
  shortTermLoss: number;
  longTermGain: number;
  longTermLoss: number;
  netShortTerm: number;
  netLongTerm: number;
  disposalCount: number;
  stakingIncome: number;
  miningIncome: number;
  airdropIncome: number;
}

export function summarizeCryptoTax(
  disposals: CryptoDisposal[],
  transactions: RawCryptoTransaction[],
): CryptoTaxSummary {
  let shortTermGain = 0;
  let shortTermLoss = 0;
  let longTermGain = 0;
  let longTermLoss = 0;

  for (const d of disposals) {
    if (d.holdingPeriod === "short-term") {
      if (d.gainOrLoss >= 0) shortTermGain += d.gainOrLoss;
      else shortTermLoss += Math.abs(d.gainOrLoss);
    } else {
      if (d.gainOrLoss >= 0) longTermGain += d.gainOrLoss;
      else longTermLoss += Math.abs(d.gainOrLoss);
    }
  }

  const stakingIncome = transactions
    .filter((tx) => tx.type === "staking_reward")
    .reduce((sum, tx) => sum + tx.totalValue, 0);

  const miningIncome = transactions
    .filter((tx) => tx.type === "mining")
    .reduce((sum, tx) => sum + tx.totalValue, 0);

  const airdropIncome = transactions
    .filter((tx) => tx.type === "airdrop")
    .reduce((sum, tx) => sum + tx.totalValue, 0);

  return {
    totalProceeds: roundCurrency(disposals.reduce((sum, d) => sum + d.proceeds, 0)),
    totalCostBasis: roundCurrency(disposals.reduce((sum, d) => sum + d.costBasis, 0)),
    totalGainOrLoss: roundCurrency(disposals.reduce((sum, d) => sum + d.gainOrLoss, 0)),
    shortTermGain: roundCurrency(shortTermGain),
    shortTermLoss: roundCurrency(shortTermLoss),
    longTermGain: roundCurrency(longTermGain),
    longTermLoss: roundCurrency(longTermLoss),
    netShortTerm: roundCurrency(shortTermGain - shortTermLoss),
    netLongTerm: roundCurrency(longTermGain - longTermLoss),
    disposalCount: disposals.length,
    stakingIncome: roundCurrency(stakingIncome),
    miningIncome: roundCurrency(miningIncome),
    airdropIncome: roundCurrency(airdropIncome),
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
