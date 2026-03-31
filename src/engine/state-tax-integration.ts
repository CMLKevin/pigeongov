import type { FilingStatus } from "../types.js";
import type { StateTaxInput, StateTaxResult } from "./state/types.js";
import {
  calculateStateTax as registryCalculateStateTax,
  getStateTaxPlugin,
  listImplementedStates,
  getSupportedStates,
} from "./state/registry.js";
import { isNoIncomeTaxState, NO_INCOME_TAX_STATES } from "./state/common.js";

/**
 * High-level input for the state tax integration layer.
 * Bridges the federal calculator output to the state tax plugin system.
 */
export interface StateTaxIntegrationInput {
  /** Two-letter state code */
  state: string;
  /** Federal AGI from the federal return */
  federalAGI: number;
  /** Federal taxable income */
  federalTaxableIncome: number;
  /** W-2 wages */
  wages: number;
  /** Filing status (same as federal) */
  filingStatus: FilingStatus;
  /** Number of dependents */
  dependents: number;
  /** Itemized deductions (federal) */
  itemizedDeductions: number;
  /** State tax withheld from W-2 */
  stateWithheld: number;
  /** State estimated tax payments */
  stateEstimatedPayments: number;
  /** Property tax paid */
  propertyTaxPaid: number;
  /** Mortgage interest paid */
  mortgageInterest: number;
  /** Charitable contributions */
  charitableContributions: number;
}

/**
 * High-level result from the state tax integration layer.
 * Wraps the internal StateTaxResult with additional user-facing context.
 */
