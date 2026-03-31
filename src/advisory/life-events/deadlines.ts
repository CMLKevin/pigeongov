/**
 * Temporal deadline engine for life-event cascades.
 *
 * Static deadline strings are fine for an overview, but useless when someone
 * is actually staring at a pile of paperwork wondering what explodes first.
 * This module computes concrete dates from a given event date and attaches
 * real consequences — the kind that involve penalties, not just sternly-worded
 * pamphlets.
 */

export interface TemporalDeadline {
  workflowId: string;
  label: string;
  daysFromEvent: number;
  absoluteDate?: string | undefined;
  consequence: string;
  isHardDeadline: boolean;
}

export interface ComputedDeadline extends TemporalDeadline {
  computedDate: string; // ISO date string
  daysRemaining: number; // relative to today
  status: "overdue" | "urgent" | "upcoming" | "distant";
}

// ── deadline definitions per event ──────────────────────────────────────────

type DeadlineTemplate = Omit<TemporalDeadline, "workflowId"> & {
  workflowId: string;
};

const EVENT_DEADLINES: Record<string, DeadlineTemplate[]> = {
  "job-loss": [
    {
      workflowId: "unemployment/claim-intake",
      label: "File unemployment claim",
      daysFromEvent: 7,
      consequence: "Delayed benefits — most states backdate only to filing date, not separation date",
      isHardDeadline: true,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA Special Enrollment Period",
      daysFromEvent: 60,
      consequence: "Lose right to enroll outside open enrollment — gap in coverage until next November",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/snap",
      label: "SNAP application (no hard deadline but expedited processing within 7 days if income < threshold)",
      daysFromEvent: 30,
      consequence: "Miss expedited processing window — standard 30-day processing instead of 7-day",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid application",
      daysFromEvent: 45,
      consequence: "Coverage gap — Medicaid can backdate up to 3 months but delays cause uncovered periods",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/liheap",
      label: "LIHEAP energy assistance",
      daysFromEvent: 90,
      consequence: "Seasonal program — funds run out; apply early in heating/cooling season",
      isHardDeadline: false,
    },
    {
      workflowId: "tax/1040",
      label: "Plan for tax impact of unemployment income",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Unemployment income is taxable — failure to plan leads to surprise tax bill or underpayment penalty",
      isHardDeadline: false,
    },
  ],

  "death-of-spouse": [
    {
      workflowId: "retirement/ssa-estimator",
      label: "Notify SSA and apply for survivor benefits + $255 lump-sum death payment",
      daysFromEvent: 30,
      consequence: "Lump-sum payment must be applied for within 2 years, but monthly benefits lost for each month of delay",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA Special Enrollment Period",
      daysFromEvent: 60,
      consequence: "Lose special enrollment right — stuck without coverage until open enrollment",
      isHardDeadline: true,
    },
    {
      workflowId: "tax/1040",
      label: "File joint return for year of death (MFJ still allowed)",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Late filing penalties; lose favorable joint filing rates if not filed",
      isHardDeadline: true,
    },
    {
      workflowId: "estate/basic-will",
      label: "Initiate probate or trust administration",
      daysFromEvent: 90,
      consequence: "Delays in asset distribution; potential creditor claim complications",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/power-of-attorney",
      label: "Revoke deceased spouse's POA designations",
      daysFromEvent: 14,
      consequence: "POA terminates at death by law, but third parties may not know — confusion and unauthorized actions",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/ssdi-application",
      label: "Disabled survivor benefits application",
      daysFromEvent: 90,
      consequence: "Delayed benefits; potential loss of retroactive months",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/advance-directive",
      label: "Update own advance directive (remove spouse as agent)",
      daysFromEvent: 60,
      consequence: "Healthcare directive names deceased person as decision-maker — creates legal vacuum in emergency",
      isHardDeadline: false,
    },
    {
      workflowId: "veterans/disability-claim",
      label: "VA Dependency and Indemnity Compensation (DIC) claim",
      daysFromEvent: 365,
      consequence: "DIC benefits may be retroactive to date of death if filed within 1 year; after that, effective date is filing date",
      isHardDeadline: true,
    },
    {
      workflowId: "identity/name-change",
      label: "Update accounts and titles to surviving spouse name only",
      daysFromEvent: 180,
      consequence: "Joint accounts and property titles remain in both names — complicates future transactions",
      isHardDeadline: false,
    },
  ],

  marriage: [
    {
      workflowId: "identity/name-change",
      label: "SSA name change (if applicable)",
      daysFromEvent: 30,
      consequence: "No legal deadline, but all other name-dependent updates block on this — cascading delays",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA Special Enrollment Period",
      daysFromEvent: 60,
      consequence: "Lose right to combine or change health plans until open enrollment",
      isHardDeadline: true,
    },
    {
      workflowId: "tax/1040",
      label: "Plan filing status change (MFJ vs MFS comparison)",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Filing as single when married is not permitted — must choose MFJ or MFS",
      isHardDeadline: true,
    },
    {
      workflowId: "identity/voter-registration",
      label: "Update voter registration (if name or address changed)",
      daysFromEvent: 60,
      consequence: "May be unable to vote if registration doesn't match current ID",
      isHardDeadline: false,
    },
    {
      workflowId: "immigration/family-visa-intake",
      label: "Spouse immigration petition (I-130)",
      daysFromEvent: 180,
      consequence: "No hard deadline, but processing times are 12-24 months — every day of delay extends wait",
      isHardDeadline: false,
    },
    {
      workflowId: "identity/real-id",
      label: "Update driver's license with new name/address",
      daysFromEvent: 90,
      consequence: "Mismatched IDs cause problems at airports, banks, and with official documents",
      isHardDeadline: false,
    },
  ],

  "new-baby": [
    {
      workflowId: "identity/passport",
      label: "Apply for child's SSN (usually at hospital via SSA/vital records)",
      daysFromEvent: 30,
      consequence: "Cannot claim child as dependent on taxes or enroll in health insurance without SSN",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA Special Enrollment Period — add newborn",
      daysFromEvent: 60,
      consequence: "Miss SEP window and child has no health coverage until open enrollment",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/wic",
      label: "WIC enrollment for infant and postpartum parent",
      daysFromEvent: 30,
      consequence: "Delayed access to formula, food, and nutrition counseling",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Newborn Medicaid enrollment verification",
      daysFromEvent: 45,
      consequence: "Auto-enrollment may not happen — verify to avoid uncovered medical bills",
      isHardDeadline: false,
    },
    {
      workflowId: "tax/1040",
      label: "Add dependent for Child Tax Credit",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Miss $2,000+ Child Tax Credit and potential EITC increase",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/snap",
      label: "Update SNAP household size",
      daysFromEvent: 30,
      consequence: "SNAP benefits not adjusted for larger household — leaving money on the table",
      isHardDeadline: false,
    },
  ],

  divorce: [
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA Special Enrollment Period",
      daysFromEvent: 60,
      consequence: "If on ex-spouse's plan, coverage ends — no insurance until open enrollment",
      isHardDeadline: true,
    },
    {
      workflowId: "legal/child-support-modification",
      label: "Establish or modify child support order",
      daysFromEvent: 90,
      consequence: "Support obligations accrue from filing, not from agreement — delay costs money",
      isHardDeadline: false,
    },
    {
      workflowId: "tax/1040",
      label: "Filing status change — Head of Household or Single",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Filing status must reflect marital status as of December 31",
      isHardDeadline: true,
    },
    {
      workflowId: "identity/name-change",
      label: "Revert name if desired (SSA first)",
      daysFromEvent: 180,
      consequence: "No legal deadline, but mismatched names across documents cause cascading problems",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/basic-will",
      label: "Update will and beneficiary designations",
      daysFromEvent: 60,
      consequence: "Ex-spouse may still inherit assets or be named as executor if not updated",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/power-of-attorney",
      label: "Revoke POA if ex-spouse was agent",
      daysFromEvent: 14,
      consequence: "Ex-spouse retains legal authority over your finances or healthcare decisions",
      isHardDeadline: true,
    },
    {
      workflowId: "retirement/ssa-estimator",
      label: "QDRO for retirement account division",
      daysFromEvent: 180,
      consequence: "Must file QDRO before retirement account distributions; delay risks losing share",
      isHardDeadline: false,
    },
  ],

  retirement: [
    {
      workflowId: "retirement/ssa-estimator",
      label: "Determine optimal Social Security claiming age",
      daysFromEvent: 90,
      consequence: "Claiming too early permanently reduces monthly benefit by up to 30%",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/medicare-enrollment",
      label: "Medicare Initial Enrollment Period",
      daysFromEvent: 210,
      consequence: "Late enrollment penalty: 10% premium surcharge per 12-month period of delay — permanent",
      isHardDeadline: true,
    },
    {
      workflowId: "tax/1040",
      label: "Retirement income tax planning (pension, 401k, SS)",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Unexpected tax bill from retirement distributions; underpayment penalty",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/basic-will",
      label: "Review estate planning documents",
      daysFromEvent: 180,
      consequence: "Outdated estate plan may not reflect current wishes or tax law",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/advance-directive",
      label: "Ensure healthcare directives are current",
      daysFromEvent: 90,
      consequence: "Healthcare decisions default to state law if no directive exists",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/power-of-attorney",
      label: "Designate financial and healthcare agents",
      daysFromEvent: 90,
      consequence: "Without POA, family must petition court for guardianship if incapacity occurs",
      isHardDeadline: false,
    },
  ],

  "moving-states": [
    {
      workflowId: "identity/voter-registration",
      label: "Register to vote in new state",
      daysFromEvent: 30,
      consequence: "Miss registration deadline for next election",
      isHardDeadline: true,
    },
    {
      workflowId: "identity/real-id",
      label: "Update driver's license (30-90 days varies by state)",
      daysFromEvent: 60,
      consequence: "Driving with out-of-state license past deadline is a misdemeanor in some states",
      isHardDeadline: true,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA Special Enrollment Period",
      daysFromEvent: 60,
      consequence: "Health plan network may not cover new area — could be paying for unusable insurance",
      isHardDeadline: true,
    },
    {
      workflowId: "tax/1040",
      label: "Part-year tax returns (both states)",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Must file in both states; failure to file in origin state triggers collections",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/snap",
      label: "Transfer SNAP benefits to new state",
      daysFromEvent: 30,
      consequence: "Benefits don't automatically transfer — gap in food assistance",
      isHardDeadline: false,
    },
  ],

  "buying-home": [
    {
      workflowId: "tax/1040",
      label: "Mortgage interest deduction (may itemize)",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Miss itemized deduction for mortgage interest and property taxes",
      isHardDeadline: false,
    },
    {
      workflowId: "permits/local-permit-planner",
      label: "Renovation permits (if applicable)",
      daysFromEvent: 180,
      consequence: "Unpermitted work must be disclosed at sale; may need to be torn out",
      isHardDeadline: false,
    },
    {
      workflowId: "identity/voter-registration",
      label: "Update voter registration address",
      daysFromEvent: 30,
      consequence: "Assigned to wrong precinct — may not be able to vote in local elections",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/basic-will",
      label: "Update estate plan with new property",
      daysFromEvent: 90,
      consequence: "Property passes by intestate succession — may not go to intended recipient",
      isHardDeadline: false,
    },
  ],

  "starting-business": [
    {
      workflowId: "business/license-starter",
      label: "Business licenses and registration",
      daysFromEvent: 30,
      consequence: "Operating without required license — fines, cease-and-desist, personal liability",
      isHardDeadline: true,
    },
    {
      workflowId: "permits/local-permit-planner",
      label: "Zoning and operational permits",
      daysFromEvent: 60,
      consequence: "Operating in violation of zoning — can be shut down by local government",
      isHardDeadline: true,
    },
    {
      workflowId: "tax/1040",
      label: "Schedule C / quarterly estimated taxes",
      daysFromEvent: 90,
      consequence: "Underpayment penalty for not making quarterly estimated tax payments",
      isHardDeadline: true,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "Individual health coverage for self-employed",
      daysFromEvent: 60,
      consequence: "Self-employed have no employer coverage — gap in insurance",
      isHardDeadline: false,
    },
  ],

  "becoming-disabled": [
    {
      workflowId: "benefits/ssdi-application",
      label: "Apply for SSDI",
      daysFromEvent: 30,
      consequence: "SSDI has 5-month waiting period from onset — every month of filing delay extends wait",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid application (disability-based)",
      daysFromEvent: 45,
      consequence: "Coverage gap during SSDI waiting period; Medicaid can bridge",
      isHardDeadline: false,
    },
    {
      workflowId: "veterans/disability-claim",
      label: "VA disability claim (if veteran)",
      daysFromEvent: 365,
      consequence: "VA benefits effective from filing date — delay means lost retroactive compensation",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/snap",
      label: "SNAP application (reduced income)",
      daysFromEvent: 30,
      consequence: "Miss expedited processing window for emergency food assistance",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "Ensure adequate health coverage",
      daysFromEvent: 60,
      consequence: "Disability onset is a qualifying life event — 60-day SEP window",
      isHardDeadline: true,
    },
    {
      workflowId: "estate/advance-directive",
      label: "Document healthcare preferences while able",
      daysFromEvent: 30,
      consequence: "Progressive conditions may impair decision-making capacity — act while competent",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/power-of-attorney",
      label: "Designate agents while legally competent",
      daysFromEvent: 30,
      consequence: "POA requires legal competence to sign — delay may require court-appointed guardianship",
      isHardDeadline: false,
    },
  ],

  "aging-into-medicare": [
    {
      workflowId: "healthcare/medicare-enrollment",
      label: "Medicare Initial Enrollment Period (7-month window around 65th birthday)",
      daysFromEvent: 210,
      consequence: "Late enrollment penalty: permanent 10% monthly premium surcharge per year of delay",
      isHardDeadline: true,
    },
    {
      workflowId: "retirement/ssa-estimator",
      label: "Social Security claiming strategy review",
      daysFromEvent: 90,
      consequence: "Suboptimal claiming age permanently reduces (or fails to maximize) lifetime benefits",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/advance-directive",
      label: "Review healthcare directives",
      daysFromEvent: 180,
      consequence: "Medicare transition is natural moment to review — outdated directives cause confusion",
      isHardDeadline: false,
    },
  ],

  "immigration-status-change": [
    {
      workflowId: "immigration/naturalization",
      label: "Begin naturalization if eligible",
      daysFromEvent: 90,
      consequence: "Naturalization eligible after 3/5 years as LPR — delay extends timeline to citizenship",
      isHardDeadline: false,
    },
    {
      workflowId: "immigration/work-authorization",
      label: "Update or obtain work authorization",
      daysFromEvent: 30,
      consequence: "Working without valid authorization has severe immigration consequences",
      isHardDeadline: true,
    },
    {
      workflowId: "tax/1040",
      label: "Filing requirements change with status",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Resident aliens must file worldwide income; non-filing can affect immigration applications",
      isHardDeadline: true,
    },
    {
      workflowId: "identity/voter-registration",
      label: "Register to vote (if naturalized)",
      daysFromEvent: 60,
      consequence: "Miss voter registration deadline for next election",
      isHardDeadline: false,
    },
    {
      workflowId: "identity/passport",
      label: "Apply for U.S. passport (if naturalized)",
      daysFromEvent: 180,
      consequence: "No hard deadline, but processing takes 6-8 weeks; needed for international travel",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "Healthcare eligibility changes",
      daysFromEvent: 60,
      consequence: "Immigration status change is qualifying event — 60-day SEP window",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/snap",
      label: "Benefit eligibility reassessment",
      daysFromEvent: 60,
      consequence: "Eligibility rules differ by immigration status — may newly qualify or lose benefits",
      isHardDeadline: false,
    },
  ],

  // ── New life events ────────────────────────────────────────────────────

  "lost-health-insurance": [
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA Special Enrollment Period",
      daysFromEvent: 60,
      consequence: "Lose right to enroll — uninsured until next open enrollment (could be 10+ months)",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid application (income-based)",
      daysFromEvent: 45,
      consequence: "Medicaid has no enrollment period but processing takes weeks — apply immediately",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/wic",
      label: "WIC enrollment (if pregnant or children under 5)",
      daysFromEvent: 30,
      consequence: "Delayed nutrition assistance for vulnerable household members",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/medicare-enrollment",
      label: "Medicare Special Enrollment (if 65+)",
      daysFromEvent: 60,
      consequence: "8-month SEP from employer coverage loss; after that, permanent late penalty",
      isHardDeadline: true,
    },
  ],

  "had-income-change": [
    {
      workflowId: "benefits/snap",
      label: "SNAP recertification with new income",
      daysFromEvent: 30,
      consequence: "Failure to report income change within 10-30 days (varies by state) can trigger overpayment claims",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid income redetermination",
      daysFromEvent: 30,
      consequence: "May lose Medicaid if income increased above threshold; may gain if decreased",
      isHardDeadline: true,
    },
    {
      workflowId: "education/student-loan-repayment",
      label: "IDR plan recalculation",
      daysFromEvent: 90,
      consequence: "Payments based on old income — overpaying if income dropped, or certification issues if increased",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "Update APTC (Advance Premium Tax Credit) amount",
      daysFromEvent: 30,
      consequence: "Overpayment of APTC must be repaid at tax time; underpayment means paying too much in premiums",
      isHardDeadline: true,
    },
    {
      workflowId: "tax/1040",
      label: "Adjust withholding or estimated payments",
      daysFromEvent: 90,
      consequence: "Underpayment penalty if withholding doesn't match actual tax liability",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/liheap",
      label: "LIHEAP eligibility reassessment",
      daysFromEvent: 60,
      consequence: "Income decrease may newly qualify household for energy assistance",
      isHardDeadline: false,
    },
  ],

  "arrested-or-convicted": [
    {
      workflowId: "legal/expungement",
      label: "Expungement eligibility assessment",
      daysFromEvent: 365,
      consequence: "Expungement timelines vary by jurisdiction — some require waiting periods from conviction date",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/snap",
      label: "SNAP eligibility (conviction may affect)",
      daysFromEvent: 30,
      consequence: "Drug felony convictions may disqualify from SNAP in some states; rules vary significantly",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid continuation or reinstatement",
      daysFromEvent: 30,
      consequence: "Incarceration suspends Medicaid; must reactivate upon release within 90 days in most states",
      isHardDeadline: false,
    },
    {
      workflowId: "identity/voter-registration",
      label: "Voter registration status (felony disenfranchisement varies by state)",
      daysFromEvent: 90,
      consequence: "Voting while ineligible is a separate offense; check state-specific restoration rules",
      isHardDeadline: false,
    },
    {
      workflowId: "education/fafsa",
      label: "FAFSA eligibility impact assessment",
      daysFromEvent: 180,
      consequence: "Drug convictions may affect federal student aid eligibility",
      isHardDeadline: false,
    },
  ],

  "natural-disaster": [
    {
      workflowId: "benefits/snap",
      label: "D-SNAP (Disaster SNAP) application",
      daysFromEvent: 7,
      consequence: "D-SNAP application window is extremely short — typically 7 days after disaster declaration",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/liheap",
      label: "LIHEAP emergency assistance",
      daysFromEvent: 30,
      consequence: "Utility disconnection protection; emergency heating/cooling funds are limited",
      isHardDeadline: false,
    },
    {
      workflowId: "tax/1040",
      label: "Casualty loss deduction and extended filing deadline",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "IRS grants extensions in declared disaster areas; casualty loss deduction available on prior or current year return",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Emergency Medicaid and disaster-related health coverage",
      daysFromEvent: 30,
      consequence: "Disaster may create qualifying health conditions; emergency Medicaid available regardless of status",
      isHardDeadline: false,
    },
    {
      workflowId: "legal/small-claims",
      label: "Insurance claim disputes",
      daysFromEvent: 365,
      consequence: "Statute of limitations on insurance claims typically 1-2 years from event",
      isHardDeadline: false,
    },
  ],

  "turning-18": [
    {
      workflowId: "identity/voter-registration",
      label: "Register to vote",
      daysFromEvent: 30,
      consequence: "Miss registration deadline for next election",
      isHardDeadline: false,
    },
    {
      workflowId: "education/fafsa",
      label: "FAFSA application for financial aid",
      daysFromEvent: 180,
      consequence: "FAFSA opens October 1 — early filing gets priority for limited state/institutional aid",
      isHardDeadline: false,
    },
    {
      workflowId: "identity/real-id",
      label: "Obtain REAL ID-compliant driver's license or state ID",
      daysFromEvent: 90,
      consequence: "Required for domestic air travel and entering federal buildings",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/aca-enrollment",
      label: "Health insurance transition planning",
      daysFromEvent: 60,
      consequence: "Aging out of foster care creates SEP; otherwise stay on parent's plan until 26",
      isHardDeadline: false,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid aged-out foster youth coverage",
      daysFromEvent: 30,
      consequence: "Former foster youth eligible for Medicaid until age 26 in most states — must enroll",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/advance-directive",
      label: "Healthcare directive (now legally able to create)",
      daysFromEvent: 365,
      consequence: "Without directive, parents no longer have automatic healthcare decision-making authority",
      isHardDeadline: false,
    },
  ],

  "turning-26": [
    {
      workflowId: "healthcare/aca-enrollment",
      label: "ACA enrollment — aging off parent's plan",
      daysFromEvent: 60,
      consequence: "Lose parent's health insurance at 26; 60-day SEP is the only window before open enrollment",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid eligibility assessment",
      daysFromEvent: 30,
      consequence: "If income qualifies, Medicaid can provide coverage with no gap",
      isHardDeadline: false,
    },
    {
      workflowId: "healthcare/medicare-enrollment",
      label: "Medicare enrollment (if disabled and aging out)",
      daysFromEvent: 60,
      consequence: "Disabled individuals on parent's plan may need Medicare transition",
      isHardDeadline: false,
    },
  ],

  "child-turning-18": [
    {
      workflowId: "benefits/ssdi-application",
      label: "SSI/SSDI child benefits transition",
      daysFromEvent: 30,
      consequence: "Child's SSI/SSDI benefits end or change at 18 — must file for adult benefits separately",
      isHardDeadline: true,
    },
    {
      workflowId: "legal/child-support-modification",
      label: "Child support modification (may end or change)",
      daysFromEvent: 30,
      consequence: "Support obligations vary by state — some continue through college, others end at 18",
      isHardDeadline: false,
    },
    {
      workflowId: "tax/1040",
      label: "Dependent status change assessment",
      daysFromEvent: 365,
      absoluteDate: "2026-04-15",
      consequence: "Child may no longer qualify as dependent — lose CTC and dependent exemption",
      isHardDeadline: false,
    },
    {
      workflowId: "education/fafsa",
      label: "FAFSA filing for college financial aid",
      daysFromEvent: 180,
      consequence: "Late FAFSA filing means less financial aid — some funds are first-come-first-served",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/advance-directive",
      label: "Child's own healthcare directive (now adult)",
      daysFromEvent: 90,
      consequence: "Parent no longer has automatic medical decision authority — child needs own directive",
      isHardDeadline: false,
    },
  ],

  "received-inheritance": [
    {
      workflowId: "tax/1040",
      label: "Inheritance tax implications (estate tax, income from inherited assets)",
      daysFromEvent: 270,
      consequence: "Estate tax return due 9 months from death; inherited IRA has 10-year distribution rule",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/medicaid",
      label: "Medicaid asset reporting (inheritance may exceed limits)",
      daysFromEvent: 10,
      consequence: "Failure to report within 10 days can result in Medicaid fraud charges; must spend down or lose eligibility",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/ssdi-application",
      label: "SSI asset limit assessment (inheritance may disqualify)",
      daysFromEvent: 10,
      consequence: "SSI has $2,000 individual asset limit — inheritance can immediately disqualify; must report within 10 days",
      isHardDeadline: true,
    },
    {
      workflowId: "benefits/snap",
      label: "SNAP asset reporting (if applicable in state)",
      daysFromEvent: 30,
      consequence: "Some states count assets for SNAP eligibility; inheritance may disqualify household",
      isHardDeadline: false,
    },
    {
      workflowId: "estate/basic-will",
      label: "Update own estate plan to account for new assets",
      daysFromEvent: 180,
      consequence: "Inherited assets may not be covered by existing will — intestate distribution for new assets",
      isHardDeadline: false,
    },
  ],
};

