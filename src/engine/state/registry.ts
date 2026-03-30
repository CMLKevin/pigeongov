import type { StateTaxPlugin, StateTaxInput, StateTaxResult } from "./types.js";
import { isNoIncomeTaxState } from "./common.js";
import { illinoisTaxPlugin } from "./il/calculator.js";
import { californiaTaxPlugin } from "./ca/calculator.js";
import { newYorkTaxPlugin } from "./ny/calculator.js";
import { pennsylvaniaTaxPlugin } from "./pa/calculator.js";
import { northCarolinaTaxPlugin } from "./nc/calculator.js";
import { michiganTaxPlugin } from "./mi/calculator.js";
import { georgiaTaxPlugin } from "./ga/calculator.js";
import { virginiaTaxPlugin } from "./va/calculator.js";
import { newJerseyTaxPlugin } from "./nj/calculator.js";
import { ohioTaxPlugin } from "./oh/calculator.js";

const statePlugins = new Map<string, StateTaxPlugin>();

function registerPlugin(plugin: StateTaxPlugin): void {
  statePlugins.set(plugin.stateCode.toUpperCase(), plugin);
}

// Register all implemented states
registerPlugin(illinoisTaxPlugin);
registerPlugin(californiaTaxPlugin);
registerPlugin(newYorkTaxPlugin);
registerPlugin(pennsylvaniaTaxPlugin);
registerPlugin(northCarolinaTaxPlugin);
registerPlugin(michiganTaxPlugin);
registerPlugin(georgiaTaxPlugin);
registerPlugin(virginiaTaxPlugin);
registerPlugin(newJerseyTaxPlugin);
registerPlugin(ohioTaxPlugin);

export function getStateTaxPlugin(stateCode: string): StateTaxPlugin | undefined {
  return statePlugins.get(stateCode.toUpperCase());
}

export function listImplementedStates(): Array<{ stateCode: string; displayName: string; taxType: string }> {
  return Array.from(statePlugins.values()).map((p) => ({
    stateCode: p.stateCode,
    displayName: p.displayName,
    taxType: p.taxType,
  }));
}

export function calculateStateTax(input: StateTaxInput): StateTaxResult | null {
  if (isNoIncomeTaxState(input.stateCode)) {
    return {
      stateCode: input.stateCode.toUpperCase(),
      displayName: `${input.stateCode.toUpperCase()} (no income tax)`,
      stateAgi: input.federalAgi,
      stateDeduction: 0,
      stateTaxableIncome: 0,
      stateTax: 0,
      stateCredits: 0,
      localTax: 0,
      totalStateTax: 0,
      stateWithholding: input.stateWithholding,
      stateRefund: input.stateWithholding,
      stateOwed: 0,
      effectiveRate: 0,
      breakdown: [],
    };
  }

  const plugin = getStateTaxPlugin(input.stateCode);
  if (!plugin) {
    return null; // State not yet implemented
  }

  return plugin.calculate(input);
}

export function getSupportedStates(): string[] {
  return [...Array.from(statePlugins.keys()), ...Array.from(
    // Include no-income-tax states as "supported" (they return $0)
    ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"],
  )].sort();
}
