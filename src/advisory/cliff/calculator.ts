/**
 * Benefits cliff calculator.
 *
 * Given a household's income, size, and state, identifies every federal
 * benefit program they currently qualify for, the exact income point
 * where each one drops off, and the "safe raise threshold" — the
 * income level where additional earnings more than offset the lost
 * benefits.  Three million US households face these perverse
 * incentives; this calculator makes them visible.
 */

import type { CliffAnalysis } from "../../types.js";
import { PROGRAMS, fplPercent, getFpl } from "./programs.js";

export interface CliffInput {
  annualIncome: number;
  householdSize: number;
  state?: string | undefined;
}

export function calculateCliff(input: CliffInput): CliffAnalysis {
  const { annualIncome, householdSize, state = "CA" } = input;

  // 1. Current benefits at this income
  const currentBenefits: CliffAnalysis["currentBenefits"] = [];
  for (const program of PROGRAMS) {
    if (program.isEligible(annualIncome, householdSize, state)) {
      const monthly = program.monthlyBenefit(annualIncome, householdSize, state);
      if (monthly > 0) {
        currentBenefits.push({
          program: program.name,
          monthlyValue: monthly,
        });
      }
    }
  }

  // 2. Find cliff points — each income where a program drops off.
  //    The loss figure is the benefit they receive *right now*, since
  //    that's the value they'd eventually forfeit by earning past the
  //    cutoff (even if the benefit slides down along the way).
  const cliffPoints: CliffAnalysis["cliffPoints"] = [];
  for (const program of PROGRAMS) {
    const cutoff = program.cutoffIncome(householdSize, state);
    if (cutoff > annualIncome && program.isEligible(annualIncome, householdSize, state)) {
      const currentBenefit = program.monthlyBenefit(annualIncome, householdSize, state);
      if (currentBenefit > 0) {
        cliffPoints.push({
          income: cutoff,
          programLost: program.name,
          monthlyLoss: currentBenefit,
          annualLoss: currentBenefit * 12,
        });
      }
    }
  }

  // Sort cliff points ascending by income
  cliffPoints.sort((a, b) => a.income - b.income);

  // 3. Calculate total current package (earnings + benefits)
  const monthlyBenefitTotal = currentBenefits.reduce(
    (sum, b) => sum + b.monthlyValue,
    0,
  );
  const currentTotalAnnual = annualIncome + monthlyBenefitTotal * 12;

  // 4. Find safe raise threshold — the income where
  //    (new income + remaining benefits) >= current total package.
  //    Walk income up in $500 increments for precision without being
  //    computationally extravagant.
  let safeRaiseThreshold = annualIncome;

  if (cliffPoints.length > 0) {
    const ceiling = Math.max(
      ...cliffPoints.map((c) => c.income),
      annualIncome,
    );
    // Scan from current income to well past the last cliff
    for (
      let candidate = annualIncome + 500;
      candidate <= ceiling + 30_000;
      candidate += 500
    ) {
      let remainingMonthly = 0;
      for (const program of PROGRAMS) {
        if (program.isEligible(candidate, householdSize, state)) {
          remainingMonthly += program.monthlyBenefit(candidate, householdSize, state);
        }
      }
      const candidateTotal = candidate + remainingMonthly * 12;
      if (candidateTotal >= currentTotalAnnual) {
        safeRaiseThreshold = candidate;
        break;
      }
    }

    // If we never found a break-even, the furthest cliff + buffer
    if (safeRaiseThreshold === annualIncome && cliffPoints.length > 0) {
      safeRaiseThreshold = ceiling + 5_000;
    }
  }

  // 5. Generate recommendation
  const recommendation = buildRecommendation(
    annualIncome,
    householdSize,
    state,
    currentBenefits,
    cliffPoints,
    safeRaiseThreshold,
  );

  return {
    currentIncome: annualIncome,
    householdSize,
    state,
    currentBenefits,
    cliffPoints,
    safeRaiseThreshold,
    recommendation,
  };
}

function buildRecommendation(
  income: number,
  householdSize: number,
  state: string,
  benefits: CliffAnalysis["currentBenefits"],
  cliffs: CliffAnalysis["cliffPoints"],
  safeThreshold: number,
): string {
  const fplPct = fplPercent(income, householdSize);
  const fpl = getFpl(householdSize);

  if (benefits.length === 0) {
    return (
      `At $${income.toLocaleString()}/year (${Math.round(fplPct)}% FPL for a household of ${householdSize}), ` +
      `this household is above the eligibility thresholds for the major federal benefit programs. ` +
      `No benefits cliffs apply.`
    );
  }

  const totalMonthly = benefits.reduce((s, b) => s + b.monthlyValue, 0);
  const totalAnnual = totalMonthly * 12;
  const programNames = benefits.map((b) => b.program).join(", ");

  let text =
    `At $${income.toLocaleString()}/year (${Math.round(fplPct)}% FPL for a household of ${householdSize} in ${state}), ` +
    `this household currently receives an estimated $${totalMonthly.toLocaleString()}/month ` +
    `($${totalAnnual.toLocaleString()}/year) in benefits from: ${programNames}. `;

  if (cliffs.length > 0) {
    const nearestCliff = cliffs[0]!;
    text +=
      `The nearest cliff is at $${nearestCliff.income.toLocaleString()}/year, ` +
      `where ${nearestCliff.programLost} drops off (losing $${nearestCliff.annualLoss.toLocaleString()}/year). `;
  }

  if (safeThreshold > income) {
    const raiseNeeded = safeThreshold - income;
    text +=
      `To safely increase income without a net loss, aim for at least ` +
      `$${safeThreshold.toLocaleString()}/year — a raise of $${raiseNeeded.toLocaleString()}/year.`;
  }

  return text;
}
