import type { GlossaryEntry } from "../../types.js";

export const unemploymentGlossaryEntries: GlossaryEntry[] = [
  {
    term: "Base Period",
    domain: "unemployment",
    definition:
      "The 12-month timeframe (typically the first four of the last five completed calendar quarters before your claim) used to determine your monetary eligibility and benefit amount.",
    relatedTerms: ["benefit year", "monetary eligibility", "weekly benefit"],
  },
  {
    term: "Benefit Year",
    domain: "unemployment",
    definition:
      "The 52-week period beginning with the effective date of your unemployment claim. You can receive benefits only during your benefit year, subject to weekly and maximum total limits.",
    relatedTerms: ["base period", "weekly benefit", "benefit amount"],
  },
  {
    term: "Separation Reason",
    domain: "unemployment",
    definition:
      "The reason you are no longer working — such as layoff, reduction in force, voluntary quit, or discharge for cause. Your separation reason determines whether you are eligible for unemployment benefits.",
    relatedTerms: ["monetary eligibility", "waiting week"],
  },
  {
    term: "Suitable Gainful Activity",
    abbreviation: "SGA",
    domain: "unemployment",
    definition:
      "Work that matches your skills, experience, and prior wages. Most states require you to actively search for suitable work as a condition of receiving benefits.",
    relatedTerms: ["weekly benefit", "separation reason"],
  },
  {
    term: "Waiting Week",
    domain: "unemployment",
    definition:
      "The first week of your unemployment claim during which you meet all eligibility requirements but do not receive a benefit payment. Most states impose a one-week waiting period.",
    relatedTerms: ["benefit year", "weekly benefit"],
  },
  {
    term: "Benefit Amount",
    domain: "unemployment",
    definition:
      "The maximum total dollar amount you can receive during your benefit year. Calculated based on your base-period earnings and your state's formula.",
    relatedTerms: ["weekly benefit", "base period", "monetary eligibility"],
  },
  {
    term: "Weekly Benefit",
    domain: "unemployment",
    definition:
      "The amount you receive each week while unemployed and eligible. Typically a percentage (often around 50%) of your average weekly wages during the base period, subject to a state-imposed cap.",
    relatedTerms: ["benefit amount", "base period"],
  },
  {
    term: "Monetary Eligibility",
    domain: "unemployment",
    definition:
      "The determination of whether you earned enough wages during the base period to qualify for unemployment benefits. Each state sets minimum earnings thresholds.",
    relatedTerms: ["base period", "benefit amount", "separation reason"],
  },
];
