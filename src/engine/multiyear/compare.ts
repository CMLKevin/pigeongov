// ---------------------------------------------------------------------------
// Multi-Year Tax Return Comparison
// ---------------------------------------------------------------------------
// Compare returns across years to surface trends and significant changes.
// A 20% delta on your tax bill deserves an explanation — this module
// provides the data to give one.
// ---------------------------------------------------------------------------

import type { TaxCalculationResult } from "../tax-calculator.js";

export interface YearOverYearComparison {
  years: number[];
  metrics: ComparisonMetric[];
  significantChanges: string[];
}

export interface ComparisonMetric {
  label: string;
  values: Record<number, number>;
  delta: number; // absolute change between first and last year
  deltaPercent: number; // percentage change between first and last year
}

interface ReturnBundle {
  year: number;
  bundle: Record<string, unknown>;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function roundPercent(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Significance threshold: changes exceeding 20% get flagged.
 * Not because 20% is a magic number, but because anything below it
 * is usually explainable by inflation adjustments and bracket creep.
 * Anything above it suggests a material life change worth reviewing.
 */
const SIGNIFICANT_CHANGE_THRESHOLD = 0.2;

type MetricExtractor = {
  label: string;
  key: keyof TaxCalculationResult;
};

const TRACKED_METRICS: MetricExtractor[] = [
  { label: "Gross Income", key: "grossIncome" },
  { label: "Adjusted Gross Income", key: "adjustedGrossIncome" },
  { label: "Deduction", key: "deduction" },
  { label: "Taxable Income", key: "taxableIncome" },
  { label: "Federal Tax", key: "federalTax" },
  { label: "Total Tax", key: "totalTax" },
  { label: "Total Credits", key: "totalCredits" },
  { label: "Refund", key: "refund" },
  { label: "Amount Owed", key: "amountOwed" },
  { label: "Effective Rate", key: "effectiveRate" },
];

function extractMetricValue(
  bundle: Record<string, unknown>,
  key: string,
): number {
  // Try to find the value in the bundle's calculation result or at top level
  const calculation = bundle["calculation"] as
    | Record<string, unknown>
    | undefined;
  if (calculation && typeof calculation[key] === "number") {
    return calculation[key] as number;
  }
  if (typeof bundle[key] === "number") {
    return bundle[key] as number;
  }
  // Check nested derived
  const derived = bundle["derived"] as Record<string, unknown> | undefined;
  if (derived && typeof derived[key] === "number") {
    return derived[key] as number;
  }
  return 0;
}

function buildMetric(
  label: string,
  key: string,
  bundles: ReturnBundle[],
): ComparisonMetric {
  const values: Record<number, number> = {};
  for (const b of bundles) {
    values[b.year] = extractMetricValue(b.bundle, key);
  }

  const sortedYears = bundles
    .map((b) => b.year)
    .sort((a, b) => a - b);
  const firstYear = sortedYears[0]!;
  const lastYear = sortedYears[sortedYears.length - 1]!;

  const firstValue = values[firstYear] ?? 0;
  const lastValue = values[lastYear] ?? 0;
  const delta = roundCurrency(lastValue - firstValue);
  const deltaPercent =
    firstValue === 0
      ? lastValue === 0
        ? 0
        : 100
      : roundPercent((delta / Math.abs(firstValue)) * 100);

  return { label, values, delta, deltaPercent };
}

/**
 * Compare tax returns across multiple years.
 *
 * Extracts key metrics from each year's bundle, calculates deltas,
 * and flags anything that changed by more than 20%. The result is
 * a structured comparison suitable for rendering in a dashboard
 * or advisory summary.
 */
export function compareReturns(
  bundles: ReturnBundle[],
): YearOverYearComparison {
  if (bundles.length === 0) {
    return { years: [], metrics: [], significantChanges: [] };
  }

  const sortedBundles = [...bundles].sort((a, b) => a.year - b.year);
  const years = sortedBundles.map((b) => b.year);

  const metrics = TRACKED_METRICS.map((m) =>
    buildMetric(m.label, m.key, sortedBundles),
  );

  const significantChanges: string[] = [];
  for (const metric of metrics) {
    if (Math.abs(metric.deltaPercent) > SIGNIFICANT_CHANGE_THRESHOLD * 100) {
      const direction = metric.delta > 0 ? "increased" : "decreased";
      significantChanges.push(
        `${metric.label} ${direction} by ${Math.abs(metric.deltaPercent).toFixed(1)}% ` +
          `(${metric.delta > 0 ? "+" : ""}$${metric.delta.toLocaleString()})`,
      );
    }
  }

  return { years, metrics, significantChanges };
}
