/**
 * Federal poverty level constants and benefit program definitions.
 *
 * FPL figures are 2025 HHS guidelines for the 48 contiguous states + DC.
 * Alaska and Hawaii use higher thresholds in practice, but we use the
 * continental baseline here — conservative is honest.
 */

import { getStateMedicaidLimits } from "./state-medicaid.js";

// --- FPL 2025 ---

export const FPL_BASE = 15_650;
export const FPL_PER_ADDITIONAL = 5_580;

export function getFpl(householdSize: number): number {
  if (householdSize < 1) return FPL_BASE;
  return FPL_BASE + FPL_PER_ADDITIONAL * (householdSize - 1);
}

export function fplPercent(income: number, householdSize: number): number {
  return (income / getFpl(householdSize)) * 100;
}

// --- State-specific data ---

/** States that have NOT expanded Medicaid under ACA as of 2025 */
const NON_EXPANSION_STATES = new Set([
  "AL", "FL", "GA", "KS", "MS", "SC", "TN", "TX", "WI", "WY",
]);

export function isMedicaidExpansionState(state: string): boolean {
  return !NON_EXPANSION_STATES.has(state.toUpperCase());
}

// --- Program definitions ---

export interface ProgramDefinition {
  id: string;
  name: string;
  /** FPL percentage cutoff — income above this kills eligibility */
  cutoffFplPercent: number;
  /** Whether this household size + income qualifies */
  isEligible: (income: number, householdSize: number, state?: string) => boolean;
  /** Monthly benefit value at given income */
  monthlyBenefit: (income: number, householdSize: number, state?: string) => number;
  /** Income at which eligibility ends */
  cutoffIncome: (householdSize: number, state?: string) => number;
}

// SNAP max monthly allotments by household size (FY2025)
const SNAP_MAX_ALLOTMENTS: Record<number, number> = {
  1: 292,
  2: 536,
  3: 768,
  4: 975,
  5: 1_158,
  6: 1_390,
  7: 1_536,
  8: 1_756,
};

function getSnapMaxAllotment(householdSize: number): number {
  if (householdSize <= 0) return 0;
  if (householdSize <= 8) return SNAP_MAX_ALLOTMENTS[householdSize] ?? 0;
  // Each additional person above 8 adds ~$220
  return (SNAP_MAX_ALLOTMENTS[8] ?? 1_756) + (householdSize - 8) * 220;
}

// SSI Federal Benefit Rate (2025)
export const SSI_FBR_INDIVIDUAL_ANNUAL = 967 * 12; // $11,604/year

// TANF simplified benefit model
const TANF_AVG_MONTHLY = 492;

// CCDF (childcare) — simplified: eligible below 85% state median income
// We approximate state median income as ~200% FPL for simplicity
const CCDF_INCOME_LIMIT_FPL_PCT = 200; // rough proxy for 85% state median