// ── computation engine ──────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  const dateA = new Date(a + "T12:00:00Z");
  const dateB = new Date(b + "T12:00:00Z");
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function statusFromDaysRemaining(daysRemaining: number, isHard: boolean): ComputedDeadline["status"] {
  if (daysRemaining < 0) return "overdue";
  if (isHard && daysRemaining <= 14) return "urgent";
  if (!isHard && daysRemaining <= 7) return "urgent";
  if (daysRemaining <= 60) return "upcoming";
  return "distant";
}

/**
 * Compute concrete deadlines for a life event occurring on a specific date.
 */
export function computeDeadlines(eventId: string, eventDate: string): ComputedDeadline[] {
  const templates = EVENT_DEADLINES[eventId];
  if (!templates) return [];

  const today = todayISO();

  return templates
    .map((template): ComputedDeadline => {
      const computedDate = template.absoluteDate ?? addDays(eventDate, template.daysFromEvent);
      const daysRemaining = daysBetween(today, computedDate);
      return {
        ...template,
        computedDate,
        daysRemaining,
        status: statusFromDaysRemaining(daysRemaining, template.isHardDeadline),
      };
    })
    .sort((a, b) => {
      // Overdue first, then by computed date
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (b.status === "overdue" && a.status !== "overdue") return 1;
      return a.daysRemaining - b.daysRemaining;
    });
}

/**
 * Get raw deadline templates (no date computation).
 */
export function getDeadlineTemplates(eventId: string): TemporalDeadline[] {
  return EVENT_DEADLINES[eventId] ?? [];
}

/**
 * List all events that have deadline definitions.
 */
export function listEventsWithDeadlines(): string[] {
  return Object.keys(EVENT_DEADLINES);
}

/**
 * Format a computed deadline for display.
 */
export function formatDeadline(deadline: ComputedDeadline): string {
  const statusIndicator =
    deadline.status === "overdue" ? "OVERDUE" :
    deadline.status === "urgent" ? "URGENT" :
    deadline.status === "upcoming" ? "UPCOMING" :
    "OK";

  const hardSoft = deadline.isHardDeadline ? "HARD" : "SOFT";
  const daysStr = deadline.daysRemaining < 0
    ? `${Math.abs(deadline.daysRemaining)} days ago`
    : `${deadline.daysRemaining} days`;

  return `[${statusIndicator}] [${hardSoft}] ${deadline.label} — ${deadline.computedDate} (${daysStr})\n  ${deadline.consequence}`;
}
