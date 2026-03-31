import type { FilingStatus } from "../types.js";
import {
  CAPITAL_LOSS_LIMIT_2025,
  LTCG_RATE_THRESHOLDS_2025,
  NIIT_2025,
} from "./tax-constants-2025.js";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface CapitalGainsInput {
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  /** Qualified dividends taxed at LTCG rates. */
  qualifiedDividends: number;
  /** Prior-year capital loss carryforward (positive number). */
  carryforwardLoss: number;
}

export interface CapitalGainsResult {
  netShortTerm: number;
  netLongTerm: number;
  /** Combined net gain (negative when there is a net loss). */
  totalNetGain: number;
  /** Deduction against ordinary income (capped at $3,000 / $1,500 MFS). */
  capitalLossDeduction: number;
  /** Unused loss that carries to the next year (positive number). */
  carryforwardToNextYear: number;
  /** Tax on qualified dividends at preferential rates. */
  qualifiedDividendsTax: number;
  /** Tax on net long-term capital gains at preferential rates. */
  longTermCapitalGainsTax: number;
  /** Net Investment Income Tax (3.8 % NIIT). */
  netInvestmentIncomeTax: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function maxZero(value: number): number {
  return value < 0 ? 0 : value;
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Apply capital-loss netting rules (IRC § 1(h), § 1211, § 1212).
 *
 * 1. Short-term losses offset short-term gains first, then long-term gains.
 * 2. Long-term losses offset long-term gains first, then short-term gains.
 * 3. Prior-year carryforward is applied as short-term loss.
 * 4. Net loss deduction against ordinary income is capped per filing status.
 * 5. Excess loss carries forward indefinitely.
 */
function netCapitalGains(
  input: CapitalGainsInput,
  filingStatus: FilingStatus,
): {
  netShortTerm: number;
  netLongTerm: number;
  totalNetGain: number;
  capitalLossDeduction: number;
  carryforwardToNextYear: number;
} {
  // Carryforward is treated as a short-term capital loss.
  const grossShortTerm = input.shortTermGains - input.shortTermLosses - input.carryforwardLoss;
  const grossLongTerm = input.longTermGains - input.longTermLosses;

  let netShortTerm: number;
  let netLongTerm: number;

  if (grossShortTerm < 0 && grossLongTerm > 0) {
    // Short-term net loss offsets long-term gains
    const combined = grossShortTerm + grossLongTerm;
    if (combined >= 0) {
      netShortTerm = 0;
      netLongTerm = combined;
    } else {
      netShortTerm = combined;
      netLongTerm = 0;
    }
  } else if (grossLongTerm < 0 && grossShortTerm > 0) {
    // Long-term net loss offsets short-term gains
    const combined = grossShortTerm + grossLongTerm;
    if (combined >= 0) {
      netShortTerm = combined;
      netLongTerm = 0;
    } else {
      netShortTerm = 0;
      netLongTerm = combined;
    }
  } else {
    netShortTerm = grossShortTerm;
    netLongTerm = grossLongTerm;
  }

  const totalNetGain = netShortTerm + netLongTerm;

  let capitalLossDeduction = 0;
  let carryforwardToNextYear = 0;

  if (totalNetGain < 0) {
    const limit = CAPITAL_LOSS_LIMIT_2025[filingStatus];
    capitalLossDeduction = Math.min(limit, Math.abs(totalNetGain));
    carryforwardToNextYear = Math.abs(totalNetGain) - capitalLossDeduction;
  }

  return {
    netShortTerm: roundCurrency(netShortTerm),
    netLongTerm: roundCurrency(netLongTerm),
    totalNetGain: roundCurrency(totalNetGain),
    capitalLossDeduction: roundCurrency(capitalLossDeduction),
    carryforwardToNextYear: roundCurrency(carryforwardToNextYear),
  };
}

/**
 * Compute tax on long-term capital gains and qualified dividends using the
 * layered bracket approach from the Qualified Dividends and Capital Gain Tax
 * Worksheet.
 *
 * The preferential-rate income sits "on top of" ordinary income within the
 * LTCG bracket structure, so we need the ordinary taxable income as context
 * to know which bracket band the preferential income starts in.
 */
export function calculateLtcgTax(
  filingStatus: FilingStatus,
  ordinaryTaxableIncome: number,
  netLtcg: number,
  qualifiedDividends: number,
): { longTermCapitalGainsTax: number; qualifiedDividendsTax: number } {
  const preferentialIncome = maxZero(netLtcg) + qualifiedDividends;
  if (preferentialIncome <= 0) {
    return { longTermCapitalGainsTax: 0, qualifiedDividendsTax: 0 };
  }

  const brackets = LTCG_RATE_THRESHOLDS_2025[filingStatus];
  // The preferential income stacks on top of ordinary income.
  const baseIncome = maxZero(ordinaryTaxableIncome);
  let remaining = preferentialIncome;
  let totalTax = 0;
  let previousUpperBound = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const currentUpperBound = bracket.upperBound ?? Infinity;

    // How much room is in this bracket above our base?
    const bracketStart = Math.max(previousUpperBound, baseIncome);
    const room = maxZero(currentUpperBound - bracketStart);

    if (room > 0) {
      const taxable = Math.min(remaining, room);
      totalTax += taxable * bracket.rate;
      remaining -= taxable;
    }

    previousUpperBound = currentUpperBound;
  }

  totalTax = roundCurrency(totalTax);

  // Apportion total between LTCG and qualified dividends proportionally.
  if (preferentialIncome > 0) {
    const ltcgShare = maxZero(netLtcg) / preferentialIncome;
    return {
      longTermCapitalGainsTax: roundCurrency(totalTax * ltcgShare),
      qualifiedDividendsTax: roundCurrency(totalTax * (1 - ltcgShare)),
    };
  }

  return { longTermCapitalGainsTax: totalTax, qualifiedDividendsTax: 0 };
}

/**
 * Compute the Net Investment Income Tax (NIIT) under IRC § 1411.
 *
 * 3.8% on the lesser of:
 *   (a) net investment income, or
 *   (b) MAGI minus threshold
 *
 * Net investment income includes capital gains, interest, dividends,
 * and rental income minus investment expenses.
 */
export function calculateNiit(
  filingStatus: FilingStatus,
  magi: number,
  netInvestmentIncome: number,
): number {
  const threshold = NIIT_2025.thresholds[filingStatus];
  const excessMagi = maxZero(magi - threshold);
  if (excessMagi <= 0 || netInvestmentIncome <= 0) {
    return 0;
  }
  return roundCurrency(Math.min(netInvestmentIncome, excessMagi) * NIIT_2025.rate);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full capital-gains computation for a given filing status and context.
 *
 * @param input           Gains, losses, and dividends
 * @param filingStatus    Determines bracket thresholds and loss-deduction cap
 * @param ordinaryTaxableIncome  Taxable income EXCLUDING preferential items —
 *                                needed to place LTCG into the correct bracket
 * @param magi            Modified adjusted gross income (for NIIT)
 * @param totalInterest   Taxable interest (for net investment income calc)
 * @param totalDividends  Ordinary dividends (for net investment income calc)
 */
export function calculateCapitalGains(
  input: CapitalGainsInput,
  filingStatus: FilingStatus,
  ordinaryTaxableIncome: number,
  magi: number,
  totalInterest: number = 0,
  totalDividends: number = 0,
): CapitalGainsResult {
  const netting = netCapitalGains(input, filingStatus);

  const { longTermCapitalGainsTax, qualifiedDividendsTax } = calculateLtcgTax(
    filingStatus,
    ordinaryTaxableIncome,
    netting.netLongTerm,
    input.qualifiedDividends,
  );

  // Net investment income for NIIT: capital gains + interest + dividends
  // (only the positive net gain portion; losses do not create negative NII)
  const netInvestmentIncome = roundCurrency(
    maxZero(netting.totalNetGain) +
      totalInterest +
      totalDividends +
      input.qualifiedDividends,
  );

  const netInvestmentIncomeTax = calculateNiit(
    filingStatus,
    magi,
    netInvestmentIncome,
  );

  return {
    ...netting,
    qualifiedDividendsTax,
    longTermCapitalGainsTax,
    netInvestmentIncomeTax,
  };
}
