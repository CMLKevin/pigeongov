/**
 * Federal poverty level constants and benefit program definitions.
 *
 * FPL figures are 2025 HHS guidelines for the 48 contiguous states + DC.
 * Alaska and Hawaii use higher thresholds in practice, but we use the
 * continental baseline here — conservative is honest.
 */

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

// --- Program definitions ---

export interface ProgramDefinition {
  id: string;
  name: string;
  /** FPL percentage cutoff — income above this kills eligibility */
  cutoffFplPercent: number;
  /** Whether this household size + income qualifies */
  isEligible: (income: number, householdSize: number) => boolean;
  /** Monthly benefit value at given income */
  monthlyBenefit: (income: number, householdSize: number) => number;
  /** Income at which eligibility ends */
  cutoffIncome: (householdSize: number) => number;
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
    isEligible: (income, hs) => income <= getFpl(hs) * 1.38,
    monthlyBenefit: (_income, _hs) => 600,
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * 1.38),
  },
  {
    id: "wic",
    name: "WIC",
    cutoffFplPercent: 185,
    isEligible: (income, hs) => income <= getFpl(hs) * 1.85,
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
    isEligible: (income, hs) => income <= getFpl(hs) * 2.0,
    monthlyBenefit: (_income, _hs) => 200,
    cutoffIncome: (hs) => Math.floor(getFpl(hs) * 2.0),
  },
];
