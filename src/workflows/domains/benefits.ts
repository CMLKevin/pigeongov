import type { ValidationFlag, WorkflowBundle } from "../../types.js";
import {
  buildEvidenceItem,
  buildGenericSummary,
  currency,
  genericArtifacts,
  makeCheck,
  makeFlag,
} from "../helpers.js";
import type { WorkflowDefinition } from "../registry.js";
import {
  liheapInputSchema,
  medicaidInputSchema,
  section8InputSchema,
  snapInputSchema,
  ssdiInputSchema,
  wicInputSchema,
} from "../schemas/benefits.js";
import type {
  LiheapInput,
  MedicaidInput,
  Section8Input,
  SnapInput,
  SsdiInput,
  WicInput,
} from "../schemas/benefits.js";
import { ssiInputSchema, type SsiInput } from "../schemas/ssi.js";
import { tanfInputSchema, type TanfInput } from "../schemas/tanf.js";

// ---------------------------------------------------------------------------
// FPL tables (2025)
// ---------------------------------------------------------------------------

const FPL_2025: Record<number, number> = {
  1: 15_650,
  2: 21_150,
  3: 26_650,
  4: 32_150,
  5: 37_650,
  6: 43_150,
  7: 48_650,
  8: 54_150,
};

function fplForSize(size: number): number {
  if (size <= 0) return FPL_2025[1]!;
  if (size <= 8) return FPL_2025[size]!;
  // Each additional person adds ~$5,500
  return FPL_2025[8]! + (size - 8) * 5_500;
}

// ---------------------------------------------------------------------------
// Max SNAP allotment (2025 approximate)
// ---------------------------------------------------------------------------

const SNAP_MAX_ALLOTMENT: Record<number, number> = {
  1: 292,
  2: 536,
  3: 768,
  4: 975,
  5: 1_158,
  6: 1_390,
  7: 1_536,
  8: 1_756,
};

function snapMaxForSize(size: number): number {
  if (size <= 0) return SNAP_MAX_ALLOTMENT[1]!;
  if (size <= 8) return SNAP_MAX_ALLOTMENT[size]!;
  return SNAP_MAX_ALLOTMENT[8]! + (size - 8) * 220;
}

// ---------------------------------------------------------------------------
// Medicaid expansion states (2025) — states that have NOT expanded
// ---------------------------------------------------------------------------

const NON_EXPANSION_STATES = new Set([
  "AL", "FL", "GA", "KS", "MS", "SC", "TN", "TX", "WI", "WY",
]);

// ---------------------------------------------------------------------------
// benefits/snap
// ---------------------------------------------------------------------------