export interface StateTaxIntegrationResult {
  state: string;
  stateName: string;
  stateTaxableIncome: number;
  stateTax: number;
  stateCredits: number;
  stateEffectiveRate: number;
  stateWithheld: number;
  stateEstimatedPayments: number;
  stateRefund: number;
  stateOwed: number;
  brackets: Array<{ rate: number; amount: number; tax: number }>;
  notes: string[];
  /** The full internal state tax result, for anyone who needs the raw detail */
  rawResult: StateTaxResult | null;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

/**
 * Bridge from a federal return context into the state tax calculator registry.
 *
 * 1. Looks up the state calculator from the registry.
 * 2. If no calculator exists, returns a result with a helpful "not available" note.
 * 3. Computes refund/owed from withholding + estimated payments.
 */
export function calculateStateTax(input: StateTaxIntegrationInput): StateTaxIntegrationResult {
  const stateCode = input.state.toUpperCase();
  const stateName = STATE_NAMES[stateCode] ?? stateCode;

  // No income tax states: return zero result
  if (isNoIncomeTaxState(stateCode)) {
    return {
      state: stateCode,
      stateName,
      stateTaxableIncome: 0,
      stateTax: 0,
      stateCredits: 0,
      stateEffectiveRate: 0,
      stateWithheld: roundCurrency(input.stateWithheld),
      stateEstimatedPayments: roundCurrency(input.stateEstimatedPayments),
      stateRefund: roundCurrency(input.stateWithheld + input.stateEstimatedPayments),
      stateOwed: 0,
      brackets: [],
      notes: [
        `${stateName} does not levy a state income tax.`,
        ...(stateCode === "NH"
          ? ["New Hampshire taxes interest and dividend income only (being phased out)."]
          : []),
        ...(input.stateWithheld > 0
          ? [`State withholding of $${input.stateWithheld.toFixed(2)} should be fully refunded.`]
          : []),
      ],
      rawResult: null,
    };
  }

  // Check if we have a calculator for this state
  const plugin = getStateTaxPlugin(stateCode);
  if (!plugin) {
    const implemented = listImplementedStates().map((s) => s.stateCode).join(", ");
    return {
      state: stateCode,
      stateName,
      stateTaxableIncome: 0,
      stateTax: 0,
      stateCredits: 0,
      stateEffectiveRate: 0,
      stateWithheld: roundCurrency(input.stateWithheld),
      stateEstimatedPayments: roundCurrency(input.stateEstimatedPayments),
      stateRefund: 0,
      stateOwed: 0,
      brackets: [],
      notes: [
        `State tax calculator not available for ${stateCode}. Available states: ${implemented}`,
      ],
      rawResult: null,
    };
  }

  // Build the internal StateTaxInput from the integration input
  const stateTaxInput: StateTaxInput = {
    stateCode,
    filingStatus: input.filingStatus,
    federalAgi: input.federalAGI,
    federalTaxableIncome: input.federalTaxableIncome,
    wages: input.wages,
    selfEmploymentIncome: 0,
    interestIncome: 0,
    dividendIncome: 0,
    capitalGains: 0,
    stateWithholding: input.stateWithheld + input.stateEstimatedPayments,
    residencyStatus: "full-year",
  };

  const rawResult = registryCalculateStateTax(stateTaxInput);

  // Should not happen since we already checked the plugin, but handle gracefully
  if (!rawResult) {
    return {
      state: stateCode,
      stateName,
      stateTaxableIncome: 0,
      stateTax: 0,
      stateCredits: 0,
      stateEffectiveRate: 0,
      stateWithheld: roundCurrency(input.stateWithheld),
      stateEstimatedPayments: roundCurrency(input.stateEstimatedPayments),
      stateRefund: 0,
      stateOwed: 0,
      brackets: [],
      notes: [`Unexpected error calculating ${stateCode} state tax.`],
      rawResult: null,
    };
  }

  // Map the internal breakdown to the integration-level bracket format
  const brackets = rawResult.breakdown.map((b) => ({
    rate: b.rate,
    amount: b.taxableAmount,
    tax: b.taxAmount,
  }));

  // Build notes from the plugin's special rules
  const notes: string[] = [];
  const constants = plugin.stateCode; // We can look up special rules from the constants if exposed
  if (rawResult.localTax > 0) {
    notes.push(`Includes $${rawResult.localTax.toFixed(2)} in local/ancillary taxes.`);
  }
  if (rawResult.stateCredits > 0) {
    notes.push(`Applied $${rawResult.stateCredits.toFixed(2)} in state tax credits.`);
  }

  return {
    state: stateCode,
    stateName: rawResult.displayName,
    stateTaxableIncome: rawResult.stateTaxableIncome,
    stateTax: rawResult.totalStateTax,
    stateCredits: rawResult.stateCredits,
    stateEffectiveRate: rawResult.effectiveRate,
    stateWithheld: roundCurrency(input.stateWithheld),
    stateEstimatedPayments: roundCurrency(input.stateEstimatedPayments),
    stateRefund: rawResult.stateRefund,
    stateOwed: rawResult.stateOwed,
    brackets,
    notes,
    rawResult,
  };
}

/**
 * List all supported states (both implemented calculators and no-income-tax states).
 */
export function listSupportedStates(): Array<{
  stateCode: string;
  stateName: string;
  taxType: "progressive" | "flat" | "none";
  hasCalculator: boolean;
}> {
  const implemented = listImplementedStates();
  const result: Array<{
    stateCode: string;
    stateName: string;
    taxType: "progressive" | "flat" | "none";
    hasCalculator: boolean;
  }> = [];

  for (const entry of implemented) {
    result.push({
      stateCode: entry.stateCode,
      stateName: entry.displayName,
      taxType: entry.taxType as "progressive" | "flat" | "none",
      hasCalculator: true,
    });
  }

  for (const sc of NO_INCOME_TAX_STATES) {
    result.push({
      stateCode: sc,
      stateName: STATE_NAMES[sc] ?? sc,
      taxType: "none",
      hasCalculator: true, // We handle them — just return $0
    });
  }

  return result.sort((a, b) => a.stateCode.localeCompare(b.stateCode));
}

/** Re-export for convenience */
export { getSupportedStates, isNoIncomeTaxState };
