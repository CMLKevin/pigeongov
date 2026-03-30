import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import { WorkflowDefinition } from "../registry.js";
import {
  buildEvidenceItem,
  buildGenericSummary,
  currency,
  genericArtifacts,
  makeCheck,
  makeFlag,
} from "../helpers.js";
import {
  fafsaInputSchema,
  studentLoanRepaymentInputSchema,
  plan529InputSchema,
  type FafsaInput,
  type StudentLoanRepaymentInput,
  type Plan529Input,
} from "../schemas/education.js";

// ---------------------------------------------------------------------------
// FPL 2025 values for IDR calculations
// ---------------------------------------------------------------------------

function federalPovertyLevel(householdSize: number): number {
  return 15_650 + Math.max(0, householdSize - 1) * 5_580;
}

function discretionaryIncome(annualIncome: number, householdSize: number): number {
  return Math.max(0, annualIncome - 1.5 * federalPovertyLevel(householdSize));
}

/** Standard amortisation payment over `months` at monthly rate `r`. */
function amortise(principal: number, annualRate: number, months: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

// ---------------------------------------------------------------------------
// education/fafsa
// ---------------------------------------------------------------------------

const fafsaWorkflow = {
  summary: {
    id: "education/fafsa",
    domain: "education" as const,
    title: "FAFSA readiness planner",
    summary:
      "Organise student identity, dependency status, and financial evidence for FAFSA filing.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["fafsa", "financial-aid", "education", "student"],
  },
  inputSchema: fafsaInputSchema,
  starterData: {
    studentInfo: {
      name: "",
      dob: "",
      ssn: "000-00-0000",
      citizenshipStatus: "us_citizen",
    },
    dependencyStatus: "dependent",
    studentIncome: 0,
    studentAssets: 0,
    schoolCodes: [],
    filingStatus: "single",
    hasCompletedTaxReturn: false,
  } satisfies FafsaInput,
  sections: [
    {
      id: "student-identity",
      title: "Student Identity",
      fields: [
        { key: "studentInfo.name", label: "Student full name", type: "text" as const },
        { key: "studentInfo.dob", label: "Date of birth", type: "date" as const },
        { key: "studentInfo.ssn", label: "SSN", type: "text" as const },
        {
          key: "studentInfo.citizenshipStatus",
          label: "Citizenship status",
          type: "select" as const,
          options: [
            { label: "US Citizen", value: "us_citizen" },
            { label: "Eligible non-citizen", value: "eligible_noncitizen" },
            { label: "Other", value: "other" },
          ],
        },
      ],
    },
    {
      id: "dependency-status",
      title: "Dependency Status",
      fields: [
        {
          key: "dependencyStatus",
          label: "Dependency status",
          type: "select" as const,
          options: [
            { label: "Dependent", value: "dependent" },
            { label: "Independent", value: "independent" },
          ],
        },
      ],
    },
    {
      id: "financial-information",
      title: "Financial Information",
      fields: [
        { key: "studentIncome", label: "Student income", type: "currency" as const },
        { key: "studentAssets", label: "Student assets", type: "currency" as const },
        {
          key: "filingStatus",
          label: "Filing status",
          type: "select" as const,
          options: [
            { label: "Single", value: "single" },
            { label: "Married filing jointly", value: "married_filing_jointly" },
            { label: "Head of household", value: "head_of_household" },
          ],
        },
        { key: "hasCompletedTaxReturn", label: "Tax return completed", type: "confirm" as const },
      ],
    },
    {
      id: "school-selection",
      title: "School Selection",
      fields: [
        {
          key: "schoolCodes",
          label: "School codes",
          type: "text" as const,
          helpText: "Comma-separated federal school codes.",
        },
      ],
    },
  ],
  buildBundle(input: FafsaInput): WorkflowBundle {
    const evidence = [
      buildEvidenceItem("tax-return", "Federal tax return (IRS DRT preferred)", true, input.hasCompletedTaxReturn),
      buildEvidenceItem("bank-statements", "Bank statements for asset verification", true, input.studentAssets > 0),
      buildEvidenceItem("w2", "W-2 forms", input.studentIncome > 0, input.studentIncome > 0),
      buildEvidenceItem(
        "citizenship-proof",
        "Birth certificate or citizenship proof",
        true,
        input.studentInfo.citizenshipStatus === "us_citizen",
        input.studentInfo.citizenshipStatus === "other"
          ? "Non-eligible citizenship status may prevent FAFSA filing."
          : undefined,
      ),
    ];

    if (input.dependencyStatus === "dependent" && input.parentInfo) {
      evidence.push(
        buildEvidenceItem("parent-tax-return", "Parent tax return", true, input.hasCompletedTaxReturn),
        buildEvidenceItem("parent-bank-statements", "Parent bank statements", true, input.parentInfo.assets > 0),
      );
    }

    const flags: ValidationFlag[] = [];

    // High assets with low income is a review trigger
    const totalAssets = input.studentAssets + (input.parentInfo?.assets ?? 0);
    const totalIncome = input.studentIncome + (input.parentInfo?.income ?? 0);
    if (totalAssets > 50_000 && totalIncome < 30_000) {
      flags.push(
        makeFlag(
          "studentAssets",
          "review",
          "High assets relative to low income may trigger verification — ensure documentation is thorough.",
        ),
      );
    }

    // Dependency override situations
    if (
      input.dependencyStatus === "independent" &&
      input.studentIncome < 10_000 &&
      input.studentAssets < 5_000
    ) {
      flags.push(
        makeFlag(
          "dependencyStatus",
          "review",
          "Independent status with very low income/assets — school may request dependency override documentation.",
        ),
      );
    }

    if (input.studentInfo.citizenshipStatus === "other") {
      flags.push(
        makeFlag(
          "studentInfo.citizenshipStatus",
          "error",
          "Only US citizens and eligible non-citizens may file FAFSA.",
        ),
      );
    }

    // Simplified SAI calculation
    // Real formula is vastly more complex; this is a directional estimate
    const incomeContribution = totalIncome * 0.22;
    const assetContribution = totalAssets * 0.05;
    const estimatedSAI = Math.max(-1_500, Math.round(incomeContribution + assetContribution - 6_000));

    const checks = [
      makeCheck(
        "tax-return",
        "Tax return available",
        input.hasCompletedTaxReturn,
        "warning",
        "Complete your federal tax return before filing FAFSA for best accuracy.",
      ),
      makeCheck(
        "school-codes",
        "At least one school selected",
        input.schoolCodes.length > 0,
        "error",
        "Add at least one school code so aid can be sent.",
      ),
      makeCheck(
        "citizenship",
        "Eligible citizenship status",
        input.studentInfo.citizenshipStatus !== "other",
        "error",
        "FAFSA requires US citizenship or eligible non-citizen status.",
      ),
    ];

    return {
      workflowId: "education/fafsa",
      domain: "education",
      title: "FAFSA readiness planner",
      summary: "FAFSA readiness bundle. PigeonGov does not submit your FAFSA.",
      applicant: undefined,
      household:
        input.dependencyStatus === "dependent" && input.parentInfo
          ? [{ name: "Parent/guardian", relationship: "parent", notes: `Household size: ${input.parentInfo.householdSize}` }]
          : [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        estimatedSAI,
        totalIncome,
        totalAssets,
        schoolCount: input.schoolCodes.length,
        dependencyStatus: input.dependencyStatus,
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "FAFSA readiness",
        `estimated SAI: ${currency(estimatedSAI)}`,
        evidence,
        flags,
        [
          `${evidence.filter((e) => e.status === "provided").length} evidence items provided, estimated SAI: ${currency(estimatedSAI)}.`,
          `Schools selected: ${input.schoolCodes.length}.`,
          `Dependency status: ${input.dependencyStatus}.`,
        ],
      ),
      outputArtifacts: genericArtifacts("education-fafsa", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<FafsaInput>;

// ---------------------------------------------------------------------------
// education/student-loan-repayment
// ---------------------------------------------------------------------------

interface RepaymentPlan {
  name: string;
  monthlyPayment: number;
  totalPaid: number;
  termMonths: number;
  eligible: boolean;
  note?: string | undefined;
}

function computeRepaymentPlans(input: StudentLoanRepaymentInput): RepaymentPlan[] {
  const federalLoans = input.loans.filter((l) => l.type === "federal");
  const totalFederalBalance = federalLoans.reduce((s, l) => s + l.balance, 0);
  const weightedRate =
    totalFederalBalance > 0
      ? federalLoans.reduce((s, l) => s + l.rate * l.balance, 0) / totalFederalBalance
      : 0.05;

  const di = discretionaryIncome(input.annualIncome, input.householdSize);
  const monthlyDI = di / 12;

  const plans: RepaymentPlan[] = [];

  // Standard 10-year (120 month) amortisation
  const standardMonthly = amortise(totalFederalBalance, weightedRate, 120);
  plans.push({
    name: "Standard",
    monthlyPayment: Math.round(standardMonthly * 100) / 100,
    totalPaid: Math.round(standardMonthly * 120 * 100) / 100,
    termMonths: 120,
    eligible: totalFederalBalance > 0,
  });

  // SAVE: 10% of discretionary income, 20-25 year forgiveness (use 240 for undergrad)
  const saveMonthly = Math.round(monthlyDI * 0.1 * 100) / 100;
  const saveTerm = 240;
  plans.push({
    name: "SAVE",
    monthlyPayment: saveMonthly,
    totalPaid: Math.round(saveMonthly * saveTerm * 100) / 100,
    termMonths: saveTerm,
    eligible: totalFederalBalance > 0,
    note: "Replaces REPAYE. Lowest payment for most borrowers.",
  });

  // PAYE: 10% of discretionary income, 20-year forgiveness
  const payeMonthly = Math.round(monthlyDI * 0.1 * 100) / 100;
  const payeTerm = 240;
  plans.push({
    name: "PAYE",
    monthlyPayment: payeMonthly,
    totalPaid: Math.round(payeMonthly * payeTerm * 100) / 100,
    termMonths: payeTerm,
    eligible: totalFederalBalance > 0,
    note: "Capped at Standard payment amount.",
  });

  // IBR: 15% of discretionary income, 25-year forgiveness
  const ibrMonthly = Math.round(monthlyDI * 0.15 * 100) / 100;
  const ibrTerm = 300;
  plans.push({
    name: "IBR",
    monthlyPayment: ibrMonthly,
    totalPaid: Math.round(ibrMonthly * ibrTerm * 100) / 100,
    termMonths: ibrTerm,
    eligible: totalFederalBalance > 0,
    note: "New borrowers after 2014 get 10% / 20-year terms.",
  });

  // ICR: 20% of discretionary income or fixed 12-year payment, whichever is lower
  const icrOptionA = Math.round(monthlyDI * 0.2 * 100) / 100;
  const icrOptionB = amortise(totalFederalBalance, weightedRate, 144);
  const icrMonthly = Math.round(Math.min(icrOptionA, icrOptionB) * 100) / 100;
  const icrTerm = 300;
  plans.push({
    name: "ICR",
    monthlyPayment: icrMonthly,
    totalPaid: Math.round(icrMonthly * icrTerm * 100) / 100,
    termMonths: icrTerm,
    eligible: totalFederalBalance > 0,
    note: "Only IDR plan available for Parent PLUS (via consolidation).",
  });

  return plans;
}

const studentLoanRepaymentWorkflow = {
  summary: {
    id: "education/student-loan-repayment",
    domain: "education" as const,
    title: "Student loan repayment planner",
    summary:
      "Compare IDR plans (SAVE, PAYE, IBR, ICR) and standard repayment across your federal loan portfolio.",
    status: "active" as const,
    audience: "individual" as const,
    tags: ["student-loans", "idr", "pslf", "repayment", "education"],
  },
  inputSchema: studentLoanRepaymentInputSchema,
  starterData: {
    loans: [
      {
        servicer: "",
        balance: 0,
        rate: 0.05,
        type: "federal",
        originalAmount: 0,
      },
    ],
    annualIncome: 0,
    filingStatus: "single",
    householdSize: 1,
    employerType: "private",
    monthsOfQualifyingPayments: 0,
  } satisfies StudentLoanRepaymentInput,
  sections: [
    {
      id: "loan-inventory",
      title: "Loan Inventory",
      fields: [
        { key: "loans", label: "Loan details", type: "textarea" as const, helpText: "Enter each loan's servicer, balance, rate, and type." },
      ],
    },
    {
      id: "income-employment",
      title: "Income & Employment",
      fields: [
        { key: "annualIncome", label: "Annual income", type: "currency" as const },
        {
          key: "filingStatus",
          label: "Filing status",
          type: "select" as const,
          options: [
            { label: "Single", value: "single" },
            { label: "Married filing jointly", value: "married_filing_jointly" },
            { label: "Married filing separately", value: "married_filing_separately" },
          ],
        },
        { key: "householdSize", label: "Household size", type: "number" as const },
        {
          key: "employerType",
          label: "Employer type",
          type: "select" as const,
          options: [
            { label: "Public sector", value: "public" },
            { label: "Private sector", value: "private" },
            { label: "Non-profit", value: "nonprofit" },
          ],
        },
        {
          key: "monthsOfQualifyingPayments",
          label: "Months of qualifying PSLF payments",
          type: "number" as const,
        },
      ],
    },
    {
      id: "repayment-goals",
      title: "Repayment Goals",
      description: "PigeonGov will compare repayment plans automatically.",
      fields: [],
    },
  ],
  buildBundle(input: StudentLoanRepaymentInput): WorkflowBundle {
    const federalLoans = input.loans.filter((l) => l.type === "federal");
    const privateLoans = input.loans.filter((l) => l.type === "private");
    const totalBalance = input.loans.reduce((s, l) => s + l.balance, 0);
    const totalFederalBalance = federalLoans.reduce((s, l) => s + l.balance, 0);

    const evidence = [
      buildEvidenceItem("loan-statements", "Loan statements", true, totalBalance > 0),
      buildEvidenceItem("income-verification", "Income verification (pay stubs / tax return)", true, input.annualIncome > 0),
      buildEvidenceItem(
        "employer-certification",
        "Employer certification for PSLF (ECF)",
        input.employerType !== "private",
        input.employerType !== "private" && input.monthsOfQualifyingPayments > 0,
        input.employerType !== "private" ? "Submit ECF annually to track PSLF progress." : undefined,
      ),
    ];

    const flags: ValidationFlag[] = [];

    if (privateLoans.length > 0) {
      flags.push(
        makeFlag(
          "loans",
          "warning",
          `${privateLoans.length} private loan(s) totalling ${currency(privateLoans.reduce((s, l) => s + l.balance, 0))} are not eligible for IDR or PSLF.`,
        ),
      );
    }

    const pslf = input.employerType === "public" || input.employerType === "nonprofit";
    if (!pslf && input.monthsOfQualifyingPayments > 0) {
      flags.push(
        makeFlag(
          "employerType",
          "warning",
          "PSLF requires employment with a public-sector or non-profit employer. Current employer type does not qualify.",
        ),
      );
    }

    const plans = computeRepaymentPlans(input);
    const eligiblePlans = plans.filter((p) => p.eligible);
    const lowestPayment = eligiblePlans.length > 0
      ? eligiblePlans.reduce((min, p) => (p.monthlyPayment < min.monthlyPayment ? p : min), eligiblePlans[0]!)
      : null;

    const pslMonthsRemaining = pslf ? Math.max(0, 120 - input.monthsOfQualifyingPayments) : null;

    const checks = [
      makeCheck(
        "federal-loans",
        "Federal loans present",
        federalLoans.length > 0,
        "warning",
        "IDR plans are only available for federal student loans.",
      ),
      makeCheck(
        "income-provided",
        "Income information provided",
        input.annualIncome > 0,
        "error",
        "Income is required to calculate IDR payments.",
      ),
    ];

    return {
      workflowId: "education/student-loan-repayment",
      domain: "education",
      title: "Student loan repayment planner",
      summary: "IDR comparison for federal student loans. PigeonGov does not change your repayment plan.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        plans,
        lowestPlan: lowestPayment?.name ?? "N/A",
        lowestMonthlyPayment: lowestPayment?.monthlyPayment ?? 0,
        totalBalance,
        totalFederalBalance,
        pslf,
        pslMonthsRemaining,
        discretionaryIncome: discretionaryIncome(input.annualIncome, input.householdSize),
        fpl: federalPovertyLevel(input.householdSize),
      },
      validation: { checks, flaggedFields: flags },
      review: buildGenericSummary(
        "Student loan repayment",
        lowestPayment
          ? `lowest monthly: ${lowestPayment.name} at ${currency(lowestPayment.monthlyPayment)}/mo`
          : "no federal loans for IDR",
        evidence,
        flags,
        [
          `Total balance: ${currency(totalBalance)} (${currency(totalFederalBalance)} federal).`,
          lowestPayment
            ? `Lowest monthly payment: ${lowestPayment.name} at ${currency(lowestPayment.monthlyPayment)}/month.`
            : "No eligible IDR plans.",
          `PSLF eligible: ${pslf ? "yes" : "no"}.${pslf && pslMonthsRemaining !== null ? ` ${pslMonthsRemaining} qualifying months remaining.` : ""}`,
        ],
      ),
      outputArtifacts: genericArtifacts("education-student-loan-repayment", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<StudentLoanRepaymentInput>;

// ---------------------------------------------------------------------------
// education/529-planner
// ---------------------------------------------------------------------------

const plan529Workflow = {
  summary: {
    id: "education/529-planner",
    domain: "education" as const,
    title: "529 savings planner",
    summary: "Project 529 plan growth and explore state tax deduction benefits.",
    status: "active" as const,
    audience: "household" as const,
    tags: ["529", "education-savings", "tax-deduction", "investment"],
  },
  inputSchema: plan529InputSchema,
  starterData: {
    state: "CA",
    annualContribution: 0,
    beneficiaryAge: 0,
    investmentTimeline: 18,
    currentBalance: 0,
  } satisfies Plan529Input,
  sections: [
    {
      id: "plan-details",
      title: "Plan Details",
      fields: [
        { key: "state", label: "State", type: "text" as const },
        { key: "currentBalance", label: "Current 529 balance", type: "currency" as const },
        { key: "beneficiaryAge", label: "Beneficiary current age", type: "number" as const },
      ],
    },
    {
      id: "contribution-planning",
      title: "Contribution Planning",
      fields: [
        { key: "annualContribution", label: "Annual contribution", type: "currency" as const },
        { key: "investmentTimeline", label: "Investment timeline (years)", type: "number" as const },
      ],
    },
  ],
  buildBundle(input: Plan529Input): WorkflowBundle {
    // Project balance at beneficiary age 18 (or end of timeline) at 7% annual return
    const yearsUntil18 = Math.max(0, 18 - input.beneficiaryAge);
    const projectionYears = Math.min(input.investmentTimeline, yearsUntil18);
    const growthRate = 0.07;

    let projectedBalance = input.currentBalance;
    for (let year = 0; year < projectionYears; year++) {
      projectedBalance = (projectedBalance + input.annualContribution) * (1 + growthRate);
    }
    projectedBalance = Math.round(projectedBalance * 100) / 100;

    // State tax deduction mapping (simplified — many states offer some deduction)
    const statesWithFullDeduction = new Set([
      "AZ", "AR", "CO", "CT", "GA", "ID", "IL", "IN", "IA", "KS",
      "LA", "MD", "MI", "MN", "MS", "MO", "MT", "NE", "NM", "NY",
      "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "UT", "VA",
      "VT", "WV", "WI", "DC",
    ]);
    const noIncomeTaxStates = new Set(["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"]);

    let stateTaxBenefit: string;
    if (noIncomeTaxStates.has(input.state)) {
      stateTaxBenefit = "No state income tax — no deduction benefit, but earnings still grow tax-free.";
    } else if (statesWithFullDeduction.has(input.state)) {
      stateTaxBenefit = "State offers a tax deduction or credit for 529 contributions.";
    } else {
      stateTaxBenefit = "State may not offer a 529 tax deduction — verify with your state tax authority.";
    }

    const totalContributions = input.currentBalance + input.annualContribution * projectionYears;
    const estimatedGrowth = projectedBalance - totalContributions;

    const evidence = [] as ReturnType<typeof buildEvidenceItem>[];

    const flags: ValidationFlag[] = [];
    const checks = [
      makeCheck(
        "contribution",
        "Annual contribution set",
        input.annualContribution > 0,
        "warning",
        "Set an annual contribution amount to see projections.",
      ),
    ];

    return {
      workflowId: "education/529-planner",
      domain: "education",
      title: "529 savings planner",
      summary: "529 plan projection tool. PigeonGov does not manage investments.",
      applicant: undefined,
      household: [],
      evidence,
      answers: input as unknown as Record<string, unknown>,
      derived: {
        projectedBalance,
        projectionYears,
        totalContributions,
        estimatedGrowth,
        growthRate,
        stateTaxBenefit,
      },
      validation: { checks, flaggedFields: flags },
      review: {
        headline: `529 planner: projected balance ${currency(projectedBalance)} in ${projectionYears} years`,
        notes: [
          `Current balance: ${currency(input.currentBalance)}.`,
          `Annual contribution: ${currency(input.annualContribution)}.`,
          `Projected balance at beneficiary age 18: ${currency(projectedBalance)}.`,
          `Estimated growth: ${currency(estimatedGrowth)}.`,
          stateTaxBenefit,
        ],
        flaggedFields: flags,
      },
      outputArtifacts: genericArtifacts("education-529-planner", evidence),
      provenance: ["workflow-registry"],
    };
  },
} satisfies WorkflowDefinition<Plan529Input>;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const educationWorkflows = {
  "education/fafsa": fafsaWorkflow,
  "education/student-loan-repayment": studentLoanRepaymentWorkflow,
  "education/529-planner": plan529Workflow,
} as const;
