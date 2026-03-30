import type { GlossaryEntry } from "../../types.js";

export const healthcareGlossaryEntries: GlossaryEntry[] = [
  {
    term: "Health Insurance Marketplace",
    abbreviation: "Marketplace",
    domain: "healthcare",
    definition:
      "The federal (HealthCare.gov) or state-run exchange where individuals and families can shop for, compare, and enroll in qualified health insurance plans, often with income-based subsidies.",
    source: "CMS",
    relatedTerms: ["premium", "subsidy", "open enrollment"],
  },
  {
    term: "Premium",
    domain: "healthcare",
    definition:
      "The monthly amount you pay for your health insurance plan, regardless of whether you use any medical services. Subsidies can reduce this cost on Marketplace plans.",
    relatedTerms: ["subsidy", "APTC"],
  },
  {
    term: "Subsidy",
    domain: "healthcare",
    definition:
      "Financial assistance from the federal government that lowers your monthly premium and/or out-of-pocket costs on Marketplace plans. Eligibility is based on household income relative to the federal poverty level.",
    relatedTerms: ["APTC", "cost-sharing reduction", "MAGI"],
  },
  {
    term: "Advance Premium Tax Credit",
    abbreviation: "APTC",
    domain: "healthcare",
    definition:
      "A tax credit paid directly to your insurer each month to lower your Marketplace premium. Based on estimated annual income; reconciled on your tax return via Form 8962.",
    source: "IRS",
    relatedTerms: ["premium", "subsidy", "MAGI"],
  },
  {
    term: "Qualifying Life Event",
    abbreviation: "QLE",
    domain: "healthcare",
    definition:
      "A significant change in circumstances — such as marriage, birth of a child, job loss, or moving — that qualifies you for a Special Enrollment Period outside of Open Enrollment.",
    source: "CMS",
    relatedTerms: ["special enrollment", "open enrollment"],
  },
  {
    term: "Open Enrollment",
    domain: "healthcare",
    definition:
      "The annual window (typically November 1 through January 15) during which anyone can enroll in or change Marketplace health insurance plans without needing a qualifying life event.",
    source: "CMS",
    relatedTerms: ["QLE", "special enrollment", "Marketplace"],
  },
  {
    term: "Special Enrollment Period",
    abbreviation: "SEP",
    domain: "healthcare",
    definition:
      "A period outside Open Enrollment during which you can enroll in a Marketplace plan because you experienced a qualifying life event. Typically lasts 60 days from the event.",
    source: "CMS",
    relatedTerms: ["QLE", "open enrollment"],
  },
  {
    term: "Modified Adjusted Gross Income",
    abbreviation: "MAGI",
    domain: "healthcare",
    definition:
      "The income figure used to determine eligibility for Marketplace subsidies and Medicaid. It is your AGI plus untaxed foreign income, non-taxable Social Security benefits, and tax-exempt interest.",
    source: "IRS",
    relatedTerms: ["APTC", "subsidy", "AGI"],
  },
  {
    term: "Essential Health Benefits",
    abbreviation: "EHB",
    domain: "healthcare",
    definition:
      "The ten categories of services that all ACA-compliant plans must cover: ambulatory care, emergency services, hospitalization, maternity/newborn, mental health, prescription drugs, rehabilitative services, lab services, preventive care, and pediatric services.",
    source: "CMS",
    relatedTerms: ["Marketplace", "premium"],
  },
  {
    term: "Cost-Sharing Reduction",
    abbreviation: "CSR",
    domain: "healthcare",
    definition:
      "A discount that lowers your out-of-pocket costs (deductibles, copays, coinsurance) on Silver-tier Marketplace plans. Available to households earning 100-250% of the federal poverty level.",
    source: "CMS",
    relatedTerms: ["subsidy", "APTC", "premium"],
  },
];
