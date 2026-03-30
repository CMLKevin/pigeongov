import type { ValidationCheck } from "../../types.js";

export interface StateTaxPlugin {
  stateCode: string;
  displayName: string;
  taxType: "progressive" | "flat" | "none";
  calculate: (input: StateTaxInput) => StateTaxResult;
  validate: (result: StateTaxResult) => ValidationCheck[];
}

export interface StateTaxInput {
  stateCode: string;
  filingStatus: string;
  federalAgi: number;
  federalTaxableIncome: number;
  wages: number;
  selfEmploymentIncome: number;
  interestIncome: number;
  dividendIncome: number;
  capitalGains: number;
  stateWithholding: number;
  residencyStatus: "full-year" | "part-year" | "nonresident";
  partYearMonths?: number;
}

export interface StateTaxResult {
  stateCode: string;
  displayName: string;
  stateAgi: number;
  stateDeduction: number;
  stateTaxableIncome: number;
  stateTax: number;
  stateCredits: number;
  localTax: number;
  totalStateTax: number;
  stateWithholding: number;
  stateRefund: number;
  stateOwed: number;
  effectiveRate: number;
  breakdown: Array<{
    rate: number;
    lowerBound: number;
    upperBound?: number;
    taxableAmount: number;
    taxAmount: number;
  }>;
}

export interface StateTaxBracket {
  upperBound?: number;
  rate: number;
}

export interface StateTaxConstants {
  stateCode: string;
  displayName: string;
  taxType: "progressive" | "flat" | "none";
  standardDeduction: Record<string, number>;
  personalExemption: Record<string, number>;
  brackets: Record<string, StateTaxBracket[]>;
  specialRules?: string[];
}
