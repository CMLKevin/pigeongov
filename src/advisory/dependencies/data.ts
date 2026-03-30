import type { WorkflowDependency } from "../../types.js";

/**
 * Cross-agency dependency graph for PigeonGov workflows.
 *
 * Each edge encodes a real-world regulatory or procedural relationship
 * between two government workflows. The graph powers downstream cascade
 * detection ("you just naturalized — here's everything else that changes")
 * and upstream requirement surfacing ("voter registration expects one of
 * these preconditions to be in place").
 */
export const WORKFLOW_DEPENDENCIES: WorkflowDependency[] = [
  // ─── Immigration → Identity ──────────────────────────────────────
  {
    sourceWorkflowId: "immigration/naturalization",
    targetWorkflowId: "identity/voter-registration",
    relationship: "triggers",
    description: "Naturalized citizens become eligible to register to vote",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "immigration/naturalization",
    targetWorkflowId: "identity/passport",
    relationship: "triggers",
    description: "Naturalization certificate is primary evidence for first U.S. passport",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "immigration/naturalization",
    targetWorkflowId: "identity/real-id",
    relationship: "triggers",
    description: "Naturalization certificate needed for REAL ID if no prior U.S. documents",
    bidirectional: false,
  },

  // ─── Immigration → Tax ───────────────────────────────────────────
  {
    sourceWorkflowId: "immigration/work-authorization",
    targetWorkflowId: "tax/1040",
    relationship: "triggers",
    description: "EAD holders with U.S. income must file federal tax returns",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "immigration/naturalization",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "LPR/citizen status requires reporting worldwide income on 1040",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "immigration/green-card-renewal",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Failure to file taxes can jeopardize green card renewal applications",
    bidirectional: false,
  },

  // ─── Tax → Benefits ──────────────────────────────────────────────
  {
    sourceWorkflowId: "tax/1040",
    targetWorkflowId: "benefits/snap",
    relationship: "affects",
    description: "AGI from tax return determines SNAP income eligibility",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "tax/1040",
    targetWorkflowId: "benefits/medicaid",
    relationship: "affects",
    description: "Modified AGI determines Medicaid eligibility under ACA expansion",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "tax/1040",
    targetWorkflowId: "healthcare/aca-enrollment",
    relationship: "affects",
    description: "AGI determines premium tax credit and cost-sharing reduction amounts",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "tax/1040",
    targetWorkflowId: "education/fafsa",
    relationship: "affects",
    description: "FAFSA uses tax return data (AGI, untaxed income) to calculate EFC/SAI",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "tax/1040",
    targetWorkflowId: "benefits/section8",
    relationship: "affects",
    description: "Section 8 income verification uses tax return data",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "tax/1040",
    targetWorkflowId: "benefits/wic",
    relationship: "affects",
    description: "WIC income eligibility verified against tax return data",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "tax/1040",
    targetWorkflowId: "benefits/liheap",
    relationship: "affects",
    description: "LIHEAP income eligibility determined by AGI from tax return",
    bidirectional: false,
  },

  // ─── Benefits → Tax (reverse) ────────────────────────────────────
  {
    sourceWorkflowId: "benefits/ssdi-application",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "SSDI benefits may be taxable if combined income exceeds thresholds",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "retirement/ssa-estimator",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Social Security retirement benefits may be partially taxable",
    bidirectional: false,
  },

  // ─── Employment changes cascade ──────────────────────────────────
  {
    sourceWorkflowId: "unemployment/claim-intake",
    targetWorkflowId: "healthcare/aca-enrollment",
    relationship: "triggers",
    description: "Job loss is a qualifying life event for special ACA enrollment",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "unemployment/claim-intake",
    targetWorkflowId: "benefits/snap",
    relationship: "triggers",
    description: "Job loss often creates SNAP eligibility due to income drop",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "unemployment/claim-intake",
    targetWorkflowId: "benefits/medicaid",
    relationship: "triggers",
    description: "Income loss from unemployment may qualify household for Medicaid",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "unemployment/claim-intake",
    targetWorkflowId: "benefits/liheap",
    relationship: "triggers",
    description: "Unemployment may create LIHEAP eligibility for energy assistance",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "unemployment/claim-intake",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Unemployment benefits are taxable income reported on 1040",
    bidirectional: false,
  },

  // ─── Identity changes cascade ────────────────────────────────────
  {
    sourceWorkflowId: "identity/name-change",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Name must match SSA records; name change requires SSA update before filing",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "identity/name-change",
    targetWorkflowId: "identity/passport",
    relationship: "triggers",
    description: "Legal name change requires passport amendment or new passport",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "identity/name-change",
    targetWorkflowId: "identity/voter-registration",
    relationship: "triggers",
    description: "Voter registration must be updated after legal name change",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "identity/name-change",
    targetWorkflowId: "identity/real-id",
    relationship: "triggers",
    description: "REAL ID must be reissued after legal name change",
    bidirectional: false,
  },

  // ─── Veterans → Benefits ─────────────────────────────────────────
  {
    sourceWorkflowId: "veterans/disability-claim",
    targetWorkflowId: "veterans/va-healthcare",
    relationship: "triggers",
    description: "VA disability rating establishes priority group for VA healthcare",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "veterans/disability-claim",
    targetWorkflowId: "benefits/ssdi-application",
    relationship: "affects",
    description: "Veterans can receive both VA disability and SSDI concurrently",
    bidirectional: true,
  },
  {
    sourceWorkflowId: "veterans/disability-claim",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "VA disability compensation is tax-exempt but affects total income picture",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "veterans/gi-bill",
    targetWorkflowId: "education/fafsa",
    relationship: "affects",
    description: "GI Bill benefits interact with FAFSA financial aid calculations",
    bidirectional: false,
  },

  // ─── Healthcare interdependencies ────────────────────────────────
  {
    sourceWorkflowId: "healthcare/aca-enrollment",
    targetWorkflowId: "benefits/medicaid",
    relationship: "affects",
    description: "ACA marketplace applications trigger automatic Medicaid screening",
    bidirectional: true,
  },
  {
    sourceWorkflowId: "healthcare/medicare-enrollment",
    targetWorkflowId: "healthcare/aca-enrollment",
    relationship: "invalidates",
    description: "Medicare enrollment ends eligibility for ACA marketplace subsidies",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "healthcare/medicare-enrollment",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Medicare Part B premiums may be deductible; IRMAA surcharges based on MAGI",
    bidirectional: false,
  },

  // ─── Education → Tax ─────────────────────────────────────────────
  {
    sourceWorkflowId: "education/student-loan-repayment",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Student loan interest (up to $2,500) is an above-the-line deduction on 1040",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "education/fafsa",
    targetWorkflowId: "tax/1040",
    relationship: "requires",
    description: "FAFSA requires prior-prior year tax return data for income verification",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "education/529-planner",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "529 qualified distributions are tax-free; non-qualified trigger penalties on 1040",
    bidirectional: false,
  },

  // ─── Legal → Immigration ─────────────────────────────────────────
  {
    sourceWorkflowId: "legal/expungement",
    targetWorkflowId: "immigration/naturalization",
    relationship: "affects",
    description: "Expungement may improve moral character determination for naturalization",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "legal/expungement",
    targetWorkflowId: "immigration/green-card-renewal",
    relationship: "affects",
    description: "Criminal history affects green card renewal; expungement may help",
    bidirectional: false,
  },

  // ─── Retirement cascade ──────────────────────────────────────────
  {
    sourceWorkflowId: "retirement/ssa-estimator",
    targetWorkflowId: "healthcare/medicare-enrollment",
    relationship: "triggers",
    description: "SSA retirement at 65+ triggers automatic Medicare Part A enrollment",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "retirement/ssa-estimator",
    targetWorkflowId: "benefits/snap",
    relationship: "affects",
    description: "Social Security income counts toward SNAP eligibility determination",
    bidirectional: false,
  },

  // ─── Estate → Tax ────────────────────────────────────────────────
  {
    sourceWorkflowId: "estate/basic-will",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Beneficiary designations and estate distributions have tax implications",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "estate/basic-will",
    targetWorkflowId: "retirement/ssa-estimator",
    relationship: "affects",
    description: "Survivor benefits depend on marital status and estate planning",
    bidirectional: false,
  },

  // ─── DACA-specific edges ─────────────────────────────────────────
  {
    sourceWorkflowId: "immigration/daca-renewal",
    targetWorkflowId: "immigration/work-authorization",
    relationship: "triggers",
    description: "DACA renewal includes EAD renewal for work authorization",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "immigration/daca-renewal",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "DACA recipients with EADs have federal tax filing obligations",
    bidirectional: false,
  },

  // ─── Family visa → downstream ────────────────────────────────────
  {
    sourceWorkflowId: "immigration/family-visa-intake",
    targetWorkflowId: "immigration/work-authorization",
    relationship: "triggers",
    description: "Approved family visa petition leads to work authorization eligibility",
    bidirectional: false,
  },
  {
    sourceWorkflowId: "immigration/family-visa-intake",
    targetWorkflowId: "benefits/medicaid",
    relationship: "affects",
    description: "Immigration status from family visa affects public benefits eligibility (5-year bar)",
    bidirectional: false,
  },

  // ─── Child support ↔ Tax ─────────────────────────────────────────
  {
    sourceWorkflowId: "legal/child-support-modification",
    targetWorkflowId: "tax/1040",
    relationship: "affects",
    description: "Child support payments affect dependency exemption and filing status on 1040",
    bidirectional: false,
  },

  // ─── Business → Tax ──────────────────────────────────────────────
  {
    sourceWorkflowId: "business/license-starter",
    targetWorkflowId: "tax/1040",
    relationship: "triggers",
    description: "Business formation creates Schedule C filing obligation on 1040",
    bidirectional: false,
  },
];
