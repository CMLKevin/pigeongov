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
      { workflowId: "education/student-loan-repayment", priority: 3, notes: "Filing status affects IDR payments — married filing separately may lower student loan payments but increases taxes. Recalculate IDR immediately." },
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
      { workflowId: "benefits/tanf", priority: 3, notes: "Custodial parent with children may qualify for TANF cash assistance" },
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
      { workflowId: "benefits/snap", priority: 2, notes: "May now qualify for food assistance", dependsOn: ["unemployment/claim-intake"] },
      { workflowId: "benefits/medicaid", priority: 2, notes: "Income drop may qualify you for Medicaid", dependsOn: ["unemployment/claim-intake"] },
      { workflowId: "benefits/liheap", priority: 3, notes: "May qualify for energy assistance", dependsOn: ["unemployment/claim-intake"] },
      { workflowId: "benefits/tanf", priority: 3, notes: "Families with children may qualify for TANF cash assistance" },
      { workflowId: "education/student-loan-repayment", priority: 2, notes: "Recertify IDR at lower income — may reduce payments to $0-$10/month. If on SAVE forbearance, transition to IBR or RAP immediately." },
      { workflowId: "tax/1040", priority: 5, notes: "Unemployment income is taxable — plan for tax impact" },
    ],
  },
  {
    id: "retirement",
    label: "Retirement",
    description: "You are retiring or have recently retired.",
    workflows: [
      { workflowId: "retirement/ssa-estimator", priority: 1, notes: "Calculate optimal Social Security claiming age" },
      { workflowId: "healthcare/medicare-enrollment", priority: 1, deadline: "Initial enrollment: 3 months before turning 65", notes: "Enroll in Medicare Parts A and B", dependsOn: ["retirement/ssa-estimator"] },
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

  // ── Death of Spouse — the deep cascade (30+ workflows across 5 phases) ──
  {
    id: "death-of-spouse",
    label: "Death of spouse",
    description: "Your spouse has passed away.",
    workflows: [
      // Phase 1 — Immediate (Days 1-7)
      { workflowId: "retirement/ssa-estimator", priority: 1, deadline: "Notify SSA as soon as possible", notes: "Contact SSA for survivor benefits + $255 lump-sum death payment. Obtain 10-15 certified death certificates from vital records office — you will need them for virtually every step that follows" },
      { workflowId: "veterans/va-healthcare", priority: 1, notes: "If veteran: apply for VA burial benefits, flag, and headstone marker. Contact VA within 2 years for burial allowance reimbursement" },
      { workflowId: "estate/power-of-attorney", priority: 1, deadline: "Immediate", notes: "Revoke deceased spouse's POA designations. POA terminates by law at death, but third parties may not know — notify banks, brokers, and healthcare providers" },

      // Phase 2 — First Month
      { workflowId: "estate/basic-will", priority: 2, deadline: "Begin within 30 days", notes: "Initiate probate or trust administration. File will with probate court. Notify creditors. Begin inventory of estate assets and liabilities", dependsOn: ["retirement/ssa-estimator"] },
      { workflowId: "healthcare/aca-enrollment", priority: 1, deadline: "60 days (special enrollment)", notes: "If on spouse's employer plan: COBRA election within 60 days, or ACA marketplace enrollment. Evaluate cost of each option — COBRA preserves current doctors but is expensive", dependsOn: ["retirement/ssa-estimator"] },
      { workflowId: "benefits/medicaid", priority: 2, notes: "Reassess Medicaid eligibility with new household size and income. Single-person household may newly qualify based on survivor income alone" },
      { workflowId: "benefits/ssi", priority: 3, notes: "Surviving spouse 65+ or disabled may qualify for SSI if low income/assets" },
      { workflowId: "healthcare/medicare-enrollment", priority: 2, notes: "If applicable: Medicare enrollment changes after spouse's death. May need to switch from employer group plan to individual Medicare", dependsOn: ["retirement/ssa-estimator"] },
      { workflowId: "identity/name-change", priority: 3, notes: "Update accounts and property titles to surviving spouse name only. Retitle joint bank accounts, investment accounts. Contact all three credit bureaus (Equifax, Experian, TransUnion) to flag deceased's credit file" },

      // Phase 3 — Months 1-3
      { workflowId: "estate/advance-directive", priority: 2, notes: "Update own advance directive — remove deceased spouse as healthcare agent. Designate new agent immediately to avoid legal vacuum in medical emergency" },
      { workflowId: "benefits/ssdi-application", priority: 3, notes: "If disabled: apply for disabled survivor benefits through SSA. Different from regular survivor benefits — requires disability onset within 7 years of spouse's death" },
      { workflowId: "veterans/disability-claim", priority: 2, deadline: "File within 1 year for retroactive benefits", notes: "VA Dependency and Indemnity Compensation (DIC) for surviving spouse if death was service-connected. Also file for Survivors Pension if applicable. Benefits retroactive to date of death if filed within 1 year" },
      { workflowId: "identity/voter-registration", priority: 5, notes: "Update voter registration if address changes as part of estate settlement" },
      { workflowId: "identity/real-id", priority: 4, notes: "Update driver's license if name or address changes" },

      // Phase 4 — Tax Season
      { workflowId: "tax/1040", priority: 2, deadline: "April 15 following year of death", notes: "File final joint return for year of death (MFJ allowed). Qualifying Surviving Spouse status available for 2 subsequent years if qualifying dependent. File estate tax return (Form 706) if estate exceeds $13.99M exemption. Adjust withholding on own income for new single/QSS status. File final return for deceased (Form 1040) and estate income tax return (Form 1041) if estate generates income", dependsOn: ["retirement/ssa-estimator", "estate/basic-will"] },

      // Phase 5 — Ongoing
      { workflowId: "benefits/snap", priority: 4, notes: "SNAP recertification with new household size. Single-person household has different income thresholds and benefit amounts" },
      { workflowId: "benefits/liheap", priority: 4, notes: "LIHEAP recertification with updated household composition and income" },
      { workflowId: "education/student-loan-repayment", priority: 4, notes: "If applicable: IDR plan recalculation based on new individual income. Federal student loans may qualify for discharge if borrower is deceased" },
      { workflowId: "benefits/wic", priority: 5, notes: "If applicable: WIC recertification as single-parent household" },
      { workflowId: "identity/passport", priority: 5, notes: "Update passport if name changed. New passport application for surviving spouse if never held one independently" },
      { workflowId: "legal/child-support-modification", priority: 3, notes: "If minor children: review and modify existing child support orders. Child support obligations of deceased may become estate obligation", dependsOn: ["estate/basic-will"] },
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
      { workflowId: "benefits/ssi", priority: 1, notes: "Apply for SSI — no work history required, provides cash + automatic Medicaid" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "May qualify for Medicaid based on disability" },
      { workflowId: "veterans/disability-claim", priority: 1, notes: "If veteran, file VA disability claim" },
      { workflowId: "benefits/snap", priority: 3, notes: "Income reduction may qualify you for SNAP" },
      { workflowId: "healthcare/aca-enrollment", priority: 2, notes: "Ensure adequate health coverage" },
      { workflowId: "education/student-loan-repayment", priority: 2, notes: "Apply for Total and Permanent Disability (TPD) discharge — may eliminate entire student loan balance. Requires physician certification or SSDI determination." },
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

  // ── New life events (v2) ────────────────────────────────────────────────

  {
    id: "lost-health-insurance",
    label: "Lost health insurance",
    description: "You lost health insurance coverage (employer plan ended, COBRA expired, aged off parent's plan, or coverage terminated).",
    workflows: [
      { workflowId: "healthcare/aca-enrollment", priority: 1, deadline: "60 days from loss of coverage (special enrollment)", notes: "ACA marketplace Special Enrollment Period — this is your primary path to new coverage. Need proof of prior coverage loss (termination letter)" },
      { workflowId: "benefits/medicaid", priority: 1, notes: "Apply for Medicaid immediately if income qualifies — no enrollment period restriction. Coverage can be retroactive up to 3 months" },
      { workflowId: "benefits/wic", priority: 2, notes: "If pregnant or have children under 5, WIC provides nutrition support regardless of insurance status" },
      { workflowId: "healthcare/medicare-enrollment", priority: 1, deadline: "8-month Special Enrollment if losing employer coverage at 65+", notes: "If 65+ and losing employer group coverage, 8-month Medicare SEP applies. Miss this window and face permanent late enrollment penalties" },
      { workflowId: "veterans/va-healthcare", priority: 2, notes: "If veteran, VA healthcare system may provide coverage with no enrollment period. Priority groups based on service-connected disability and income" },
    ],
  },

  {
    id: "had-income-change",
    label: "Significant income change",
    description: "Your household income has changed significantly (job raise, hours cut, new benefits, lost income source).",
    workflows: [
      { workflowId: "benefits/snap", priority: 1, deadline: "Report within 10-30 days (varies by state)", notes: "SNAP requires reporting income changes within 10-30 days depending on state. Failure to report can create overpayment claims or fraud allegations" },
      { workflowId: "benefits/medicaid", priority: 1, deadline: "Report within 10 days in most states", notes: "Medicaid income redetermination — income increase may disqualify; decrease may newly qualify. Report promptly to avoid eligibility gaps" },
      { workflowId: "healthcare/aca-enrollment", priority: 2, deadline: "Update marketplace application within 30 days", notes: "APTC (premium tax credit) is based on projected income. Update immediately — overpayment of APTC must be repaid at tax time; underpayment means you're overpaying premiums" },
      { workflowId: "education/student-loan-repayment", priority: 3, notes: "IDR (Income-Driven Repayment) plan recalculation. If income dropped, payments may decrease significantly. If income rose, plan ahead for higher payments at recertification" },
      { workflowId: "tax/1040", priority: 3, notes: "Adjust withholding (W-4) or quarterly estimated payments to match new income. Underpayment penalty applies if you owe more than $1,000 at filing" },
      { workflowId: "benefits/liheap", priority: 4, notes: "Income decrease may newly qualify household for LIHEAP energy assistance. Apply during open application period" },
    ],
  },

  {
    id: "arrested-or-convicted",
    label: "Arrested or convicted",
    description: "You have been arrested, charged, or convicted of a criminal offense.",
    workflows: [
      { workflowId: "legal/expungement", priority: 2, notes: "Assess expungement eligibility — varies dramatically by state and offense. Some jurisdictions allow expungement immediately after arrest without conviction; felony convictions may require 5-10 year waiting period" },
      { workflowId: "benefits/snap", priority: 3, notes: "Drug felony convictions may affect SNAP eligibility depending on state. Many states have opted out of the federal ban or modified it. Check state-specific rules" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "Incarceration suspends (does not terminate) Medicaid. Upon release, reactivate within 90 days in most states. Some states now do pre-release Medicaid enrollment" },
      { workflowId: "identity/voter-registration", priority: 3, notes: "Felony disenfranchisement laws vary wildly by state: some restore rights after prison, others after parole/probation, some require governor's pardon. Voting while ineligible is a separate offense" },
      { workflowId: "education/fafsa", priority: 4, notes: "Drug convictions while receiving federal student aid may affect eligibility. Incarcerated individuals have limited Pell Grant eligibility. Check current rules — they've changed recently" },
    ],
  },

  {
    id: "natural-disaster",
    label: "Natural disaster",
    description: "Your household has been affected by a federally declared natural disaster (hurricane, flood, wildfire, tornado, earthquake).",
    workflows: [
      { workflowId: "benefits/snap", priority: 1, deadline: "D-SNAP window is typically 7 days after declaration", notes: "Apply for D-SNAP (Disaster SNAP) immediately. Window is extremely short — typically 7 days. Provides one month of emergency food benefits regardless of normal eligibility" },
      { workflowId: "benefits/liheap", priority: 2, notes: "LIHEAP emergency assistance for utility disconnection protection and emergency heating/cooling. Disaster may trigger additional emergency funds" },
      { workflowId: "tax/1040", priority: 3, notes: "IRS grants filing and payment extensions in declared disaster areas. Casualty and theft loss deduction available on current or prior year return (your choice — pick whichever gives larger refund). SBA disaster loan interest may also be deductible" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "Emergency Medicaid available regardless of immigration status for emergency medical conditions. Disaster may also qualify for Presumptive Eligibility in some states" },
      { workflowId: "legal/small-claims", priority: 4, notes: "Insurance claim disputes and contractor fraud are common after disasters. Statute of limitations typically 1-2 years from event. Document everything with photos and receipts" },
    ],
  },

  {
    id: "turning-18",
    label: "Turning 18",
    description: "You (or your child) are turning 18 — the legal transition to adulthood triggers several government obligations and new eligibility.",
    workflows: [
      { workflowId: "identity/voter-registration", priority: 1, notes: "Register to vote — can register up to 30 days before election in most states. Some states allow pre-registration at 16-17" },
      { workflowId: "education/fafsa", priority: 1, notes: "FAFSA opens October 1 each year. File as early as possible — some state and institutional aid is first-come-first-served. Uses prior-prior year tax data" },
      { workflowId: "identity/real-id", priority: 2, notes: "Obtain REAL ID-compliant driver's license or state ID. Required for domestic air travel and entering federal buildings. Bring birth certificate, SSN proof, and two address documents" },
      { workflowId: "healthcare/aca-enrollment", priority: 3, notes: "If aging out of foster care, this is a qualifying event for ACA SEP. Otherwise, can stay on parent's plan until 26. Former foster youth get Medicaid until 26 in most states" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "Former foster youth: Medicaid coverage continues until age 26 under ACA in most states. Must actively enroll — it is not always automatic" },
      { workflowId: "estate/advance-directive", priority: 4, notes: "Parents lose automatic healthcare decision-making authority at 18. A healthcare directive lets you designate who makes medical decisions if you cannot. College students especially should have this" },
    ],
  },

  {
    id: "turning-26",
    label: "Turning 26",
    description: "You are turning 26 and aging off your parent's health insurance plan.",
    workflows: [
      { workflowId: "healthcare/aca-enrollment", priority: 1, deadline: "60-day Special Enrollment Period from 26th birthday", notes: "You lose your parent's health insurance the day you turn 26 (or end of birth month, depending on plan). 60-day ACA SEP is your window — miss it and you are uninsured until open enrollment" },
      { workflowId: "benefits/medicaid", priority: 2, notes: "If income qualifies, Medicaid provides immediate coverage with no gap. No enrollment period — apply anytime. Former foster youth may have extended coverage until 26" },
      { workflowId: "healthcare/medicare-enrollment", priority: 3, notes: "If disabled and receiving SSDI for 24+ months, may already be Medicare-eligible. Coordinate Medicare and marketplace coverage — do not double-enroll" },
    ],
  },

  {
    id: "child-turning-18",
    label: "Child turning 18",
    description: "Your child is turning 18, which triggers changes to benefits, custody, and tax status.",
    workflows: [
      { workflowId: "benefits/ssdi-application", priority: 1, deadline: "File within 30 days of 18th birthday", notes: "SSI/SSDI child benefits end or change at 18. If child is disabled, must file for adult SSI/SSDI separately — the childhood determination does not carry over. New disability determination uses adult criteria" },
      { workflowId: "legal/child-support-modification", priority: 2, notes: "Child support obligations may end at 18 in many states, but rules vary: some continue through college (to 21-23), others require court order to terminate. Review your state's rules and existing order" },
      { workflowId: "tax/1040", priority: 3, notes: "Child may no longer qualify as dependent after 18 (unless full-time student under 24 or permanently disabled). Lose Child Tax Credit ($2,000+). Review filing status — may no longer qualify for Head of Household" },
      { workflowId: "education/fafsa", priority: 2, notes: "FAFSA filing for college financial aid. Early filing gets priority for limited institutional aid. Dependency status for FAFSA is separate from tax dependency — different rules" },
      { workflowId: "estate/advance-directive", priority: 3, notes: "Your child is now a legal adult. You have NO automatic authority over their healthcare decisions. Have them create a healthcare directive and consider a HIPAA release so you can access their medical information" },
    ],
  },

  {
    id: "received-inheritance",
    label: "Received inheritance",
    description: "You have received or are receiving an inheritance from a deceased person's estate.",
    workflows: [
      { workflowId: "benefits/medicaid", priority: 1, deadline: "Report within 10 days", notes: "Medicaid has strict asset limits ($2,000 individual in many states). Inheritance can immediately disqualify you. Must report within 10 days or face fraud charges. Options: special needs trust, spend-down, ABLE account" },
      { workflowId: "benefits/ssdi-application", priority: 1, deadline: "Report within 10 days", notes: "SSI has $2,000 individual / $3,000 couple asset limit. Inheritance immediately counts as a resource. Must report within 10 days. Can place in special needs trust or ABLE account to preserve eligibility" },
      { workflowId: "tax/1040", priority: 2, notes: "Inherited assets generally get stepped-up cost basis (huge tax advantage). Inherited IRAs must be distributed within 10 years (SECURE Act). Estate tax return (Form 706) is estate's responsibility, not yours — but inherited income is taxable to you" },
      { workflowId: "benefits/snap", priority: 3, notes: "Some states count assets for SNAP eligibility. Inheritance may temporarily or permanently disqualify household. Check state-specific rules — many states have eliminated asset tests" },
      { workflowId: "estate/basic-will", priority: 3, notes: "Update your own estate plan to account for newly inherited assets. Inherited property may need to be specifically devised in will to avoid intestate distribution" },
    ],
  },
];

export function findLifeEvent(id: string): LifeEvent | undefined {
  return LIFE_EVENTS.find((event) => event.id === id);
}

export function listLifeEvents(): LifeEvent[] {
  return LIFE_EVENTS;
}
