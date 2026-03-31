export interface LifeEventCard {
  id: string;
  label: string;
  description: string;
  icon: string;
  urgent: boolean;
}

/**
 * Life event definitions for the onboarding grid.
 * Mirrors the engine's LIFE_EVENTS but kept as a simple UI-only list
 * until we wire up direct engine imports via @engine/advisory/life-events/events.
 */
export const LIFE_EVENT_CARDS: LifeEventCard[] = [
  {
    id: "job-loss",
    label: "Lost my job",
    description: "File unemployment, keep health insurance, check benefit eligibility.",
    icon: "Briefcase",
    urgent: true,
  },
  {
    id: "new-baby",
    label: "Having a baby",
    description: "Add dependent, enroll in WIC, update insurance during special enrollment.",
    icon: "Baby",
    urgent: false,
  },
  {
    id: "marriage",
    label: "Getting married",
    description: "Update filing status, name change, health plan changes.",
    icon: "Heart",
    urgent: false,
  },
  {
    id: "divorce",
    label: "Getting divorced",
    description: "Separate insurance, update custody, change filing status.",
    icon: "Unlink",
    urgent: false,
  },
  {
    id: "death-of-spouse",
    label: "Spouse passed away",
    description: "Survivor benefits, estate probate, insurance changes across 5 phases.",
    icon: "HeartCrack",
    urgent: true,
  },
  {
    id: "moving-states",
    label: "Moving to another state",
    description: "Voter registration, new license, transfer benefits, multi-state taxes.",
    icon: "Truck",
    urgent: false,
  },
  {
    id: "retirement",
    label: "Retiring",
    description: "Social Security claiming, Medicare enrollment, estate planning.",
    icon: "Sunset",
    urgent: false,
  },
  {
    id: "buying-home",
    label: "Buying a home",
    description: "Mortgage interest deduction, permits, update estate plan.",
    icon: "Home",
    urgent: false,
  },
  {
    id: "starting-business",
    label: "Starting a business",
    description: "Business licenses, permits, Schedule C, self-employment tax.",
    icon: "Store",
    urgent: false,
  },
  {
    id: "becoming-disabled",
    label: "Becoming disabled",
    description: "SSDI, SSI, Medicaid, VA disability, student loan discharge.",
    icon: "Accessibility",
    urgent: true,
  },
  {
    id: "aging-into-medicare",
    label: "Turning 65",
    description: "Medicare enrollment window — late enrollment incurs permanent penalties.",
    icon: "Clock",
    urgent: true,
  },
  {
    id: "immigration-status-change",
    label: "Immigration status change",
    description: "Naturalization, work authorization, benefit eligibility changes.",
    icon: "Globe",
    urgent: false,
  },
  {
    id: "lost-health-insurance",
    label: "Lost health insurance",
    description: "60-day special enrollment, Medicaid, VA healthcare options.",
    icon: "ShieldOff",
    urgent: true,
  },
  {
    id: "had-income-change",
    label: "Income changed significantly",
    description: "Report to SNAP/Medicaid, update marketplace credits, adjust withholding.",
    icon: "TrendingUp",
    urgent: false,
  },
  {
    id: "arrested-or-convicted",
    label: "Arrested or convicted",
    description: "Expungement eligibility, benefit impacts, voter registration rules.",
    icon: "Scale",
    urgent: false,
  },
  {
    id: "natural-disaster",
    label: "Hit by a natural disaster",
    description: "D-SNAP (7-day window!), IRS extensions, emergency Medicaid.",
    icon: "CloudLightning",
    urgent: true,
  },
  {
    id: "turning-18",
    label: "Turning 18",
    description: "Register to vote, FAFSA, REAL ID, healthcare directive.",
    icon: "GraduationCap",
    urgent: false,
  },
  {
    id: "turning-26",
    label: "Turning 26",
    description: "Aging off parent's insurance — 60-day window to get your own.",
    icon: "CalendarClock",
    urgent: true,
  },
  {
    id: "child-turning-18",
    label: "Child turning 18",
    description: "SSI changes, child support review, FAFSA, healthcare directive.",
    icon: "Users",
    urgent: false,
  },
  {
    id: "received-inheritance",
    label: "Received an inheritance",
    description: "Report within 10 days for Medicaid/SSI. Tax basis, estate updates.",
    icon: "Landmark",
    urgent: true,
  },
];
