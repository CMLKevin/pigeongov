import type { GlossaryEntry } from "../../types.js";

export const taxGlossaryEntries: GlossaryEntry[] = [
  {
    term: "Adjusted Gross Income",
    abbreviation: "AGI",
    domain: "tax",
    definition:
      "Your gross income minus specific above-the-line deductions such as student loan interest, IRA contributions, and self-employment tax. AGI is the starting point for calculating your taxable income.",
    officialDefinition: "Gross income minus adjustments to income (IRS Publication 17).",
    source: "IRS",
    relatedTerms: ["gross income", "taxable income", "standard deduction"],
  },
  {
    term: "Standard Deduction",
    domain: "tax",
    definition:
      "A fixed dollar amount that reduces the income on which you are taxed. The amount depends on your filing status, age, and whether you are blind. Most filers take the standard deduction rather than itemizing.",
    source: "IRS",
    relatedTerms: ["itemized deduction", "filing status", "taxable income"],
  },
  {
    term: "Itemized Deduction",
    domain: "tax",
    definition:
      "Specific expenses you can list on Schedule A to reduce your taxable income, including mortgage interest, state/local taxes (SALT), charitable contributions, and medical expenses above a threshold. You choose whichever is greater: standard or itemized.",
    source: "IRS",
    relatedTerms: ["standard deduction", "Schedule C"],
  },
  {
    term: "Filing Status",
    domain: "tax",
    definition:
      "A category that determines your tax bracket thresholds, standard deduction amount, and eligibility for certain credits. The five statuses are: Single, Married Filing Jointly, Married Filing Separately, Head of Household, and Qualifying Surviving Spouse.",
    source: "IRS",
    relatedTerms: ["standard deduction", "marginal rate"],
  },
  {
    term: "W-2",
    abbreviation: "W-2",
    domain: "tax",
    definition:
      "A form your employer sends you each January showing your total wages and the taxes withheld during the prior year. You need it to file your return accurately.",
    source: "IRS",
    relatedTerms: ["withholding", "wages", "1099"],
  },
  {
    term: "1099",
    abbreviation: "1099",
    domain: "tax",
    definition:
      "A family of forms reporting non-wage income: 1099-NEC for freelance/contractor income, 1099-INT for interest, 1099-DIV for dividends, 1099-B for brokerage proceeds, and others.",
    source: "IRS",
    relatedTerms: ["W-2", "self-employment tax", "Schedule C"],
  },
  {
    term: "Schedule C",
    domain: "tax",
    definition:
      "The IRS form (attached to your 1040) used to report profit or loss from a sole proprietorship or single-member LLC. Your net Schedule C income is subject to both income tax and self-employment tax.",
    source: "IRS",
    relatedTerms: ["self-employment tax", "1099", "AGI"],
  },
  {
    term: "Self-Employment Tax",
    abbreviation: "SE tax",
    domain: "tax",
    definition:
      "The Social Security and Medicare taxes you pay on net self-employment income. The combined rate is 15.3% (12.4% SS + 2.9% Medicare). Half of the SE tax is deductible as an above-the-line adjustment.",
    source: "IRS",
    relatedTerms: ["Schedule C", "AGI", "estimated payments"],
  },
  {
    term: "Earned Income Tax Credit",
    abbreviation: "EITC",
    domain: "tax",
    definition:
      "A refundable tax credit for low-to-moderate income workers. The amount depends on income, filing status, and number of qualifying children. It can result in a refund even if you owe no tax.",
    source: "IRS",
    relatedTerms: ["child tax credit", "refund", "AGI"],
  },
  {
    term: "Child Tax Credit",
    abbreviation: "CTC",
    domain: "tax",
    definition:
      "A credit of up to $2,000 per qualifying child under age 17. Partially refundable (up to $1,700 as the Additional Child Tax Credit). Phases out at higher incomes.",
    source: "IRS",
    relatedTerms: ["EITC", "dependent", "refund"],
  },
  {
    term: "Marginal Rate",
    domain: "tax",
    definition:
      "The tax rate applied to the last dollar of your taxable income. The U.S. uses a progressive system with brackets — each bracket's rate applies only to income within that bracket's range.",
    source: "IRS",
    relatedTerms: ["effective rate", "taxable income", "filing status"],
  },
  {
    term: "Effective Rate",
    domain: "tax",
    definition:
      "Your total federal income tax divided by your total taxable income, expressed as a percentage. It is always lower than your marginal rate because lower brackets are taxed at lower rates.",
    relatedTerms: ["marginal rate", "taxable income"],
  },
  {
    term: "Taxable Income",
    domain: "tax",
    definition:
      "The portion of your income that is actually subject to federal income tax. Calculated as AGI minus your deduction (standard or itemized) and any qualified business income deduction.",
    source: "IRS",
    relatedTerms: ["AGI", "standard deduction", "itemized deduction"],
  },
  {
    term: "Gross Income",
    domain: "tax",
    definition:
      "All income you receive in the form of money, goods, property, and services that is not exempt from tax. Includes wages, interest, dividends, business income, capital gains, and more.",
    source: "IRS",
    relatedTerms: ["AGI", "taxable income"],
  },
  {
    term: "Exemption",
    domain: "tax",
    definition:
      "A historical concept (suspended 2018-2025 by TCJA) that reduced taxable income for the taxpayer, spouse, and dependents. The higher standard deduction and child tax credit replaced most of its benefit.",
    source: "IRS",
    relatedTerms: ["standard deduction", "child tax credit"],
  },
  {
    term: "Withholding",
    domain: "tax",
    definition:
      "The portion of your paycheck your employer sends directly to the IRS on your behalf throughout the year. Reported on your W-2. If too little is withheld, you may owe at filing time.",
    source: "IRS",
    relatedTerms: ["W-2", "estimated payments", "refund"],
  },
  {
    term: "Estimated Payments",
    domain: "tax",
    definition:
      "Quarterly tax payments made directly to the IRS (using Form 1040-ES) by people who have income not subject to withholding — typically freelancers, landlords, and investors. Due April 15, June 15, September 15, and January 15.",
    source: "IRS",
    relatedTerms: ["self-employment tax", "withholding"],
  },
  {
    term: "Refund",
    domain: "tax",
    definition:
      "The amount the IRS returns to you when your total payments (withholding + estimated payments + refundable credits) exceed your tax liability. Direct deposit is the fastest way to receive it.",
    source: "IRS",
    relatedTerms: ["withholding", "EITC", "child tax credit"],
  },
  {
    term: "Amended Return",
    domain: "tax",
    definition:
      "Form 1040-X, filed to correct errors or claim missed deductions/credits on a previously filed return. You generally have three years from the original filing date to amend.",
    source: "IRS",
    relatedTerms: ["extension", "refund"],
  },
  {
    term: "Extension",
    domain: "tax",
    definition:
      "Form 4868 gives you an automatic six-month extension to file (until October 15), but it does not extend the time to pay. Interest and penalties accrue on unpaid balances from April 15.",
    source: "IRS",
    relatedTerms: ["amended return", "estimated payments"],
  },
];