export const PROGRAMS: ProgramDefinition[] = [
  {
    id: "snap",
    name: "SNAP (Food Stamps)",
    cutoffFplPercent: 130,
    isEligible: (income, hs) => income <= getFpl(hs) * 1.3,
    monthlyBenefit: (income, hs) => {
      if (income > getFpl(hs) * 1.3) return 0;
      const max = getSnapMaxAllotment(hs);
      // Benefit reduces by 30% of net income above a deduction floor
      const standardDeduction = hs <= 3 ? 198 : hs <= 5 ? 208 : 239;
      const monthlyIncome = income / 12;
      const netIncome = Math.max(0, monthlyIncome - standardDeduction);
      const reduction = netIncome * 0.3;
      return Math.max(0, Math.round(max - reduction));
    },
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * 1.3),
  },
  {
    id: "medicaid",
    name: "Medicaid",
    cutoffFplPercent: 138,
    isEligible: (income, hs, state) => {
      const limits = getStateMedicaidLimits(state ?? "CA");
      // For cliff analysis (which doesn't know household composition),
      // use adultLimit as primary. In non-expansion states with adultLimit=0,
      // childless adults are simply ineligible — we can't assume children.
      const cutoffPct = limits.adultLimit;
      if (cutoffPct <= 0) return false;
      return income <= getFpl(hs) * (cutoffPct / 100);
    },
    monthlyBenefit: (_income, _hs) => 600,
    cutoffIncome: (hs, state) => {
      const limits = getStateMedicaidLimits(state ?? "CA");
      const cutoffPct = limits.adultLimit;
      if (cutoffPct <= 0) return 0;
      return Math.floor(getFpl(hs) * (cutoffPct / 100));
    },
  },
  {
    id: "wic",
    name: "WIC",
    cutoffFplPercent: 185,
    isEligible: (income, hs) => hs >= 2 && income <= getFpl(hs) * 1.85,
    monthlyBenefit: (_income, _hs) => 75,
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * 1.85),
  },
  {
    id: "liheap",
    name: "LIHEAP (Energy Assistance)",
    cutoffFplPercent: 150,
    isEligible: (income, hs) => income <= getFpl(hs) * 1.5,
    monthlyBenefit: (_income, _hs) => 50,
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * 1.5),
  },
  {
    id: "aca_subsidy",
    name: "ACA Premium Subsidy",
    cutoffFplPercent: 400,
    isEligible: (income, hs) => {
      const pct = fplPercent(income, hs);
      return pct >= 100 && pct <= 400;
    },
    monthlyBenefit: (income, hs) => {
      const pct = fplPercent(income, hs);
      if (pct < 100 || pct > 400) return 0;
      // Linear slide: $500/mo at 150% FPL -> $50/mo at 400% FPL
      const t = Math.min(1, Math.max(0, (pct - 150) / (400 - 150)));
      return Math.round(500 - t * 450);
    },
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * 4.0),
  },
  {
    id: "chip",
    name: "CHIP (Children's Health Insurance)",
    cutoffFplPercent: 200,
    isEligible: (income, hs) => hs >= 2 && income <= getFpl(hs) * 2.0,
    monthlyBenefit: (_income, _hs) => 200,
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * 2.0),
  },
  {
    id: "tanf",
    name: "TANF (Cash Assistance)",
    cutoffFplPercent: 50,
    isEligible: (income, hs) => hs >= 2 && income <= getFpl(hs) * 0.5,
    monthlyBenefit: (income, hs) => {
      if (hs < 2 || income > getFpl(hs) * 0.5) return 0;
      // Base benefit scales with household size (national averages)
      const baseBenefit = hs <= 1 ? 200 : hs === 2 ? 350 : hs === 3 ? 492 : hs === 4 ? 600 : 600 + (hs - 4) * 80;
      const monthlyIncome = income / 12;
      // TANF earned income disregard: $200 standard deduction, then 50% of remainder
      const countableIncome = Math.max(0, monthlyIncome - 200) * 0.50;
      return Math.max(0, Math.round(baseBenefit - countableIncome));
    },
    cutoffIncome: (hs) => {
      // Cutoff based on household-size-scaled benefit
      const baseBenefit = hs <= 1 ? 200 : hs === 2 ? 350 : hs === 3 ? 492 : hs === 4 ? 600 : 600 + (hs - 4) * 80;
      // Income where benefit reaches 0: solve baseBenefit = (monthlyIncome - 200) * 0.50
      // monthlyIncome = baseBenefit / 0.50 + 200
      const impliedCutoff = Math.floor((baseBenefit / 0.50 + 200) * 12);
      return Math.min(impliedCutoff, Math.floor(getFpl(hs) * 0.5));
    },
  },
  // SSI removed from cliff analysis: eligibility requires categorical
  // qualification (age 65+, blind, or disabled) that CliffInput doesn't
  // capture. The benefits screener handles SSI correctly.
  // If income < SSI_FBR_INDIVIDUAL_ANNUAL, the recommendation text will
  // note potential SSI eligibility for qualified individuals.
  {
    id: "ccdf",
    name: "CCDF (Childcare Subsidies)",
    cutoffFplPercent: CCDF_INCOME_LIMIT_FPL_PCT,
    isEligible: (income, hs) => hs >= 2 && income <= getFpl(hs) * (CCDF_INCOME_LIMIT_FPL_PCT / 100),
    monthlyBenefit: (income, hs) => {
      if (hs < 2 || income > getFpl(hs) * (CCDF_INCOME_LIMIT_FPL_PCT / 100)) return 0;
      // Simplified benefit: ~$500-$1000/month depending on household size
      // Larger households (more children) get more; lower income gets more
      const baseBenefit = hs >= 4 ? 1_000 : hs >= 3 ? 750 : 500;
      const pct = fplPercent(income, hs);
      // Taper: full benefit at 0% FPL, 50% benefit at the cutoff
      const taper = 1 - (pct / CCDF_INCOME_LIMIT_FPL_PCT) * 0.5;
      return Math.max(0, Math.round(baseBenefit * taper));
    },
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * (CCDF_INCOME_LIMIT_FPL_PCT / 100)),
  },
];
