// ---------------------------------------------------------------------------
// Tax Carryforward Tracker
// ---------------------------------------------------------------------------
// Some tax items persist across years like a hangover from a particularly
// volatile portfolio. This module tracks capital loss carryovers,
// excess charitable contributions, and net operating losses.
//
// Key limits:
// - Capital losses: max $3,000/year deductible against ordinary income,
//   remainder carries forward indefinitely
// - Charitable contributions: generally capped at 60% of AGI,
//   excess carries forward up to 5 years
// - NOL: carries forward indefinitely (post-TCJA), limited to 80% of
//   taxable income in carryforward years
// ---------------------------------------------------------------------------

export interface CarryforwardState {
  taxYear: number;
  capitalLossCarryover: number; // Remaining capital loss to carry forward
  charitableExcess: number; // Charitable contributions over 60% AGI limit
  netOperatingLoss: number; // NOL carryforward balance
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Maximum capital loss deduction allowed against ordinary income per year.
 * Married-filing-separately gets $1,500, everyone else gets $3,000.
 * We use $3,000 as the default since MFS is the minority case.
 */
const MAX_CAPITAL_LOSS_DEDUCTION = 3_000;

/**
 * Post-TCJA NOL deduction is limited to 80% of taxable income
 * in the carryforward year.
 */
const NOL_DEDUCTION_LIMIT_PERCENT = 0.8;

/**
 * Calculate the carryforward state after applying current-year deductions.
 *
 * Takes the existing carryforward balances, subtracts what was used
 * this year, and returns the remaining balances to carry into next year.
 */
export function calculateCarryforward(
  currentYear: CarryforwardState,
  capitalLossUsed: number,
  charitableUsed: number,
): CarryforwardState {
  return {
    taxYear: currentYear.taxYear + 1,
    capitalLossCarryover: roundCurrency(
      Math.max(0, currentYear.capitalLossCarryover - capitalLossUsed),
    ),
    charitableExcess: roundCurrency(
      Math.max(0, currentYear.charitableExcess - charitableUsed),
    ),
    netOperatingLoss: currentYear.netOperatingLoss, // NOL usage tracked separately
  };
}

/**
 * Apply carryforward balances to the next year's income to determine
 * how much can be deducted.
 *
 * Capital loss carryover: up to $3,000 against ordinary income,
 * plus unlimited offset against capital gains (not modeled here —
 * that happens in the capital gains module).
 *
 * Charitable excess: carried forward at the same AGI-percentage limit.
 *
 * NOL: limited to 80% of taxable income in the carryforward year.
 */
export function applyCarryforward(
  state: CarryforwardState,
  nextYearIncome: number,
): {
  capitalLossDeduction: number;
  charitableDeduction: number;
  nolDeduction: number;
  remainingCarryforward: CarryforwardState;
} {
  // Capital loss: deduct up to $3,000 against ordinary income
  const capitalLossDeduction = roundCurrency(
    Math.min(state.capitalLossCarryover, MAX_CAPITAL_LOSS_DEDUCTION),
  );

  // Charitable: allow the full excess (subject to AGI limits applied elsewhere)
  const charitableDeduction = roundCurrency(state.charitableExcess);

  // NOL: limited to 80% of taxable income
  const nolLimit = roundCurrency(
    Math.max(0, nextYearIncome * NOL_DEDUCTION_LIMIT_PERCENT),
  );
  const nolDeduction = roundCurrency(
    Math.min(state.netOperatingLoss, nolLimit),
  );

  const remainingCarryforward: CarryforwardState = {
    taxYear: state.taxYear + 1,
    capitalLossCarryover: roundCurrency(
      Math.max(0, state.capitalLossCarryover - capitalLossDeduction),
    ),
    charitableExcess: roundCurrency(
      Math.max(0, state.charitableExcess - charitableDeduction),
    ),
    netOperatingLoss: roundCurrency(
      Math.max(0, state.netOperatingLoss - nolDeduction),
    ),
  };

  return {
    capitalLossDeduction,
    charitableDeduction,
    nolDeduction,
    remainingCarryforward,
  };
}
