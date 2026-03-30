import type { LifeEvent } from "../../types.js";

export const LIFE_EVENTS: LifeEvent[] = [
  {
    id: "new-baby",
    label: "New baby",
    description: "A new child has been born or adopted into your household.",
    workflows: [
      { workflowId: "tax/1040", priority: 3, notes: "Add dependent for Child Tax Credit and filing status change" },
      { workflowId: "healthcare/aca-enrollment", priority: 1, deadline: "60 days from birth (special enrollment)", notes: "Add newborn to health insurance plan" },
      { workflowId: "benefits/snap", priority: 4, notes: "Household size increased — may qualify or increase benefit" },
      { workflowId: "benefits/wic", priority: 2, notes: "Infant and postpartum parent may qualify for WIC" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "Newborn typically auto-enrolled if parent has Medicaid" },
    ],
  },
  {
    id: "marriage",
    label: "Marriage",
    description: "You recently got married.",
    workflows: [
      { workflowId: "tax/1040", priority: 2, notes: "Filing status changes to MFJ or MFS — compare both" },
      { workflowId: "identity/name-change", priority: 1, notes: "If changing name, start SSA update immediately" },
      { workflowId: "healthcare/aca-enrollment", priority: 3, deadline: "60 days from marriage (special enrollment)", notes: "May combine or change health insurance plans" },
      { workflowId: "identity/voter-registration", priority: 5, notes: "Update registration if name or address changed" },
      { workflowId: "immigration/family-visa-intake", priority: 1, notes: "If spouse needs immigration status, begin petition process", dependsOn: ["identity/name-change"] },
    ],
  },
  {
    id: "divorce",
    label: "Divorce",
    description: "You are going through or have completed a divorce.",
    workflows: [
      { workflowId: "tax/1040", priority: 2, notes: "Filing status changes — may qualify for Head of Household" },
      { workflowId: "identity/name-change", priority: 3, notes: "If reverting name, update SSA and all documents" },
      { workflowId: "healthcare/aca-enrollment", priority: 1, deadline: "60 days from divorce (special enrollment)", notes: "Obtain separate health insurance coverage" },
      { workflowId: "legal/child-support-modification", priority: 2, notes: "Establish or modify child support order" },
      { workflowId: "estate/basic-will", priority: 4, notes: "Update beneficiaries and estate documents" },
      { workflowId: "estate/power-of-attorney", priority: 4, notes: "Revoke existing POA if ex-spouse was agent" },
    ],
  },
  {
    id: "job-loss",
    label: "Job loss",
    description: "You have lost your job or been laid off.",
    workflows: [
      { workflowId: "unemployment/claim-intake", priority: 1, deadline: "File within 7 days of last day worked", notes: "File unemployment claim immediately" },
      { workflowId: "healthcare/aca-enrollment", priority: 1, deadline: "60 days from job loss (special enrollment)", notes: "Enroll in ACA marketplace or evaluate COBRA" },
      { workflowId: "benefits/snap", priority: 2, notes: "May now qualify for food assistance" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "Income drop may qualify you for Medicaid" },
      { workflowId: "benefits/liheap", priority: 3, notes: "May qualify for energy assistance" },
      { workflowId: "tax/1040", priority: 5, notes: "Unemployment income is taxable — plan for tax impact" },
    ],
  },
  {
    id: "retirement",
    label: "Retirement",
    description: "You are retiring or have recently retired.",
    workflows: [
      { workflowId: "retirement/ssa-estimator", priority: 1, notes: "Calculate optimal Social Security claiming age" },
      { workflowId: "healthcare/medicare-enrollment", priority: 1, deadline: "Initial enrollment: 3 months before turning 65", notes: "Enroll in Medicare Parts A and B" },
      { workflowId: "tax/1040", priority: 3, notes: "Retirement income taxation — pension, 401k distributions, Social Security" },
      { workflowId: "estate/basic-will", priority: 4, notes: "Review and update estate planning documents" },
      { workflowId: "estate/advance-directive", priority: 4, notes: "Ensure healthcare directives are current" },
      { workflowId: "estate/power-of-attorney", priority: 4, notes: "Designate financial and healthcare agents" },
    ],
  },
  {
    id: "moving-states",
    label: "Moving to a different state",
    description: "You are relocating to a new state.",
    workflows: [
      { workflowId: "identity/voter-registration", priority: 1, deadline: "30 days before next election in most states", notes: "Register to vote in new state" },
      { workflowId: "identity/real-id", priority: 2, notes: "Update driver's license within 30-90 days (varies by state)" },
      { workflowId: "tax/1040", priority: 3, notes: "May need to file part-year returns in both states" },
      { workflowId: "healthcare/aca-enrollment", priority: 2, deadline: "60 days from move (special enrollment)", notes: "Health plan networks may change — verify coverage" },
      { workflowId: "benefits/snap", priority: 4, notes: "Transfer benefits to new state" },
    ],
  },
  {
    id: "death-of-spouse",
    label: "Death of spouse",
    description: "Your spouse has passed away.",
    workflows: [
      { workflowId: "retirement/ssa-estimator", priority: 1, notes: "Apply for survivor benefits — may be higher than own benefit" },
      { workflowId: "tax/1040", priority: 2, notes: "Can file as Qualifying Surviving Spouse for 2 years" },
      { workflowId: "estate/basic-will", priority: 2, notes: "Begin probate process if applicable" },
      { workflowId: "healthcare/aca-enrollment", priority: 1, deadline: "60 days (special enrollment)", notes: "Adjust health coverage" },
      { workflowId: "benefits/ssdi-application", priority: 3, notes: "Disabled survivors may qualify for benefits" },
    ],
  },
  {
    id: "buying-home",
    label: "Buying a home",
    description: "You are purchasing a home.",
    workflows: [
      { workflowId: "tax/1040", priority: 2, notes: "Mortgage interest deduction — may want to itemize" },
      { workflowId: "permits/local-permit-planner", priority: 4, notes: "Check if renovations need permits" },
      { workflowId: "identity/voter-registration", priority: 5, notes: "Update address on voter registration" },
      { workflowId: "estate/basic-will", priority: 3, notes: "Update estate plan to include new property" },
    ],
  },
  {
    id: "starting-business",
    label: "Starting a business",
    description: "You are starting a new business or becoming self-employed.",
    workflows: [
      { workflowId: "business/license-starter", priority: 1, notes: "Research and obtain required business licenses" },
      { workflowId: "permits/local-permit-planner", priority: 2, notes: "Check zoning and operational permit requirements" },
      { workflowId: "tax/1040", priority: 2, notes: "Schedule C for self-employment, quarterly estimated taxes" },
      { workflowId: "healthcare/aca-enrollment", priority: 3, notes: "Self-employed need individual health coverage" },
    ],
  },
  {
    id: "becoming-disabled",
    label: "Becoming disabled",
    description: "You have developed a disability that affects your ability to work.",
    workflows: [
      { workflowId: "benefits/ssdi-application", priority: 1, notes: "Apply for Social Security Disability Insurance" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "May qualify for Medicaid based on disability" },
      { workflowId: "veterans/disability-claim", priority: 1, notes: "If veteran, file VA disability claim" },
      { workflowId: "benefits/snap", priority: 3, notes: "Income reduction may qualify you for SNAP" },
      { workflowId: "healthcare/aca-enrollment", priority: 2, notes: "Ensure adequate health coverage" },
      { workflowId: "estate/advance-directive", priority: 3, notes: "Document healthcare preferences" },
      { workflowId: "estate/power-of-attorney", priority: 3, notes: "Designate agents while able" },
    ],
  },
  {
    id: "aging-into-medicare",
    label: "Turning 65 (Medicare eligible)",
    description: "You are approaching or have reached age 65.",
    workflows: [
      { workflowId: "healthcare/medicare-enrollment", priority: 1, deadline: "Initial enrollment: 7-month window around 65th birthday", notes: "Enroll in Medicare — late enrollment incurs permanent penalties" },
      { workflowId: "retirement/ssa-estimator", priority: 2, notes: "Review Social Security claiming strategy" },
      { workflowId: "estate/advance-directive", priority: 3, notes: "Review healthcare directives" },
    ],
  },
  {
    id: "immigration-status-change",
    label: "Immigration status change",
    description: "Your immigration status has changed (e.g., green card received, naturalization, work authorization).",
    workflows: [
      { workflowId: "immigration/naturalization", priority: 1, notes: "If eligible, begin naturalization process" },
      { workflowId: "immigration/work-authorization", priority: 1, notes: "Update or obtain work authorization" },
      { workflowId: "tax/1040", priority: 3, notes: "Filing requirements may change with status" },
      { workflowId: "identity/voter-registration", priority: 2, notes: "If naturalized, register to vote" },
      { workflowId: "identity/passport", priority: 3, notes: "If naturalized, apply for U.S. passport" },
      { workflowId: "healthcare/aca-enrollment", priority: 2, notes: "Healthcare eligibility may change with status" },
      { workflowId: "benefits/snap", priority: 4, notes: "Benefit eligibility may change with status" },
    ],
  },
];

export function findLifeEvent(id: string): LifeEvent | undefined {
  return LIFE_EVENTS.find((event) => event.id === id);
}

export function listLifeEvents(): LifeEvent[] {
  return LIFE_EVENTS;
}
