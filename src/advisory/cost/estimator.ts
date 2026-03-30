import type { CostEstimate } from "../../types.js";

// ---------------------------------------------------------------------------
// Cost database
// ---------------------------------------------------------------------------
// Each entry describes the real costs a person faces when completing a
// government workflow on their own (DIY), with PigeonGov (free tooling), and
// with an attorney.  Ranges capture variation (medical exam costs, CPA tiers,
// publication requirements, etc.).
// ---------------------------------------------------------------------------

interface CostLineItem {
  item: string;
  min: number;
  max: number;
  type: "filing" | "biometric" | "medical" | "service" | "expedite" | "optional" | "notarization" | "photo" | "publication" | "background";
}

interface AttorneyRange {
  min: number;
  max: number;
  description: string;
}

interface WorkflowCostEntry {
  fees: CostLineItem[];
  attorney: AttorneyRange;
}

const COST_DATABASE: Record<string, WorkflowCostEntry> = {
  "tax/1040": {
    fees: [
      { item: "Federal e-file", min: 0, max: 0, type: "filing" },
    ],
    attorney: {
      min: 200,
      max: 1200,
      description: "CPA or enrolled agent preparation fee — varies by return complexity",
    },
  },

  "immigration/family-visa-intake": {
    fees: [
      { item: "I-130 filing fee", min: 675, max: 675, type: "filing" },
      { item: "I-485 filing fee", min: 1440, max: 1440, type: "filing" },
      { item: "Biometrics fee", min: 85, max: 85, type: "biometric" },
      { item: "Medical examination (I-693)", min: 200, max: 500, type: "medical" },
    ],
    attorney: {
      min: 2000,
      max: 5000,
      description: "Immigration attorney for family-based petition through adjustment of status",
    },
  },

  "immigration/naturalization": {
    fees: [
      { item: "N-400 filing fee", min: 760, max: 760, type: "filing" },
      { item: "Passport-style photos", min: 10, max: 30, type: "photo" },
    ],
    attorney: {
      min: 1500,
      max: 7500,
      description: "Immigration attorney for naturalization — higher end for complex cases",
    },
  },

  "legal/small-claims": {
    fees: [
      { item: "Court filing fee", min: 75, max: 75, type: "filing" },
      { item: "Service of process", min: 20, max: 75, type: "service" },
    ],
    attorney: {
      min: 500,
      max: 2000,
      description: "Attorney representation or consultation for small claims matter",
    },
  },

  "legal/expungement": {
    fees: [
      { item: "Petition filing fee", min: 250, max: 250, type: "filing" },
      { item: "Background check", min: 25, max: 50, type: "background" },
      { item: "Fingerprinting", min: 20, max: 50, type: "biometric" },
    ],
    attorney: {
      min: 900,
      max: 3000,
      description: "Attorney for criminal record expungement petition and hearing",
    },
  },

  "estate/basic-will": {
    fees: [
      { item: "Notarization", min: 10, max: 25, type: "notarization" },
    ],
    attorney: {
      min: 300,
      max: 1500,
      description: "Estate attorney for will drafting and execution",
    },
  },

  "identity/passport": {
    fees: [
      { item: "DS-11 application fee", min: 165, max: 165, type: "filing" },
      { item: "Execution / acceptance fee", min: 35, max: 35, type: "service" },
      { item: "Passport photos", min: 10, max: 20, type: "photo" },
      { item: "Expedited processing", min: 0, max: 60, type: "expedite" },
    ],
    attorney: {
      min: 100,
      max: 400,
      description: "Passport expediting service or attorney assistance — rarely needed",
    },
  },

  "identity/name-change": {
    fees: [
      { item: "Court petition filing fee", min: 200, max: 200, type: "filing" },
      { item: "Legal publication requirement", min: 0, max: 150, type: "publication" },
      { item: "Certified copies of order", min: 10, max: 50, type: "optional" },
    ],
    attorney: {
      min: 300,
      max: 1000,
      description: "Attorney for name change petition, publication, and court appearance",
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumBreakdown(fees: CostLineItem[], pick: "min" | "max"): number {
  return fees.reduce((acc, f) => acc + f[pick], 0);
}

function toBreakdown(fees: CostLineItem[], pick: "min" | "max"): Array<{ item: string; amount: number; type: string }> {
  return fees.map((f) => ({ item: f.item, amount: f[pick], type: f.type }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Estimate the cost of a government workflow across three tiers:
 * DIY, with PigeonGov (free tooling), and with an attorney.
 *
 * Returns `null` for unknown workflows.
 */
export function estimateCost(workflowId: string): CostEstimate | null {
  const entry = COST_DATABASE[workflowId];
  if (!entry) return null;

  const diyMin = sumBreakdown(entry.fees, "min");
  const diyMax = sumBreakdown(entry.fees, "max");

  // PigeonGov is free — same government fees, no tool surcharge
  const withToolMin = diyMin;
  const withToolMax = diyMax;

  const attMin = diyMin + entry.attorney.min;
  const attMax = diyMax + entry.attorney.max;

  // Savings: compare midpoint of attorney range to midpoint of with-tool
  const attMid = (attMin + attMax) / 2;
  const toolMid = (withToolMin + withToolMax) / 2;
  const vsAttorney = Math.round(attMid - toolMid);

  return {
    workflowId,
    diyTotal: {
      min: diyMin,
      max: diyMax,
      breakdown: toBreakdown(entry.fees, "min"),
    },
    withToolTotal: {
      min: withToolMin,
      max: withToolMax,
      breakdown: toBreakdown(entry.fees, "min"),
    },
    withAttorneyTotal: {
      min: attMin,
      max: attMax,
      breakdown: [
        ...toBreakdown(entry.fees, "min"),
        { item: "Attorney fee", amount: entry.attorney.min, type: "attorney" },
      ],
    },
    savings: {
      vsAttorney,
      description: entry.attorney.description,
    },
  };
}

/**
 * List all workflow IDs that have cost data available.
 */
export function listAvailableCosts(): string[] {
  return Object.keys(COST_DATABASE).sort();
}
