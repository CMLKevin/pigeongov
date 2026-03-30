import type { EligibilityResult } from "../../types.js";
import type { ScreenerInput } from "./intake.js";

// Federal Poverty Level 2025 guidelines (48 contiguous states)
const FPL_2025_BASE = 15_650;
const FPL_2025_PER_PERSON = 5_580;

function fplForHousehold(size: number): number {
  return FPL_2025_BASE + FPL_2025_PER_PERSON * Math.max(0, size - 1);
}

function fplPercentage(income: number, householdSize: number): number {
  const fpl = fplForHousehold(householdSize);
  return fpl > 0 ? (income / fpl) * 100 : Infinity;
}

// Medicaid expansion states (as of 2025 — all but ~10 states)
const NON_EXPANSION_STATES = new Set([
  "WI", "WY", "SD", "TX", "MS", "AL", "GA", "FL", "SC", "TN", "KS",
]);

interface EligibilityChecker {
  workflowId: string;
  check: (input: ScreenerInput) => EligibilityResult;
}

const ELIGIBILITY_CHECKS: EligibilityChecker[] = [
  {
    workflowId: "benefits/snap",
    check: (input) => {
      const pct = fplPercentage(input.annualHouseholdIncome, input.householdSize);
      if (pct <= 130) {
        return {
          workflowId: "benefits/snap",
          eligible: "likely",
          confidence: 0.85,
          reason: `Household income is ${Math.round(pct)}% of FPL (below 130% gross income limit)`,
          nextSteps: ["Gather income verification", "Apply at local SNAP office or online"],
        };
      }
      if (pct <= 200) {
        return {
          workflowId: "benefits/snap",
          eligible: "possible",
          confidence: 0.4,
          reason: `Income at ${Math.round(pct)}% FPL — may qualify in some states with broader eligibility`,
          nextSteps: ["Check your state's specific SNAP income limits"],
        };
      }
      return {
        workflowId: "benefits/snap",
        eligible: "unlikely",
        confidence: 0.8,
        reason: `Income at ${Math.round(pct)}% FPL — above typical SNAP limits`,
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "benefits/medicaid",
    check: (input) => {
      const pct = fplPercentage(input.annualHouseholdIncome, input.householdSize);
      const isExpansionState = !NON_EXPANSION_STATES.has(input.state.toUpperCase());
      const hasChildren = input.ages.some((age) => age < 19);
      const isPregnant = false; // Can't determine from screener

      if (isExpansionState && pct <= 138) {
        return {
          workflowId: "benefits/medicaid",
          eligible: "likely",
          confidence: 0.85,
          reason: `Income at ${Math.round(pct)}% FPL in a Medicaid expansion state (limit: 138%)`,
          nextSteps: ["Apply through your state's Medicaid office or healthcare.gov"],
        };
      }
      if (!isExpansionState && hasChildren && pct <= 200) {
        return {
          workflowId: "benefits/medicaid",
          eligible: "possible",
          confidence: 0.5,
          reason: `Children may qualify for Medicaid/CHIP even in non-expansion states`,
          nextSteps: ["Check your state's CHIP income limits for children"],
        };
      }
      if (pct <= 138) {
        return {
          workflowId: "benefits/medicaid",
          eligible: "unlikely",
          confidence: 0.6,
          reason: `${input.state} has not expanded Medicaid — limited eligibility for non-disabled adults`,
          nextSteps: ["Check if you qualify under traditional Medicaid categories"],
        };
      }
      return {
        workflowId: "benefits/medicaid",
        eligible: "ineligible",
        confidence: 0.8,
        reason: `Income at ${Math.round(pct)}% FPL — above Medicaid income limits`,
        nextSteps: ["Consider ACA marketplace enrollment for subsidized coverage"],
      };
    },
  },
  {
    workflowId: "healthcare/aca-enrollment",
    check: (input) => {
      const pct = fplPercentage(input.annualHouseholdIncome, input.householdSize);
      if (!input.hasHealthInsurance && pct >= 100 && pct <= 400) {
        return {
          workflowId: "healthcare/aca-enrollment",
          eligible: "likely",
          confidence: 0.9,
          reason: `Uninsured with income at ${Math.round(pct)}% FPL — qualifies for premium subsidies`,
          nextSteps: ["Enroll at healthcare.gov during open enrollment or after a qualifying life event"],
        };
      }
      if (!input.hasHealthInsurance) {
        return {
          workflowId: "healthcare/aca-enrollment",
          eligible: "likely",
          confidence: 0.7,
          reason: "Uninsured — ACA marketplace is available regardless of income",
          nextSteps: ["Enroll at healthcare.gov — subsidy eligibility depends on income"],
        };
      }
      return {
        workflowId: "healthcare/aca-enrollment",
        eligible: "possible",
        confidence: 0.3,
        reason: "Currently insured — marketplace enrollment available if current coverage is unaffordable",
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "benefits/wic",
    check: (input) => {
      const hasInfantOrChild = input.ages.some((age) => age < 5);
      const pct = fplPercentage(input.annualHouseholdIncome, input.householdSize);

      if (!hasInfantOrChild) {
        return {
          workflowId: "benefits/wic",
          eligible: "ineligible",
          confidence: 0.95,
          reason: "No household members under age 5 (or pregnant/postpartum)",
          nextSteps: [],
        };
      }
      if (pct <= 185) {
        return {
          workflowId: "benefits/wic",
          eligible: "likely",
          confidence: 0.85,
          reason: `Income at ${Math.round(pct)}% FPL with child under 5 (limit: 185%)`,
          nextSteps: ["Contact local WIC office for nutritional assessment"],
        };
      }
      return {
        workflowId: "benefits/wic",
        eligible: "unlikely",
        confidence: 0.7,
        reason: `Income at ${Math.round(pct)}% FPL — above WIC income limit of 185%`,
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "benefits/liheap",
    check: (input) => {
      const pct = fplPercentage(input.annualHouseholdIncome, input.householdSize);
      if (pct <= 150) {
        return {
          workflowId: "benefits/liheap",
          eligible: "likely",
          confidence: 0.75,
          reason: `Income at ${Math.round(pct)}% FPL (limit: 150% or 60% state median income)`,
          nextSteps: ["Apply during your state's LIHEAP application period"],
        };
      }
      return {
        workflowId: "benefits/liheap",
        eligible: "unlikely",
        confidence: 0.6,
        reason: `Income at ${Math.round(pct)}% FPL — likely above LIHEAP limits`,
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "benefits/section8",
    check: (input) => {
      // Section 8 uses 50% of Area Median Income (AMI), which varies by county.
      // We use a rough national estimate here.
      const pct = fplPercentage(input.annualHouseholdIncome, input.householdSize);
      if (pct <= 200 && input.monthlyRent > input.annualHouseholdIncome / 12 * 0.3) {
        return {
          workflowId: "benefits/section8",
          eligible: "possible",
          confidence: 0.4,
          reason: `Housing costs exceed 30% of income — may qualify, but most areas have multi-year waitlists`,
          nextSteps: ["Contact your local housing authority to check waitlist status"],
        };
      }
      return {
        workflowId: "benefits/section8",
        eligible: "unlikely",
        confidence: 0.5,
        reason: "Income or housing cost ratio may not meet Section 8 requirements",
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "unemployment/claim-intake",
    check: (input) => {
      if (input.employmentStatus === "unemployed") {
        return {
          workflowId: "unemployment/claim-intake",
          eligible: "likely",
          confidence: 0.7,
          reason: "Currently unemployed — eligible if recently separated from employment through no fault of your own",
          nextSteps: ["File a claim with your state unemployment office immediately"],
        };
      }
      return {
        workflowId: "unemployment/claim-intake",
        eligible: "ineligible",
        confidence: 0.9,
        reason: "Must be unemployed to file an unemployment claim",
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "benefits/ssdi-application",
    check: (input) => {
      if (input.hasDisability && (input.employmentStatus === "disabled" || input.employmentStatus === "unemployed")) {
        return {
          workflowId: "benefits/ssdi-application",
          eligible: "possible",
          confidence: 0.5,
          reason: "Has a disability and is not currently working — may qualify if disability prevents substantial gainful activity",
          nextSteps: ["Gather medical records", "Check if monthly earnings are below SGA ($1,620/month)"],
        };
      }
      return {
        workflowId: "benefits/ssdi-application",
        eligible: "unlikely",
        confidence: 0.7,
        reason: "SSDI requires a disability that prevents substantial gainful activity",
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "veterans/disability-claim",
    check: (input) => {
      if (input.isVeteran && input.hasDisability) {
        return {
          workflowId: "veterans/disability-claim",
          eligible: "likely",
          confidence: 0.7,
          reason: "Veteran with disability — may qualify for VA disability compensation",
          nextSteps: ["Gather DD-214 and medical records", "Establish service connection for conditions"],
        };
      }
      if (input.isVeteran) {
        return {
          workflowId: "veterans/disability-claim",
          eligible: "possible",
          confidence: 0.3,
          reason: "Veteran — some conditions may not yet be recognized as service-connected",
          nextSteps: ["Review conditions that may be related to military service"],
        };
      }
      return {
        workflowId: "veterans/disability-claim",
        eligible: "ineligible",
        confidence: 0.95,
        reason: "VA disability benefits require veteran status",
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "veterans/va-healthcare",
    check: (input) => {
      if (input.isVeteran) {
        return {
          workflowId: "veterans/va-healthcare",
          eligible: "likely",
          confidence: 0.8,
          reason: "Veteran — most veterans are eligible for some level of VA healthcare",
          nextSteps: ["Apply at VA.gov or your local VA medical center"],
        };
      }
      return {
        workflowId: "veterans/va-healthcare",
        eligible: "ineligible",
        confidence: 0.95,
        reason: "VA healthcare requires veteran status",
        nextSteps: [],
      };
    },
  },
  {
    workflowId: "education/fafsa",
    check: (input) => {
      const hasStudentAge = input.ages.some((age) => age >= 16 && age <= 50);
      if (hasStudentAge) {
        return {
          workflowId: "education/fafsa",
          eligible: "likely",
          confidence: 0.7,
          reason: "Household includes someone of college age — FAFSA determines financial aid eligibility",
          nextSteps: ["Complete FAFSA at studentaid.gov", "Deadline: varies by school, often March 1"],
        };
      }
      return {
        workflowId: "education/fafsa",
        eligible: "unlikely",
        confidence: 0.6,
        reason: "No household members in typical college age range",
        nextSteps: [],
      };
    },
  },
];

export function screenEligibility(input: ScreenerInput): EligibilityResult[] {
  return ELIGIBILITY_CHECKS.map((checker) => checker.check(input))
    .filter((result) => result.eligible !== "ineligible")
    .sort((a, b) => {
      const tierOrder = { likely: 0, possible: 1, unlikely: 2, ineligible: 3 };
      const aTier = tierOrder[a.eligible];
      const bTier = tierOrder[b.eligible];
      if (aTier !== bTier) return aTier - bTier;
      return b.confidence - a.confidence;
    });
}

export function formatScreenerResults(results: EligibilityResult[]): string {
  const lines: string[] = [];
  lines.push("Eligibility Screening Results");
  lines.push("═".repeat(40));

  const likely = results.filter((r) => r.eligible === "likely");
  const possible = results.filter((r) => r.eligible === "possible");
  const unlikely = results.filter((r) => r.eligible === "unlikely");

  if (likely.length > 0) {
    lines.push("");
    lines.push("LIKELY ELIGIBLE:");
    for (const r of likely) {
      lines.push(`  ● ${r.workflowId}`);
      lines.push(`    ${r.reason}`);
      if (r.nextSteps.length > 0) {
        lines.push(`    Next: ${r.nextSteps[0]}`);
      }
    }
  }

  if (possible.length > 0) {
    lines.push("");
    lines.push("MAY BE ELIGIBLE:");
    for (const r of possible) {
      lines.push(`  ○ ${r.workflowId}`);
      lines.push(`    ${r.reason}`);
    }
  }

  if (unlikely.length > 0) {
    lines.push("");
    lines.push("WORTH CHECKING:");
    for (const r of unlikely) {
      lines.push(`  · ${r.workflowId}`);
      lines.push(`    ${r.reason}`);
    }
  }

  if (results.length === 0) {
    lines.push("");
    lines.push("No likely program eligibility found based on your responses.");
    lines.push("This screener covers common federal programs — state and local programs may be available.");
  }

  return lines.join("\n");
}