function buildSnapBundle(input: SnapInput): WorkflowBundle {
  const fpl = fplForSize(input.householdSize);
  const categoricallyEligible = input.receivingTanf || input.receivingSsi;
  const grossIncomeLimit = fpl * 1.3 / 12;
  const netIncomeLimit = fpl / 12;
  const grossIncomeTest = categoricallyEligible || input.monthlyGrossIncome <= grossIncomeLimit;
  const netIncomeTest = categoricallyEligible || input.monthlyNetIncome <= netIncomeLimit;
  const maxAllotment = snapMaxForSize(input.householdSize);
  const estimatedBenefit = Math.max(0, maxAllotment - Math.round(input.monthlyNetIncome * 0.3));

  const evidence = [
    buildEvidenceItem("income-verification", "Income verification (pay stubs, tax return)", true, input.monthlyGrossIncome > 0),
    buildEvidenceItem("identity", "Government-issued photo ID", true, true),
    buildEvidenceItem("residency", "Proof of state residency", true, true),
    buildEvidenceItem("citizenship", "Citizenship or immigration status documentation", true, input.citizenshipStatus === "us_citizen"),
  ];

  const flags: ValidationFlag[] = [];
  if (categoricallyEligible) {
    flags.push(
      makeFlag("receivingTanf", "review", "Categorically eligible through TANF/SSI — income test may be waived."),
    );
  }
  if (!grossIncomeTest) {
    flags.push(makeFlag("monthlyGrossIncome", "error", `Gross income ${currency(input.monthlyGrossIncome)} exceeds 130% FPL limit of ${currency(grossIncomeLimit)}/month.`));
  }
  if (!netIncomeTest) {
    flags.push(makeFlag("monthlyNetIncome", "warning", `Net income ${currency(input.monthlyNetIncome)} exceeds 100% FPL limit of ${currency(netIncomeLimit)}/month.`));
  }
  if (input.citizenshipStatus === "other") {
    flags.push(makeFlag("citizenshipStatus", "error", "SNAP generally requires US citizenship or qualified alien status."));
  }

  const checks = [
    makeCheck("gross-income", "Gross income test (130% FPL)", grossIncomeTest, "error", `Monthly gross income must be at or below ${currency(grossIncomeLimit)}.`),
    makeCheck("net-income", "Net income test (100% FPL)", netIncomeTest, "error", `Monthly net income must be at or below ${currency(netIncomeLimit)}.`),
    makeCheck("citizenship", "Citizenship/immigration status", input.citizenshipStatus !== "other", "error", "Applicant must be a US citizen or qualified alien."),
  ];

  const eligible = grossIncomeTest && netIncomeTest;
  const readiness = eligible ? "likely eligible" : "may not qualify";

  return {
    workflowId: "benefits/snap",
    domain: "benefits",
    title: "SNAP benefits eligibility",
    summary: "SNAP (food stamps) eligibility assessment and benefit estimation. PigeonGov does not submit applications.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      fpl,
      grossIncomeLimit,
      netIncomeLimit,
      grossIncomeTest,
      netIncomeTest,
      categoricallyEligible,
      maxAllotment,
      estimatedMonthlyBenefit: estimatedBenefit,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "SNAP eligibility",
      readiness,
      evidence,
      flags,
      [
        `Household size: ${input.householdSize}. FPL: ${currency(fpl)}.`,
        `Gross income test (130% FPL): ${grossIncomeTest ? "PASS" : "FAIL"}.`,
        `Net income test (100% FPL): ${netIncomeTest ? "PASS" : "FAIL"}.`,
        categoricallyEligible ? "Categorically eligible via TANF/SSI." : "",
        `Estimated monthly benefit: ${currency(estimatedBenefit)}.`,
      ].filter(Boolean),
    ),
    outputArtifacts: genericArtifacts("benefits-snap", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// benefits/section8
// ---------------------------------------------------------------------------

function buildSection8Bundle(input: Section8Input): WorkflowBundle {
  // Placeholder 50% AMI — in production this would vary by county
  const amiLimit = 30_000;
  const incomeEligible = input.annualIncome <= amiLimit;
  const estimatedVoucher = Math.max(0, input.currentHousingCost - Math.round(input.annualIncome * 0.3 / 12));

  const evidence = [
    buildEvidenceItem("income-verification", "Income verification", true, input.annualIncome > 0),
    buildEvidenceItem("identity", "Government-issued photo ID", true, true),
    buildEvidenceItem("lease", "Current lease agreement", false, false),
  ];

  const flags: ValidationFlag[] = [
    makeFlag("waitlist", "review", "Most areas have multi-year waitlists for Section 8 vouchers."),
  ];
  if (!incomeEligible) {
    flags.push(makeFlag("annualIncome", "warning", `Annual income ${currency(input.annualIncome)} exceeds 50% AMI placeholder of ${currency(amiLimit)}.`));
  }

  const checks = [
    makeCheck("income-limit", "Income below 50% AMI", incomeEligible, "warning", `Annual income should be at or below ${currency(amiLimit)} (placeholder 50% AMI).`),
  ];

  const preferenceFactors: string[] = [];
  if (input.isDisabled) preferenceFactors.push("disabled");
  if (input.isElderly) preferenceFactors.push("elderly");
  if (input.isVeteran) preferenceFactors.push("veteran");

  return {
    workflowId: "benefits/section8",
    domain: "benefits",
    title: "Section 8 Housing Choice Voucher",
    summary: "Section 8 eligibility assessment and voucher estimation. PigeonGov does not submit applications.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      amiLimit,
      incomeEligible,
      estimatedMonthlyVoucher: estimatedVoucher,
      preferenceFactors,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "Section 8 eligibility",
      incomeEligible ? "income eligible — waitlist likely" : "income may exceed limit",
      evidence,
      flags,
      [
        `Household size: ${input.householdSize}. County: ${input.county}, ${input.state}.`,
        `Annual income: ${currency(input.annualIncome)}. 50% AMI limit: ${currency(amiLimit)}.`,
        `Estimated voucher value: ${currency(estimatedVoucher)}/month.`,
        preferenceFactors.length > 0 ? `Preference factors: ${preferenceFactors.join(", ")}.` : "No preference factors identified.",
      ],
    ),
    outputArtifacts: genericArtifacts("benefits-section8", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// benefits/wic
// ---------------------------------------------------------------------------

function buildWicBundle(input: WicInput): WorkflowBundle {
  const fpl = fplForSize(input.householdSize);
  const incomeLimit185 = fpl * 1.85;
  const incomeEligible = input.annualIncome <= incomeLimit185;
  const adjunctivelyEligible = input.receivingMedicaid || input.receivingSnap || input.receivingTanf;

  const evidence = [
    buildEvidenceItem("identity", "Proof of identity", true, true),
    buildEvidenceItem("income-or-program", "Income documentation or proof of program enrollment", true, incomeEligible || adjunctivelyEligible),
    buildEvidenceItem("medical-referral", "Medical/nutritional referral", true, false),
  ];

  const flags: ValidationFlag[] = [];
  if (input.applicantCategory === "child" && input.applicantAge !== undefined && input.applicantAge >= 5) {
    flags.push(makeFlag("applicantAge", "error", "WIC child participants must be under age 5."));
  }
  if (adjunctivelyEligible) {
    flags.push(makeFlag("adjunctiveEligibility", "review", "Adjunctively eligible through Medicaid, SNAP, or TANF — income documentation may not be required."));
  }
  if (!incomeEligible && !adjunctivelyEligible) {
    flags.push(makeFlag("annualIncome", "warning", `Annual income ${currency(input.annualIncome)} exceeds 185% FPL limit of ${currency(incomeLimit185)}.`));
  }

  const ageError = input.applicantCategory === "child" && input.applicantAge !== undefined && input.applicantAge >= 5;

  const checks = [
    makeCheck("income-eligibility", "Income at or below 185% FPL (or adjunctive)", incomeEligible || adjunctivelyEligible, "error", `Household income must be at or below ${currency(incomeLimit185)} (185% FPL) or enrolled in qualifying program.`),
    makeCheck("age-check", "Child under age 5", !ageError, "error", "WIC child participants must be under 5 years old."),
  ];

  const eligible = (incomeEligible || adjunctivelyEligible) && !ageError;

  return {
    workflowId: "benefits/wic",
    domain: "benefits",
    title: "WIC program eligibility",
    summary: "WIC eligibility assessment for women, infants, and children. PigeonGov does not submit applications.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      fpl,
      incomeLimit185,
      incomeEligible,
      adjunctivelyEligible,
      eligible,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "WIC eligibility",
      eligible ? "likely eligible" : "may not qualify",
      evidence,
      flags,
      [
        `Category: ${input.applicantCategory}. Household size: ${input.householdSize}.`,
        `Annual income: ${currency(input.annualIncome)}. 185% FPL limit: ${currency(incomeLimit185)}.`,
        adjunctivelyEligible ? "Adjunctively eligible via Medicaid/SNAP/TANF." : "",
        input.applicantAge !== undefined ? `Applicant age: ${input.applicantAge}.` : "",
      ].filter(Boolean),
    ),
    outputArtifacts: genericArtifacts("benefits-wic", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// benefits/liheap
// ---------------------------------------------------------------------------

function buildLiheapBundle(input: LiheapInput): WorkflowBundle {
  const fpl = fplForSize(input.householdSize);
  const incomeLimit150 = fpl * 1.5;
  const incomeEligible = input.annualIncome <= incomeLimit150;

  const benefitType = input.hasUtilityShutoffNotice ? "crisis" : "regular";

  const evidence = [
    buildEvidenceItem("utility-bills", "Recent utility bills", true, true),
    buildEvidenceItem("income-verification", "Income verification", true, input.annualIncome > 0),
    buildEvidenceItem("identity", "Government-issued photo ID", true, true),
  ];

  const flags: ValidationFlag[] = [];
  if (input.hasUtilityShutoffNotice) {
    flags.push(makeFlag("hasUtilityShutoffNotice", "review", "Utility shutoff notice present — crisis assistance may be available with expedited processing."));
  }
  if (!incomeEligible) {
    flags.push(makeFlag("annualIncome", "warning", `Annual income ${currency(input.annualIncome)} exceeds 150% FPL limit of ${currency(incomeLimit150)}.`));
  }

  const checks = [
    makeCheck("income-eligibility", "Income at or below 150% FPL", incomeEligible, "error", `Household income must be at or below ${currency(incomeLimit150)} (150% FPL).`),
  ];

  return {
    workflowId: "benefits/liheap",
    domain: "benefits",
    title: "LIHEAP energy assistance",
    summary: "LIHEAP eligibility assessment for home energy assistance. PigeonGov does not submit applications.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      fpl,
      incomeLimit150,
      incomeEligible,
      benefitType,
      season: input.season,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "LIHEAP eligibility",
      incomeEligible ? "likely eligible" : "may not qualify",
      evidence,
      flags,
      [
        `Household size: ${input.householdSize}. State: ${input.state}.`,
        `Annual income: ${currency(input.annualIncome)}. 150% FPL limit: ${currency(incomeLimit150)}.`,
        `Heating source: ${input.heatingSource}. Season: ${input.season}.`,
        `Benefit type recommendation: ${benefitType} assistance.`,
      ],
    ),
    outputArtifacts: genericArtifacts("benefits-liheap", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// benefits/medicaid
// ---------------------------------------------------------------------------

function buildMedicaidBundle(input: MedicaidInput): WorkflowBundle {
  const fpl = fplForSize(input.householdSize);
  const annualIncome = input.monthlyIncome * 12;
  const incomeAsPctFpl = Math.round((annualIncome / fpl) * 100);
  const isExpansionState = !NON_EXPANSION_STATES.has(input.state);

  // Medicaid income limits vary by category; simplified here
  // Expansion states: 138% FPL for adults. Non-expansion: varies (often ~50-100% for parents, none for childless adults)
  const medicaidLimit = isExpansionState ? 138 : 100;
  const likelyEligible = incomeAsPctFpl <= medicaidLimit;

  // ACA marketplace subsidy threshold: 100-400% FPL
  const suggestAca = !likelyEligible && incomeAsPctFpl <= 400;

  const evidence = [
    buildEvidenceItem("income-verification", "Income verification", true, input.monthlyIncome > 0),
    buildEvidenceItem("identity", "Government-issued photo ID", true, true),
    buildEvidenceItem("disability-docs", "Disability documentation", input.isDisabled, input.isDisabled),
  ];

  const flags: ValidationFlag[] = [];
  if (suggestAca) {
    flags.push(makeFlag("incomeLevel", "review", `Income at ${incomeAsPctFpl}% FPL — above Medicaid limit but may qualify for ACA marketplace subsidies.`));
  }
  if (!isExpansionState && !likelyEligible) {
    flags.push(makeFlag("state", "warning", `${input.state} has not expanded Medicaid. Eligibility is more limited for non-disabled adults without children.`));
  }

  const checks = [
    makeCheck("income-check", "MAGI income within Medicaid limits", likelyEligible, "warning", `Income at ${incomeAsPctFpl}% FPL. Medicaid limit in ${input.state}: ~${medicaidLimit}% FPL.`),
  ];

  const eligibilityLabel = likelyEligible ? "likely" : "unlikely";

  return {
    workflowId: "benefits/medicaid",
    domain: "benefits",
    title: "Medicaid eligibility assessment",
    summary: "MAGI-based Medicaid eligibility review. PigeonGov does not submit applications.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      fpl,
      annualIncome,
      incomeAsPctFpl,
      isExpansionState,
      medicaidLimit,
      likelyEligible,
      suggestAca,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "Medicaid eligibility",
      `${eligibilityLabel}. Income at ${incomeAsPctFpl}% FPL`,
      evidence,
      flags,
      [
        `Household size: ${input.householdSize}. State: ${input.state}.`,
        `Monthly income: ${currency(input.monthlyIncome)}. Annual: ${currency(annualIncome)}.`,
        `Income as % of FPL: ${incomeAsPctFpl}%.`,
        `Expansion state: ${isExpansionState ? "yes" : "no"}. Medicaid limit: ~${medicaidLimit}% FPL.`,
        `Medicaid eligibility: ${eligibilityLabel}. Income at ${incomeAsPctFpl}% FPL.`,
        suggestAca ? "Consider ACA marketplace enrollment — subsidies may be available." : "",
      ].filter(Boolean),
    ),
    outputArtifacts: genericArtifacts("benefits-medicaid", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// benefits/ssdi-application
// ---------------------------------------------------------------------------

function buildSsdiBundle(input: SsdiInput): WorkflowBundle {
  const SGA_LIMIT_2025 = 1_620; // monthly
  const aboveSga = input.monthlyEarnings > SGA_LIMIT_2025;

  const evidence = [
    buildEvidenceItem("medical-records", "Medical records for all conditions", true, input.hasBeenHospitalized),
    buildEvidenceItem("work-history", "Work history (SSA form)", true, true),
    buildEvidenceItem("physician-docs", "Treating physician documentation", true, input.treatingPhysicians.length > 0),
  ];

  const flags: ValidationFlag[] = [
    makeFlag("applicationOutlook", "review", "Most initial SSDI applications are denied — prepare for appeals process."),
  ];
  if (aboveSga) {
    flags.push(makeFlag("monthlyEarnings", "error", `Current monthly earnings of ${currency(input.monthlyEarnings)} exceed the 2025 SGA limit of ${currency(SGA_LIMIT_2025)}.`));
  }

  const checks = [
    makeCheck("sga-check", "Earnings below SGA", !aboveSga, "error", `Monthly earnings must be at or below ${currency(SGA_LIMIT_2025)} (2025 SGA limit).`),
    makeCheck("medical-conditions", "Medical conditions documented", input.medicalConditions.length > 0, "error", "At least one medical condition must be documented."),
    makeCheck("treating-physicians", "Treating physicians identified", input.treatingPhysicians.length > 0, "warning", "At least one treating physician should be identified."),
  ];

  // Five-step evaluation summary
  const fiveStepSummary = [
    `Step 1 — SGA: ${aboveSga ? "FAIL (earnings above SGA)" : "PASS (earnings at or below SGA)"}`,
    `Step 2 — Severity: ${input.medicalConditions.length} condition(s) reported.`,
    "Step 3 — Listings: requires SSA medical review (not assessed here).",
    "Step 4 — Past work: requires vocational analysis (not assessed here).",
    "Step 5 — Other work: requires vocational analysis (not assessed here).",
  ];

  return {
    workflowId: "benefits/ssdi-application",
    domain: "benefits",
    title: "SSDI application intake",
    summary: "SSDI application intake with SGA check and five-step evaluation summary. PigeonGov does not submit claims.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      sgaLimit: SGA_LIMIT_2025,
      aboveSga,
      conditionCount: input.medicalConditions.length,
      physicianCount: input.treatingPhysicians.length,
      fiveStepSummary,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "SSDI application",
      aboveSga ? "SGA exceeded — likely ineligible" : "SGA within limits — further review needed",
      evidence,
      flags,
      [
        `Applicant: ${input.applicantName}.`,
        `Disability onset: ${input.disabilityOnsetDate}. Last worked: ${input.lastWorkDate}.`,
        `Monthly earnings: ${currency(input.monthlyEarnings)}. SGA limit: ${currency(SGA_LIMIT_2025)}.`,
        `Conditions: ${input.medicalConditions.join(", ")}.`,
        `Treating physicians: ${input.treatingPhysicians.join(", ")}.`,
        ...fiveStepSummary,
      ],
    ),
    outputArtifacts: genericArtifacts("benefits-ssdi-application", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// SSI constants (2025)
// ---------------------------------------------------------------------------

/** Federal Benefit Rate 2025 */
const SSI_FBR_INDIVIDUAL = 967;
const SSI_FBR_COUPLE = 1_450;
const SSI_ASSET_LIMIT_INDIVIDUAL = 2_000;
const SSI_ASSET_LIMIT_COUPLE = 3_000;

/** State SSI supplements — many states add to the federal rate.
 *  Values are approximate monthly supplement amounts. */
const SSI_STATE_SUPPLEMENTS: Record<string, { individual: number; couple: number; label: string }> = {
  CA: { individual: 160, couple: 407, label: "California SSP" },
  NY: { individual: 87, couple: 104, label: "New York SSI supplement" },
  MA: { individual: 114, couple: 172, label: "Massachusetts SSI supplement" },
  NJ: { individual: 37, couple: 51, label: "New Jersey SSI supplement" },
  CT: { individual: 267, couple: 381, label: "Connecticut SSI supplement" },
  PA: { individual: 28, couple: 44, label: "Pennsylvania SSI supplement" },
  VT: { individual: 80, couple: 123, label: "Vermont SSI supplement" },
  HI: { individual: 12, couple: 18, label: "Hawaii SSI supplement" },
  WA: { individual: 47, couple: 72, label: "Washington SSI supplement" },
  NV: { individual: 14, couple: 21, label: "Nevada SSI supplement" },
};

function computeCountableIncome(
  earnedMonthly: number,
  unearnedMonthly: number,
): { countableEarned: number; countableUnearned: number; totalCountable: number } {
  // SSI earned income exclusion: first $65 + half remainder
  const countableEarned = Math.max(0, (earnedMonthly - 65) / 2);
  // SSI unearned income exclusion: $20 general exclusion
  const countableUnearned = Math.max(0, unearnedMonthly - 20);
  return {
    countableEarned,
    countableUnearned,
    totalCountable: countableEarned + countableUnearned,
  };
}

// ---------------------------------------------------------------------------
// benefits/ssi
// ---------------------------------------------------------------------------

function buildSsiBundle(input: SsiInput): WorkflowBundle {
  const isCoupleUnit = input.maritalStatus === "married";
  const fbr = isCoupleUnit ? SSI_FBR_COUPLE : SSI_FBR_INDIVIDUAL;
  const assetLimit = isCoupleUnit ? SSI_ASSET_LIMIT_COUPLE : SSI_ASSET_LIMIT_INDIVIDUAL;

  // Categorical eligibility: age 65+ OR blind OR disabled
  const categoricallyEligible = input.age >= 65 || input.isBlind || input.isDisabled;

  // Asset test
  const assetsPass = input.countableAssets <= assetLimit;

  // Income test
  const { countableEarned, countableUnearned, totalCountable } = computeCountableIncome(
    input.monthlyEarnedIncome,
    input.monthlyUnearnedIncome,
  );
  const incomePass = totalCountable < fbr;

  // Estimated monthly SSI payment
  const estimatedPayment = Math.max(0, Math.round(fbr - totalCountable));

  // State supplement
  const stateSupplement = SSI_STATE_SUPPLEMENTS[input.state.toUpperCase()];
  const supplementAmount = stateSupplement
    ? (isCoupleUnit ? stateSupplement.couple : stateSupplement.individual)
    : 0;
  const totalEstimatedMonthly = estimatedPayment + supplementAmount;

  // Living arrangement reduction (Value of the Third, or VTR)
  const livingReduction =
    input.livingArrangement === "others_household"
      ? Math.round(fbr / 3)
      : input.livingArrangement === "institution"
        ? Math.max(0, fbr - 30) // Institutional rate: $30/month
        : 0;
  const adjustedPayment = Math.max(0, totalEstimatedMonthly - livingReduction);

  // Immediate Medicaid in most states
  const immediatelMedicaid = input.state.toUpperCase() !== "CT" &&
    input.state.toUpperCase() !== "HI" &&
    input.state.toUpperCase() !== "MN" &&
    input.state.toUpperCase() !== "ND" &&
    input.state.toUpperCase() !== "OK";

  // Evidence checklist
  const evidence = [
    buildEvidenceItem("identity", "Government-issued photo ID", true, true),
    buildEvidenceItem("ssn-proof", "Social Security card or SSN verification", true, true),
    buildEvidenceItem("medical-records", "Medical records (if claiming disability)", input.isDisabled, input.isDisabled),
    buildEvidenceItem("vision-records", "Vision exam records (if claiming blindness)", input.isBlind, input.isBlind),
    buildEvidenceItem("financial-statements", "Bank statements and financial records", true, input.countableAssets > 0),
    buildEvidenceItem("income-proof", "Income documentation (pay stubs, benefits letters)", true, input.monthlyEarnedIncome > 0 || input.monthlyUnearnedIncome > 0),
    buildEvidenceItem("living-arrangement", "Proof of living arrangement (lease, mortgage, letter)", true, input.livingArrangement !== "own_household"),
    buildEvidenceItem("birth-certificate", "Birth certificate or proof of age", input.age >= 65, input.age >= 65),
  ];

  const flags: ValidationFlag[] = [];
  if (!categoricallyEligible) {
    flags.push(makeFlag("categoricalEligibility", "error", "SSI requires age 65+, blindness, or disability. None of these criteria are met."));
  }
  if (!assetsPass) {
    flags.push(makeFlag("countableAssets", "error", `Countable assets of ${currency(input.countableAssets)} exceed the ${currency(assetLimit)} limit for ${isCoupleUnit ? "couples" : "individuals"}.`));
  }
  if (!incomePass) {
    flags.push(makeFlag("income", "error", `Countable income of ${currency(totalCountable)}/month exceeds the FBR of ${currency(fbr)}/month.`));
  }
  if (input.livingArrangement === "institution") {
    flags.push(makeFlag("livingArrangement", "review", "Institutional living reduces SSI to $30/month. Medicaid typically covers institutional care costs."));
  }
  if (input.livingArrangement === "others_household") {
    flags.push(makeFlag("livingArrangement", "review", "Living in another's household reduces SSI by one-third of the FBR."));
  }
  if (input.receivingSSA) {
    flags.push(makeFlag("receivingSSA", "review", "Other SSA benefits (e.g. Social Security retirement) count as unearned income and reduce SSI dollar-for-dollar after the $20 exclusion."));
  }
  if (stateSupplement) {
    flags.push(makeFlag("stateSupplement", "review", `${input.state.toUpperCase()} provides a state SSI supplement (${stateSupplement.label}): approximately ${currency(isCoupleUnit ? stateSupplement.couple : stateSupplement.individual)}/month.`));
  }
  if (immediatelMedicaid && categoricallyEligible && assetsPass && incomePass) {
    flags.push(makeFlag("medicaid", "review", "SSI recipients in most states are automatically eligible for Medicaid — no separate application needed."));
  }

  const checks = [
    makeCheck("categorical", "Categorical eligibility (65+, blind, or disabled)", categoricallyEligible, "error", "Must be age 65+, blind, or disabled."),
    makeCheck("assets", `Assets under ${currency(assetLimit)}`, assetsPass, "error", `Countable assets must be at or below ${currency(assetLimit)}.`),
    makeCheck("income", "Income below FBR", incomePass, "error", `Countable income must be below the FBR of ${currency(fbr)}/month.`),
  ];

  const eligible = categoricallyEligible && assetsPass && incomePass;
  const readiness = eligible ? "likely eligible" : "may not qualify";

  return {
    workflowId: "benefits/ssi",
    domain: "benefits",
    title: "SSI eligibility assessment",
    summary: "Supplemental Security Income eligibility assessment with income exclusion calculations. PigeonGov does not submit applications.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      fbr,
      assetLimit,
      categoricallyEligible,
      assetsPass,
      incomePass,
      countableEarned,
      countableUnearned,
      totalCountable,
      estimatedFederalPayment: estimatedPayment,
      stateSupplement: supplementAmount,
      livingReduction,
      estimatedMonthlyPayment: adjustedPayment,
      immediatelMedicaid,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "SSI eligibility",
      readiness,
      evidence,
      flags,
      [
        `Applicant: ${input.applicantName || "(not provided)"}. Age: ${input.age}. Marital status: ${input.maritalStatus}.`,
        `Categorical eligibility: ${categoricallyEligible ? "PASS" : "FAIL"} (${[input.age >= 65 ? "age 65+" : "", input.isBlind ? "blind" : "", input.isDisabled ? "disabled" : ""].filter(Boolean).join(", ") || "none"}).`,
        `Asset test: ${assetsPass ? "PASS" : "FAIL"}. Assets: ${currency(input.countableAssets)}. Limit: ${currency(assetLimit)}.`,
        `Earned income: ${currency(input.monthlyEarnedIncome)}/mo. Countable after exclusions: ${currency(countableEarned)}/mo.`,
        `Unearned income: ${currency(input.monthlyUnearnedIncome)}/mo. Countable after exclusions: ${currency(countableUnearned)}/mo.`,
        `Total countable income: ${currency(totalCountable)}/mo. FBR: ${currency(fbr)}/mo.`,
        `Estimated federal SSI payment: ${currency(estimatedPayment)}/mo.`,
        stateSupplement ? `State supplement (${stateSupplement.label}): ${currency(supplementAmount)}/mo.` : "",
        livingReduction > 0 ? `Living arrangement reduction: -${currency(livingReduction)}/mo.` : "",
        `Estimated total monthly payment: ${currency(adjustedPayment)}/mo.`,
        immediatelMedicaid && eligible ? "Automatic Medicaid eligibility in this state." : "",
      ].filter(Boolean),
    ),
    outputArtifacts: genericArtifacts("benefits-ssi", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// TANF constants and state benefit lookup
// ---------------------------------------------------------------------------

/** TANF maximum monthly benefits for top-10 states (family of 3, 2025 approx).
 *  All others use a federal average. */
const TANF_STATE_MAX_BENEFITS: Record<string, number> = {
  CA: 878,
  NY: 789,
  MA: 633,
  CT: 698,
  NH: 1_086,
  WA: 621,
  VT: 699,
  MN: 532,
  WI: 653,
  MD: 727,
};

const TANF_FEDERAL_AVERAGE = 492; // Approximate national average TANF max for family of 3

/** TANF asset limits by state (approximate). Most states are $2,000-$3,000;
 *  some have eliminated asset tests entirely. */
const TANF_STATE_ASSET_LIMITS: Record<string, number | null> = {
  CA: null,   // No asset test
  NY: 2_000,
  TX: 1_000,
  FL: 2_000,
  OH: null,   // No asset test
  IL: null,   // No asset test
  VA: null,   // No asset test
  AL: 2_000,
  LA: 2_000,
  CO: null,   // No asset test
};

const TANF_DEFAULT_ASSET_LIMIT = 2_000;
const TANF_FEDERAL_TIME_LIMIT = 60; // months

function getTanfMaxBenefit(state: string): number {
  return TANF_STATE_MAX_BENEFITS[state.toUpperCase()] ?? TANF_FEDERAL_AVERAGE;
}

function getTanfAssetLimit(state: string): number | null {
  const upper = state.toUpperCase();
  if (upper in TANF_STATE_ASSET_LIMITS) {
    return TANF_STATE_ASSET_LIMITS[upper]!;
  }
  return TANF_DEFAULT_ASSET_LIMIT;
}

// ---------------------------------------------------------------------------
// benefits/tanf
// ---------------------------------------------------------------------------

function buildTanfBundle(input: TanfInput): WorkflowBundle {
  const fpl = fplForSize(input.householdSize);
  const monthlyFpl = fpl / 12;

  // Has children test
  const hasChildren = input.numberOfChildren > 0;

  // Income test: typically 50% FPL for initial eligibility
  const incomeThreshold50 = monthlyFpl * 0.5;
  const incomePass = input.monthlyGrossIncome <= incomeThreshold50;

  // Asset test (state-dependent)
  const stateAssetLimit = getTanfAssetLimit(input.state);
  const assetsPass = stateAssetLimit === null || input.countableAssets <= stateAssetLimit;

  // Time limit
  const monthsRemaining = Math.max(0, TANF_FEDERAL_TIME_LIMIT - input.monthsReceived);
  const timeLimitExhausted = monthsRemaining <= 0;

  // Citizenship
  const citizenshipPass = input.citizenshipStatus !== "other";

  // Estimated benefit
  const maxBenefit = getTanfMaxBenefit(input.state);
  // Benefit reduces roughly by income: simplified model
  const incomeReduction = Math.round(input.monthlyGrossIncome * 0.5);
  const estimatedBenefit = Math.max(0, maxBenefit - incomeReduction);

  // Work requirements
  const workRequirementApplies = input.monthsReceived >= 24 && input.youngestChildAge >= 1;
  const workHoursNeeded = input.youngestChildAge < 6 ? 20 : 30;

  // Categorical eligibility triggers
  const triggersSNAP = hasChildren && incomePass;
  const triggersMedicaid = hasChildren && incomePass;

  const evidence = [
    buildEvidenceItem("identity", "Government-issued photo ID", true, true),
    buildEvidenceItem("income-verification", "Income verification (pay stubs, tax return)", true, input.monthlyGrossIncome > 0),
    buildEvidenceItem("children-proof", "Birth certificates or custody documents for children", hasChildren, hasChildren),
    buildEvidenceItem("citizenship-docs", "Citizenship or immigration status documentation", true, input.citizenshipStatus === "us_citizen"),
    buildEvidenceItem("asset-docs", "Bank statements and financial records", stateAssetLimit !== null, input.countableAssets > 0),
    buildEvidenceItem("residency", "Proof of state residency", true, true),
    buildEvidenceItem("employment-docs", "Employment verification or job search records", input.isEmployed || workRequirementApplies, input.isEmployed),
  ];

  const flags: ValidationFlag[] = [];
  if (!hasChildren) {
    flags.push(makeFlag("numberOfChildren", "error", "TANF requires at least one dependent child under 18 in the household."));
  }
  if (!incomePass) {
    flags.push(makeFlag("monthlyGrossIncome", "error", `Monthly income ${currency(input.monthlyGrossIncome)} exceeds approximately 50% FPL threshold of ${currency(incomeThreshold50)}/month.`));
  }
  if (!assetsPass) {
    flags.push(makeFlag("countableAssets", "error", `Countable assets ${currency(input.countableAssets)} exceed ${input.state.toUpperCase()} limit of ${currency(stateAssetLimit!)}.`));
  }
  if (timeLimitExhausted) {
    flags.push(makeFlag("monthsReceived", "error", `Federal 60-month lifetime limit exhausted (${input.monthsReceived} months received). Some states offer extensions.`));
  } else if (monthsRemaining <= 12) {
    flags.push(makeFlag("monthsReceived", "warning", `Only ${monthsRemaining} month(s) remaining of the 60-month federal lifetime limit.`));
  }
  if (input.citizenshipStatus === "other") {
    flags.push(makeFlag("citizenshipStatus", "error", "TANF generally requires US citizenship or qualified alien status (5-year waiting period for most qualified aliens)."));
  }
  if (workRequirementApplies) {
    flags.push(makeFlag("workRequirement", "review", `Work requirement applies: ${workHoursNeeded} hours/week of work activity required after 24 months.`));
  }
  if (triggersSNAP) {
    flags.push(makeFlag("snapEligibility", "review", "TANF receipt categorically qualifies your household for SNAP benefits."));
  }
  if (triggersMedicaid) {
    flags.push(makeFlag("medicaidEligibility", "review", "TANF families often qualify for Medicaid — check your state's automatic enrollment rules."));
  }

  const checks = [
    makeCheck("has-children", "Has dependent children", hasChildren, "error", "Must have at least one child under 18."),
    makeCheck("income-test", "Income below ~50% FPL", incomePass, "error", `Monthly income must be at or below ~${currency(incomeThreshold50)}.`),
    makeCheck("asset-test", "Assets within state limit", assetsPass, "error", stateAssetLimit !== null ? `Assets must be at or below ${currency(stateAssetLimit)}.` : "No asset test in this state."),
    makeCheck("time-limit", "Within 60-month federal limit", !timeLimitExhausted, "error", `${monthsRemaining} months remaining of 60-month limit.`),
    makeCheck("citizenship", "Citizenship/immigration status", citizenshipPass, "error", "Must be US citizen or qualified alien."),
  ];

  const eligible = hasChildren && incomePass && assetsPass && !timeLimitExhausted && citizenshipPass;
  const readiness = eligible ? "likely eligible" : "may not qualify";

  return {
    workflowId: "benefits/tanf",
    domain: "benefits",
    title: "TANF cash assistance eligibility",
    summary: "TANF eligibility assessment with state-specific benefit estimation. PigeonGov does not submit applications.",
    applicant: undefined,
    household: [],
    evidence,
    answers: input as unknown as Record<string, unknown>,
    derived: {
      fpl,
      incomeThreshold50,
      incomePass,
      hasChildren,
      assetsPass,
      stateAssetLimit,
      monthsRemaining,
      timeLimitExhausted,
      workRequirementApplies,
      workHoursNeeded,
      maxBenefit,
      estimatedMonthlyBenefit: estimatedBenefit,
      triggersSNAP,
      triggersMedicaid,
    },
    validation: { checks, flaggedFields: flags },
    review: buildGenericSummary(
      "TANF eligibility",
      readiness,
      evidence,
      flags,
      [
        `Applicant: ${input.applicantName || "(not provided)"}. State: ${input.state}. Household size: ${input.householdSize}.`,
        `Children: ${input.numberOfChildren}. Youngest child age: ${input.youngestChildAge}.`,
        `Monthly gross income: ${currency(input.monthlyGrossIncome)}. ~50% FPL threshold: ${currency(incomeThreshold50)}.`,
        stateAssetLimit !== null
          ? `Assets: ${currency(input.countableAssets)}. State limit: ${currency(stateAssetLimit)}.`
          : `Assets: ${currency(input.countableAssets)}. ${input.state.toUpperCase()} has no asset test.`,
        `Federal time limit: ${input.monthsReceived}/${TANF_FEDERAL_TIME_LIMIT} months used. ${monthsRemaining} months remaining.`,
        `Estimated monthly benefit: ${currency(estimatedBenefit)} (state max: ${currency(maxBenefit)}).`,
        workRequirementApplies ? `Work requirement: ${workHoursNeeded} hours/week after 24 months.` : "",
        triggersSNAP ? "TANF receipt categorically qualifies for SNAP." : "",
        triggersMedicaid ? "TANF families often qualify for Medicaid." : "",
      ].filter(Boolean),
    ),
    outputArtifacts: genericArtifacts("benefits-tanf", evidence),
    provenance: ["workflow-registry"],
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const benefitsWorkflows = {
  "benefits/snap": {
    summary: {
      id: "benefits/snap",
      domain: "benefits",
      title: "SNAP benefits eligibility",
      summary: "Assess SNAP (food stamps) eligibility using FPL-based income tests and estimate monthly benefits.",
      status: "active",
      audience: "household",
      tags: ["snap", "food-stamps", "benefits", "fpl", "nutrition"],
    },
    inputSchema: snapInputSchema,
    starterData: {
      householdSize: 1,
      monthlyGrossIncome: 0,
      monthlyNetIncome: 0,
      state: "CA",
      citizenshipStatus: "us_citizen",
      receivingTanf: false,
      receivingSsi: false,
      hasAssets: false,
      assetValue: 0,
      hasVehicle: false,
    } satisfies SnapInput,
    sections: [
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "householdSize", label: "Household size", type: "number" },
          { key: "state", label: "State", type: "text" },
          {
            key: "citizenshipStatus",
            label: "Citizenship status",
            type: "select",
            options: [
              { label: "US citizen", value: "us_citizen" },
              { label: "Permanent resident", value: "permanent_resident" },
              { label: "Qualified alien", value: "qualified_alien" },
              { label: "Other", value: "other" },
            ],
          },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "monthlyGrossIncome", label: "Monthly gross income", type: "currency" },
          { key: "monthlyNetIncome", label: "Monthly net income", type: "currency" },
        ],
      },
      {
        id: "assets",
        title: "Assets",
        fields: [
          { key: "hasAssets", label: "Has countable assets", type: "confirm" },
          { key: "assetValue", label: "Total asset value", type: "currency" },
          { key: "hasVehicle", label: "Has vehicle", type: "confirm" },
        ],
      },
      {
        id: "eligibility-factors",
        title: "Eligibility Factors",
        fields: [
          { key: "receivingTanf", label: "Currently receiving TANF", type: "confirm" },
          { key: "receivingSsi", label: "Currently receiving SSI", type: "confirm" },
        ],
      },
    ],
    buildBundle: buildSnapBundle,
  } satisfies WorkflowDefinition<SnapInput>,

  "benefits/section8": {
    summary: {
      id: "benefits/section8",
      domain: "benefits",
      title: "Section 8 Housing Choice Voucher",
      summary: "Assess Section 8 housing voucher eligibility based on income and area median income limits.",
      status: "active",
      audience: "household",
      tags: ["section-8", "housing", "voucher", "hud", "benefits"],
    },
    inputSchema: section8InputSchema,
    starterData: {
      householdSize: 1,
      annualIncome: 0,
      state: "CA",
      county: "",
      currentHousingCost: 0,
      isDisabled: false,
      isElderly: false,
      isVeteran: false,
    } satisfies Section8Input,
    sections: [
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "householdSize", label: "Household size", type: "number" },
          { key: "state", label: "State", type: "text" },
          { key: "county", label: "County", type: "text" },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "annualIncome", label: "Annual household income", type: "currency" },
        ],
      },
      {
        id: "housing",
        title: "Housing",
        fields: [
          { key: "currentHousingCost", label: "Current monthly housing cost", type: "currency" },
          { key: "isDisabled", label: "Disabled household member", type: "confirm" },
          { key: "isElderly", label: "Elderly household member (62+)", type: "confirm" },
          { key: "isVeteran", label: "Veteran", type: "confirm" },
        ],
      },
    ],
    buildBundle: buildSection8Bundle,
  } satisfies WorkflowDefinition<Section8Input>,

  "benefits/wic": {
    summary: {
      id: "benefits/wic",
      domain: "benefits",
      title: "WIC program eligibility",
      summary: "Assess WIC eligibility for women, infants, and children based on income and program enrollment.",
      status: "active",
      audience: "household",
      tags: ["wic", "nutrition", "women", "infants", "children", "benefits"],
    },
    inputSchema: wicInputSchema,
    starterData: {
      applicantCategory: "child",
      householdSize: 1,
      annualIncome: 0,
      receivingMedicaid: false,
      receivingSnap: false,
      receivingTanf: false,
    } satisfies WicInput,
    sections: [
      {
        id: "category",
        title: "Category",
        fields: [
          {
            key: "applicantCategory",
            label: "Applicant category",
            type: "select",
            options: [
              { label: "Pregnant", value: "pregnant" },
              { label: "Postpartum", value: "postpartum" },
              { label: "Infant (under 1)", value: "infant" },
              { label: "Child (1-4)", value: "child" },
            ],
          },
          { key: "applicantAge", label: "Applicant age (if child)", type: "number" },
        ],
      },
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "householdSize", label: "Household size", type: "number" },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "annualIncome", label: "Annual household income", type: "currency" },
          { key: "receivingMedicaid", label: "Currently receiving Medicaid", type: "confirm" },
          { key: "receivingSnap", label: "Currently receiving SNAP", type: "confirm" },
          { key: "receivingTanf", label: "Currently receiving TANF", type: "confirm" },
        ],
      },
    ],
    buildBundle: buildWicBundle,
  } satisfies WorkflowDefinition<WicInput>,

  "benefits/liheap": {
    summary: {
      id: "benefits/liheap",
      domain: "benefits",
      title: "LIHEAP energy assistance",
      summary: "Assess LIHEAP eligibility for home energy assistance based on income and utility needs.",
      status: "active",
      audience: "household",
      tags: ["liheap", "energy", "utility", "heating", "cooling", "benefits"],
    },
    inputSchema: liheapInputSchema,
    starterData: {
      householdSize: 1,
      annualIncome: 0,
      state: "CA",
      heatingSource: "",
      hasUtilityShutoffNotice: false,
      season: "winter",
    } satisfies LiheapInput,
    sections: [
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "householdSize", label: "Household size", type: "number" },
          { key: "state", label: "State", type: "text" },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "annualIncome", label: "Annual household income", type: "currency" },
        ],
      },
      {
        id: "utility",
        title: "Utility Information",
        fields: [
          { key: "heatingSource", label: "Primary heating source", type: "text" },
          { key: "hasUtilityShutoffNotice", label: "Has utility shutoff notice", type: "confirm" },
          {
            key: "season",
            label: "Assistance season",
            type: "select",
            options: [
              { label: "Winter (heating)", value: "winter" },
              { label: "Summer (cooling)", value: "summer" },
            ],
          },
        ],
      },
    ],
    buildBundle: buildLiheapBundle,
  } satisfies WorkflowDefinition<LiheapInput>,

  "benefits/medicaid": {
    summary: {
      id: "benefits/medicaid",
      domain: "benefits",
      title: "Medicaid eligibility assessment",
      summary: "MAGI-based Medicaid eligibility review with expansion state awareness and ACA marketplace guidance.",
      status: "active",
      audience: "household",
      tags: ["medicaid", "healthcare", "fpl", "magi", "benefits", "aca"],
    },
    inputSchema: medicaidInputSchema,
    starterData: {
      householdSize: 1,
      monthlyIncome: 0,
      state: "CA",
      isPregnant: false,
      hasChildren: false,
      isDisabled: false,
      isElderly: false,
      currentInsurance: "none",
    } satisfies MedicaidInput,
    sections: [
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "householdSize", label: "Household size", type: "number" },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "monthlyIncome", label: "Monthly household income", type: "currency" },
        ],
      },
      {
        id: "health-status",
        title: "Health Status",
        fields: [
          { key: "isPregnant", label: "Currently pregnant", type: "confirm" },
          { key: "hasChildren", label: "Has dependent children", type: "confirm" },
          { key: "isDisabled", label: "Disabled", type: "confirm" },
          { key: "isElderly", label: "Age 65 or older", type: "confirm" },
          { key: "currentInsurance", label: "Current insurance", type: "text" },
        ],
      },
      {
        id: "state",
        title: "State",
        fields: [
          { key: "state", label: "State of residence", type: "text" },
        ],
      },
    ],
    buildBundle: buildMedicaidBundle,
  } satisfies WorkflowDefinition<MedicaidInput>,

  "benefits/ssdi-application": {
    summary: {
      id: "benefits/ssdi-application",
      domain: "benefits",
      title: "SSDI application intake",
      summary: "SSDI application intake with SGA screening, five-step evaluation overview, and evidence checklist.",
      status: "active",
      audience: "individual",
      tags: ["ssdi", "disability", "ssa", "benefits", "social-security"],
    },
    inputSchema: ssdiInputSchema,
    starterData: {
      applicantName: "",
      disabilityOnsetDate: "",
      lastWorkDate: "",
      monthlyEarnings: 0,
      medicalConditions: [],
      treatingPhysicians: [],
      hasBeenHospitalized: false,
    } satisfies SsdiInput,
    sections: [
      {
        id: "work-history",
        title: "Work History",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "lastWorkDate", label: "Last date worked", type: "date" },
          { key: "monthlyEarnings", label: "Current monthly earnings", type: "currency" },
        ],
      },
      {
        id: "disability-info",
        title: "Disability Information",
        fields: [
          { key: "disabilityOnsetDate", label: "Disability onset date", type: "date" },
          { key: "hasBeenHospitalized", label: "Has been hospitalized", type: "confirm" },
        ],
      },
      {
        id: "medical-evidence",
        title: "Medical Evidence",
        description: "List all medical conditions and treating physicians.",
        fields: [],
      },
    ],
    buildBundle: buildSsdiBundle,
  } satisfies WorkflowDefinition<SsdiInput>,

  "benefits/ssi": {
    summary: {
      id: "benefits/ssi",
      domain: "benefits",
      title: "SSI eligibility assessment",
      summary: "Supplemental Security Income eligibility with income exclusion calculations, asset testing, and state supplement information.",
      status: "active",
      audience: "individual",
      tags: ["ssi", "supplemental-security-income", "disability", "elderly", "benefits", "ssa"],
    },
    inputSchema: ssiInputSchema,
    starterData: {
      applicantName: "",
      age: 0,
      isBlind: false,
      isDisabled: false,
      maritalStatus: "single",
      countableAssets: 0,
      monthlyEarnedIncome: 0,
      monthlyUnearnedIncome: 0,
      state: "CA",
      receivingSSA: false,
      livingArrangement: "own_household",
    } satisfies SsiInput,
    sections: [
      {
        id: "applicant",
        title: "Applicant",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "age", label: "Age", type: "number" },
          {
            key: "maritalStatus",
            label: "Marital status",
            type: "select",
            options: [
              { label: "Single", value: "single" },
              { label: "Married", value: "married" },
            ],
          },
          { key: "state", label: "State", type: "text" },
        ],
      },
      {
        id: "disability",
        title: "Disability / Blindness",
        fields: [
          { key: "isDisabled", label: "Has a qualifying disability", type: "confirm" },
          { key: "isBlind", label: "Is legally blind", type: "confirm" },
        ],
      },
      {
        id: "income",
        title: "Monthly Income",
        fields: [
          { key: "monthlyEarnedIncome", label: "Monthly earned income (wages)", type: "currency" },
          { key: "monthlyUnearnedIncome", label: "Monthly unearned income (SSA, pensions, etc.)", type: "currency" },
          { key: "receivingSSA", label: "Receiving other Social Security benefits", type: "confirm" },
        ],
      },
      {
        id: "assets",
        title: "Assets",
        fields: [
          { key: "countableAssets", label: "Total countable assets", type: "currency", helpText: "Exclude primary home, one vehicle, burial funds up to $1,500" },
        ],
      },
      {
        id: "living",
        title: "Living Arrangement",
        fields: [
          {
            key: "livingArrangement",
            label: "Living arrangement",
            type: "select",
            options: [
              { label: "Own household", value: "own_household" },
              { label: "Living in another's household", value: "others_household" },
              { label: "Institution (nursing home, etc.)", value: "institution" },
            ],
          },
        ],
      },
    ],
    buildBundle: buildSsiBundle,
  } satisfies WorkflowDefinition<SsiInput>,

  "benefits/tanf": {
    summary: {
      id: "benefits/tanf",
      domain: "benefits",
      title: "TANF cash assistance eligibility",
      summary: "TANF eligibility assessment with state-specific benefit estimation, time limit tracking, and cross-program triggers.",
      status: "active",
      audience: "household",
      tags: ["tanf", "cash-assistance", "welfare", "families", "children", "benefits"],
    },
    inputSchema: tanfInputSchema,
    starterData: {
      applicantName: "",
      state: "CA",
      householdSize: 1,
      numberOfChildren: 0,
      youngestChildAge: 0,
      monthlyGrossIncome: 0,
      countableAssets: 0,
      monthsReceived: 0,
      isEmployed: false,
      citizenshipStatus: "us_citizen",
    } satisfies TanfInput,
    sections: [
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "applicantName", label: "Applicant name", type: "text" },
          { key: "state", label: "State", type: "text" },
          { key: "householdSize", label: "Household size", type: "number" },
          { key: "numberOfChildren", label: "Number of children under 18", type: "number" },
          { key: "youngestChildAge", label: "Age of youngest child", type: "number" },
        ],
      },
      {
        id: "income",
        title: "Income & Assets",
        fields: [
          { key: "monthlyGrossIncome", label: "Monthly gross income", type: "currency" },
          { key: "countableAssets", label: "Countable assets", type: "currency" },
          { key: "isEmployed", label: "Currently employed", type: "confirm" },
        ],
      },
      {
        id: "history",
        title: "TANF History",
        fields: [
          { key: "monthsReceived", label: "Months of TANF already received", type: "number", helpText: "Federal lifetime limit is 60 months" },
        ],
      },
      {
        id: "citizenship",
        title: "Citizenship",
        fields: [
          {
            key: "citizenshipStatus",
            label: "Citizenship status",
            type: "select",
            options: [
              { label: "US citizen", value: "us_citizen" },
              { label: "Permanent resident", value: "permanent_resident" },
              { label: "Qualified alien", value: "qualified_alien" },
              { label: "Other", value: "other" },
            ],
          },
        ],
      },
    ],
    buildBundle: buildTanfBundle,
  } satisfies WorkflowDefinition<TanfInput>,
} as const;
