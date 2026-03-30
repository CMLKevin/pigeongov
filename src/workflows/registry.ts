import { z } from "zod";

import { buildReturnBundle } from "../engine/field-mapper.js";
import { calculateFederalTax } from "../engine/tax-calculator.js";
import { validateReturnBundle } from "../engine/validator.js";
import type {
  PersonIdentity,
  ReviewSummary,
  ValidationCheck,
  ValidationFlag,
  WorkflowArtifact,
  WorkflowBundle,
  WorkflowDefinitionSummary,
  WorkflowDomain,
  WorkflowEvidenceItem,
  WorkflowQuestionSection,
} from "../types.js";

const stateSchema = z.string().trim().regex(/^[A-Z]{2}$/);

const addressSchema = z
  .object({
    street1: z.string().trim().min(1),
    street2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: stateSchema,
    zipCode: z.string().trim().min(5),
  })
  .strict();

const identitySchema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    ssn: z.string().trim().regex(/^\d{3}-\d{2}-\d{4}$/).default("000-00-0000"),
    address: addressSchema,
  })
  .strict();

const householdMemberSchema = z
  .object({
    name: z.string().trim().min(1),
    relationship: z.string().trim().min(1),
    age: z.coerce.number().int().nonnegative().optional(),
    notes: z.string().trim().optional(),
  })
  .strict();

const taxDependentSchema = z
  .object({
    name: z.string().trim().min(1),
    ssn: z.string().trim().regex(/^\d{3}-\d{2}-\d{4}$/),
    relationship: z.string().trim().min(1),
    childTaxCreditEligible: z.boolean(),
    eitcEligible: z.boolean().optional(),
  })
  .strict();

const taxInputSchema = z
  .object({
    taxpayer: identitySchema,
    spouse: identitySchema.optional(),
    dependents: z.array(taxDependentSchema).default([]),
    filingStatus: z.enum([
      "single",
      "married_filing_jointly",
      "married_filing_separately",
      "head_of_household",
      "qualifying_surviving_spouse",
    ]),
    wages: z.coerce.number().default(0),
    taxableInterest: z.coerce.number().default(0),
    ordinaryDividends: z.coerce.number().default(0),
    scheduleCNet: z.coerce.number().default(0),
    otherIncome: z.coerce.number().default(0),
    adjustments: z
      .object({
        educatorExpenses: z.coerce.number().default(0),
        hsaDeduction: z.coerce.number().default(0),
        selfEmploymentTaxDeduction: z.coerce.number().default(0),
        iraDeduction: z.coerce.number().default(0),
        studentLoanInterest: z.coerce.number().default(0),
      })
      .strict()
      .default({
        educatorExpenses: 0,
        hsaDeduction: 0,
        selfEmploymentTaxDeduction: 0,
        iraDeduction: 0,
        studentLoanInterest: 0,
      }),
    useItemizedDeductions: z.boolean().default(false),
    itemizedDeductions: z.coerce.number().default(0),
    federalWithheld: z.coerce.number().default(0),
    estimatedPayments: z.coerce.number().default(0),
  })
  .strict();

const immigrationInputSchema = z
  .object({
    applicant: identitySchema,
    beneficiary: z
      .object({
        fullName: z.string().trim().min(1),
        relationship: z.string().trim().min(1),
        currentCountry: z.string().trim().min(1),
        currentlyInUnitedStates: z.boolean().default(false),
      })
      .strict(),
    household: z.array(householdMemberSchema).default([]),
    visaGoal: z.enum(["family", "fiance", "employment", "adjustment"]).default("family"),
    petitionerStatus: z.enum(["uscitizen", "permanent_resident", "employer", "other"]),
    hasPassportCopy: z.boolean().default(false),
    hasBirthCertificate: z.boolean().default(false),
    hasRelationshipEvidence: z.boolean().default(false),
    hasFinancialSponsor: z.boolean().default(false),
    priorVisaDenials: z.boolean().default(false),
    needsTranslation: z.boolean().default(false),
    workAuthorizationRequested: z.boolean().default(false),
    notes: z.string().trim().optional(),
  })
  .strict();

const healthcareInputSchema = z
  .object({
    applicant: identitySchema,
    household: z.array(householdMemberSchema).default([]),
    stateOfResidence: stateSchema,
    annualHouseholdIncome: z.coerce.number().nonnegative(),
    currentlyInsured: z.boolean().default(false),
    qualifyingLifeEvent: z.boolean().default(false),
    hasEmployerCoverageOffer: z.boolean().default(false),
    needsDependentCoverage: z.boolean().default(false),
    immigrationDocumentsAvailable: z.boolean().default(true),
    incomeProofAvailable: z.boolean().default(false),
    residenceProofAvailable: z.boolean().default(false),
    preferredCoverageMonth: z.string().trim().min(1),
    notes: z.string().trim().optional(),
  })
  .strict();

const unemploymentInputSchema = z
  .object({
    applicant: identitySchema,
    stateOfClaim: stateSchema,
    lastEmployerName: z.string().trim().min(1),
    lastDayWorked: z.string().trim().min(1),
    separationReason: z.enum(["laid_off", "hours_reduced", "fired", "quit", "seasonal_end"]),
    wagesLast12Months: z.coerce.number().nonnegative(),
    receivingSeverance: z.boolean().default(false),
    availableForWork: z.boolean().default(true),
    identityProofAvailable: z.boolean().default(false),
    wageProofAvailable: z.boolean().default(false),
    separationNoticeAvailable: z.boolean().default(false),
    notes: z.string().trim().optional(),
  })
  .strict();

const planningInputSchema = z
  .object({
    applicant: identitySchema,
    entityName: z.string().trim().min(1),
    state: stateSchema,
    locality: z.string().trim().min(1),
    industry: z.string().trim().min(1),
    needsProfessionalLicense: z.boolean().default(false),
    hasZoningQuestions: z.boolean().default(false),
    notes: z.string().trim().optional(),
  })
  .strict();

export type TaxWorkflowInput = z.infer<typeof taxInputSchema>;
export type ImmigrationWorkflowInput = z.infer<typeof immigrationInputSchema>;
export type HealthcareWorkflowInput = z.infer<typeof healthcareInputSchema>;
export type UnemploymentWorkflowInput = z.infer<typeof unemploymentInputSchema>;
export type PlanningWorkflowInput = z.infer<typeof planningInputSchema>;

export interface WorkflowDefinition<TInput> {
  summary: WorkflowDefinitionSummary;
  inputSchema: z.ZodType<TInput>;
  starterData: TInput;
  sections: WorkflowQuestionSection[];
  buildBundle: (input: TInput) => WorkflowBundle;
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function slugifyWorkflowId(workflowId: string): string {
  return workflowId.replace(/[^\w]+/g, "-");
}

function makeCheck(
  id: string,
  label: string,
  passed: boolean,
  severity: "warning" | "error",
  message: string,
): ValidationCheck {
  return { id, label, passed, severity, message };
}

function makeFlag(
  field: string,
  severity: "warning" | "error" | "review",
  message: string,
  source = "workflow",
): ValidationFlag {
  return { field, severity, message, source };
}

function buildEvidenceItem(
  id: string,
  label: string,
  required: boolean,
  provided: boolean,
  reviewNote?: string,
): WorkflowEvidenceItem {
  if (reviewNote) {
    return {
      id,
      label,
      required,
      status: "review",
      notes: reviewNote,
      source: "user-input",
    };
  }

  return {
    id,
    label,
    required,
    status: provided ? "provided" : "missing",
    source: "user-input",
  };
}

function buildGenericSummary(
  title: string,
  readinessLabel: string,
  evidence: WorkflowEvidenceItem[],
  flags: ValidationFlag[],
  notes: string[],
): ReviewSummary {
  const complete = evidence.filter((item) => item.status === "provided").length;
  return {
    headline: `${title}: ${readinessLabel} (${complete}/${evidence.length} evidence items ready)`,
    notes,
    flaggedFields: flags,
  };
}

function genericArtifacts(workflowId: string, evidence: WorkflowEvidenceItem[]): WorkflowArtifact[] {
  return [
    {
      kind: "bundle",
      label: "Workflow bundle JSON",
      format: "json",
      path: `${slugifyWorkflowId(workflowId)}-bundle.json`,
    },
    {
      kind: "review",
      label: "Review PDF",
      format: "pdf",
      path: `${slugifyWorkflowId(workflowId)}-review.pdf`,
    },
    {
      kind: "checklist",
      label: "Evidence checklist",
      format: "checklist",
      content: evidence,
    },
  ];
}

const workflowDefinitions = {
  "tax/1040": {
    summary: {
      id: "tax/1040",
      domain: "tax",
      title: "Federal individual return",
      summary: "Form 1040 with Schedule 1 and Schedule C aware tax workflow for the 2025 filing season.",
      status: "active",
      audience: "household",
      tags: ["irs", "tax", "refund", "w2", "schedule-c"],
      year: 2025,
      legacyFormId: "1040",
    },
    inputSchema: taxInputSchema,
    starterData: {
      taxpayer: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      dependents: [],
      filingStatus: "single",
      wages: 0,
      taxableInterest: 0,
      ordinaryDividends: 0,
      scheduleCNet: 0,
      otherIncome: 0,
      adjustments: {
        educatorExpenses: 0,
        hsaDeduction: 0,
        selfEmploymentTaxDeduction: 0,
        iraDeduction: 0,
        studentLoanInterest: 0,
      },
      useItemizedDeductions: false,
      itemizedDeductions: 0,
      federalWithheld: 0,
      estimatedPayments: 0,
    } satisfies TaxWorkflowInput,
    sections: [
      {
        id: "identity",
        title: "Identity",
        description: "Collect the taxpayer identity and filing status.",
        fields: [
          { key: "taxpayer.firstName", label: "First name", type: "text" },
          { key: "taxpayer.lastName", label: "Last name", type: "text" },
          { key: "taxpayer.ssn", label: "SSN", type: "text" },
          {
            key: "filingStatus",
            label: "Filing status",
            type: "select",
            options: [
              { label: "Single", value: "single" },
              { label: "Married filing jointly", value: "married_filing_jointly" },
              { label: "Head of household", value: "head_of_household" },
            ],
          },
        ],
      },
      {
        id: "income",
        title: "Income",
        fields: [
          { key: "wages", label: "W-2 wages", type: "currency" },
          { key: "federalWithheld", label: "Federal withholding", type: "currency" },
          { key: "scheduleCNet", label: "Schedule C net", type: "currency" },
          { key: "otherIncome", label: "Other income", type: "currency" },
        ],
      },
    ],
    buildBundle(input: TaxWorkflowInput): WorkflowBundle {
      const calculation = calculateFederalTax({
        filingStatus: input.filingStatus,
        wages: input.wages,
        taxableInterest: input.taxableInterest,
        ordinaryDividends: input.ordinaryDividends,
        scheduleCNet: input.scheduleCNet,
        otherIncome: input.otherIncome,
        adjustments: input.adjustments,
        useItemizedDeductions: input.useItemizedDeductions,
        itemizedDeductions: input.itemizedDeductions,
        dependents: input.dependents,
        federalWithheld: input.federalWithheld,
        estimatedPayments: input.estimatedPayments,
      });

      const bundleInput = {
        formId: "1040" as const,
        taxYear: 2025 as const,
        filingStatus: input.filingStatus,
        taxpayer: input.taxpayer,
        dependents: input.dependents,
        importedDocuments:
          input.federalWithheld > 0
            ? [
                {
                  type: "w2" as const,
                  employerName: "Withholding input",
                  wages: input.wages,
                  federalWithheld: input.federalWithheld,
                },
              ]
            : [],
        taxInput: {
          filingStatus: input.filingStatus,
          wages: input.wages,
          taxableInterest: input.taxableInterest,
          ordinaryDividends: input.ordinaryDividends,
          scheduleCNet: input.scheduleCNet,
          otherIncome: input.otherIncome,
          adjustments: input.adjustments,
          useItemizedDeductions: input.useItemizedDeductions,
          itemizedDeductions: input.itemizedDeductions,
          dependents: input.dependents,
          federalWithheld: input.federalWithheld,
          estimatedPayments: input.estimatedPayments,
        },
        ...(input.spouse ? { spouse: input.spouse } : {}),
      };
      const bundle = buildReturnBundle(bundleInput);
      const validation = validateReturnBundle(bundle);

      return {
        workflowId: "tax/1040",
        domain: "tax",
        title: "Federal individual return",
        summary: "Deterministic 2025 federal return bundle.",
        year: 2025,
        legacyFormId: "1040",
        applicant: input.taxpayer,
        household: input.dependents.map((dependent) => ({
          name: dependent.name,
          relationship: dependent.relationship,
        })),
        evidence: [],
        answers: input as unknown as Record<string, unknown>,
        derived: {
          refund: calculation.refund,
          amountOwed: calculation.amountOwed,
          taxableIncome: calculation.taxableIncome,
        },
        validation: {
          checks: validation.checks,
          flaggedFields: validation.flaggedFields,
        },
        review: {
          headline:
            calculation.refund > 0
              ? `Refund expected: ${currency(calculation.refund)}`
              : `Amount owed: ${currency(calculation.amountOwed)}`,
          notes: [
            `Gross income ${currency(calculation.grossIncome)}`,
            `Taxable income ${currency(calculation.taxableIncome)}`,
            `Federal tax ${currency(calculation.totalTax)}`,
          ],
          flaggedFields: validation.flaggedFields,
        },
        outputArtifacts: [
          {
            kind: "bundle",
            label: "1040 return bundle",
            format: "json",
            path: "1040-2025-filled.json",
          },
          {
            kind: "review",
            label: "Return review PDF",
            format: "pdf",
            path: "1040-2025-filled.pdf",
          },
        ],
        provenance: ["calculation-engine", "field-mapper", "validator"],
        filledForm: bundle,
        calculation,
      };
    },
  } satisfies WorkflowDefinition<TaxWorkflowInput>,
  "immigration/family-visa-intake": {
    summary: {
      id: "immigration/family-visa-intake",
      domain: "immigration",
      title: "Family visa packet intake",
      summary: "Build a household-centered family visa or adjustment packet checklist before attorney or human review.",
      status: "active",
      audience: "household",
      tags: ["uscis", "family", "visa", "packet", "evidence"],
    },
    inputSchema: immigrationInputSchema,
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      beneficiary: {
        fullName: "",
        relationship: "spouse",
        currentCountry: "",
        currentlyInUnitedStates: false,
      },
      household: [],
      visaGoal: "family",
      petitionerStatus: "uscitizen",
      hasPassportCopy: false,
      hasBirthCertificate: false,
      hasRelationshipEvidence: false,
      hasFinancialSponsor: false,
      priorVisaDenials: false,
      needsTranslation: false,
      workAuthorizationRequested: false,
    } satisfies ImmigrationWorkflowInput,
    sections: [
      {
        id: "sponsor",
        title: "Petitioner",
        fields: [
          { key: "applicant.firstName", label: "Petitioner first name", type: "text" },
          { key: "applicant.lastName", label: "Petitioner last name", type: "text" },
          {
            key: "petitionerStatus",
            label: "Petitioner status",
            type: "select",
            options: [
              { label: "US citizen", value: "uscitizen" },
              { label: "Permanent resident", value: "permanent_resident" },
              { label: "Employer", value: "employer" },
              { label: "Other", value: "other" },
            ],
          },
        ],
      },
      {
        id: "beneficiary",
        title: "Beneficiary",
        fields: [
          { key: "beneficiary.fullName", label: "Beneficiary full name", type: "text" },
          { key: "beneficiary.relationship", label: "Relationship", type: "text" },
          { key: "beneficiary.currentCountry", label: "Current country", type: "text" },
          {
            key: "beneficiary.currentlyInUnitedStates",
            label: "Currently in the United States",
            type: "confirm",
          },
        ],
      },
      {
        id: "evidence",
        title: "Evidence",
        fields: [
          { key: "hasPassportCopy", label: "Passport copy available", type: "confirm" },
          { key: "hasBirthCertificate", label: "Birth certificate available", type: "confirm" },
          {
            key: "hasRelationshipEvidence",
            label: "Relationship evidence available",
            type: "confirm",
          },
          { key: "hasFinancialSponsor", label: "Financial sponsor ready", type: "confirm" },
        ],
      },
    ],
    buildBundle(input: ImmigrationWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("passport", "Passport biographic page", true, input.hasPassportCopy),
        buildEvidenceItem("birth", "Birth certificate", true, input.hasBirthCertificate),
        buildEvidenceItem(
          "relationship",
          "Relationship evidence",
          true,
          input.hasRelationshipEvidence,
        ),
        buildEvidenceItem(
          "financial",
          "Financial sponsor package",
          true,
          input.hasFinancialSponsor,
        ),
        buildEvidenceItem(
          "translations",
          "Certified translations",
          input.needsTranslation,
          !input.needsTranslation,
          input.needsTranslation ? "Confirm each non-English civil document has a translation." : undefined,
        ),
      ];
      const flags: ValidationFlag[] = [];
      if (input.priorVisaDenials) {
        flags.push(
          makeFlag(
            "priorVisaDenials",
            "review",
            "Prior denials usually require a human review of prior filings and refusal notices.",
          ),
        );
      }
      if (!input.hasFinancialSponsor) {
        flags.push(
          makeFlag(
            "hasFinancialSponsor",
            "warning",
            "Most family visa packets need a support affidavit or equivalent sponsor evidence.",
          ),
        );
      }
      if (!input.hasRelationshipEvidence) {
        flags.push(
          makeFlag(
            "hasRelationshipEvidence",
            "error",
            "Relationship evidence is missing for a family-based packet.",
          ),
        );
      }
      const checks = [
        makeCheck(
          "beneficiary-name",
          "Beneficiary identity captured",
          input.beneficiary.fullName.trim().length > 0,
          "error",
          "Provide the beneficiary legal name.",
        ),
        makeCheck(
          "relationship-evidence",
          "Relationship evidence captured",
          input.hasRelationshipEvidence,
          "error",
          "Relationship evidence is required for packet assembly.",
        ),
        makeCheck(
          "passport-copy",
          "Passport copy available",
          input.hasPassportCopy,
          "warning",
          "Passport copy is recommended before packet review.",
        ),
      ];
      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "immigration/family-visa-intake",
        domain: "immigration",
        title: "Family visa packet intake",
        summary:
          "Packet planner for family visa and adjustment-style evidence assembly. PigeonGov does not submit to USCIS.",
        applicant: input.applicant,
        household: [
          {
            name: input.beneficiary.fullName,
            relationship: input.beneficiary.relationship,
          },
          ...input.household,
        ],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          packetTrack: input.beneficiary.currentlyInUnitedStates ? "adjustment-review" : "consular-review",
          missingEvidenceCount: missingEvidence,
          workAuthorizationRequested: input.workAuthorizationRequested,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Visa packet readiness",
          missingEvidence === 0 ? "ready for human review" : "needs more evidence",
          evidence,
          flags,
          [
            `${input.beneficiary.fullName} is being reviewed for a ${input.visaGoal} packet.`,
            `Recommended track: ${input.beneficiary.currentlyInUnitedStates ? "adjustment of status review" : "consular packet review"}.`,
            `Missing evidence items: ${missingEvidence}.`,
          ],
        ),
        outputArtifacts: genericArtifacts("immigration-family-visa-intake", evidence),
        provenance: ["workflow-registry", "immigration-evidence-model"],
      };
    },
  } satisfies WorkflowDefinition<ImmigrationWorkflowInput>,
  "healthcare/aca-enrollment": {
    summary: {
      id: "healthcare/aca-enrollment",
      domain: "healthcare",
      title: "Healthcare enrollment planner",
      summary: "Organize household, income, and coverage evidence for marketplace enrollment review.",
      status: "active",
      audience: "household",
      tags: ["healthcare", "aca", "marketplace", "household", "coverage"],
    },
    inputSchema: healthcareInputSchema,
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      household: [],
      stateOfResidence: "CA",
      annualHouseholdIncome: 0,
      currentlyInsured: false,
      qualifyingLifeEvent: false,
      hasEmployerCoverageOffer: false,
      needsDependentCoverage: false,
      immigrationDocumentsAvailable: true,
      incomeProofAvailable: false,
      residenceProofAvailable: false,
      preferredCoverageMonth: "January",
    } satisfies HealthcareWorkflowInput,
    sections: [
      {
        id: "household",
        title: "Household",
        fields: [
          { key: "applicant.firstName", label: "Applicant first name", type: "text" },
          { key: "stateOfResidence", label: "State of residence", type: "text" },
          {
            key: "annualHouseholdIncome",
            label: "Annual household income",
            type: "currency",
          },
          {
            key: "preferredCoverageMonth",
            label: "Preferred coverage month",
            type: "text",
          },
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility",
        fields: [
          { key: "currentlyInsured", label: "Currently insured", type: "confirm" },
          { key: "qualifyingLifeEvent", label: "Qualifying life event", type: "confirm" },
          {
            key: "hasEmployerCoverageOffer",
            label: "Employer coverage offered",
            type: "confirm",
          },
          { key: "needsDependentCoverage", label: "Needs dependent coverage", type: "confirm" },
        ],
      },
    ],
    buildBundle(input: HealthcareWorkflowInput): WorkflowBundle {
      const householdSize = input.household.length + 1;
      const monthlyIncome = input.annualHouseholdIncome / 12;
      const evidence = [
        buildEvidenceItem("income-proof", "Income proof", true, input.incomeProofAvailable),
        buildEvidenceItem("residence-proof", "Residence proof", true, input.residenceProofAvailable),
        buildEvidenceItem(
          "immigration-docs",
          "Immigration or citizenship documents",
          true,
          input.immigrationDocumentsAvailable,
        ),
        buildEvidenceItem(
          "employer-coverage",
          "Employer coverage notice",
          input.hasEmployerCoverageOffer,
          !input.hasEmployerCoverageOffer,
          input.hasEmployerCoverageOffer
            ? "Human review recommended to compare affordability and minimum value."
            : undefined,
        ),
      ];
      const flags: ValidationFlag[] = [];
      if (!input.qualifyingLifeEvent && input.currentlyInsured) {
        flags.push(
          makeFlag(
            "qualifyingLifeEvent",
            "review",
            "Outside open enrollment, a qualifying life event is usually needed to change coverage.",
          ),
        );
      }
      if (input.hasEmployerCoverageOffer) {
        flags.push(
          makeFlag(
            "hasEmployerCoverageOffer",
            "review",
            "Employer-sponsored coverage may affect marketplace subsidies and needs a human check.",
          ),
        );
      }
      const checks = [
        makeCheck(
          "income-proof",
          "Income proof available",
          input.incomeProofAvailable,
          "warning",
          "Upload pay stubs or other income proof before submission review.",
        ),
        makeCheck(
          "residence-proof",
          "Residence proof available",
          input.residenceProofAvailable,
          "warning",
          "Residence proof is often needed to complete enrollment review.",
        ),
        makeCheck(
          "coverage-month",
          "Coverage month selected",
          input.preferredCoverageMonth.trim().length > 0,
          "error",
          "Choose a target coverage month.",
        ),
      ];
      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "healthcare/aca-enrollment",
        domain: "healthcare",
        title: "Healthcare enrollment planner",
        summary:
          "Household-centric enrollment planner for marketplace review. PigeonGov does not file coverage applications for you.",
        applicant: input.applicant,
        household: input.household,
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          householdSize,
          monthlyIncome,
          coverageTrack: input.qualifyingLifeEvent ? "special-enrollment-review" : "open-enrollment-review",
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Enrollment readiness",
          missingEvidence === 0 ? "ready for review" : "missing documentation",
          evidence,
          flags,
          [
            `Household size: ${householdSize}.`,
            `Annual household income: ${currency(input.annualHouseholdIncome)}.`,
            `Target effective month: ${input.preferredCoverageMonth}.`,
          ],
        ),
        outputArtifacts: genericArtifacts("healthcare-aca-enrollment", evidence),
        provenance: ["workflow-registry", "healthcare-enrollment-model"],
      };
    },
  } satisfies WorkflowDefinition<HealthcareWorkflowInput>,
  "unemployment/claim-intake": {
    summary: {
      id: "unemployment/claim-intake",
      domain: "unemployment",
      title: "Unemployment claim intake",
      summary: "Organize claimant identity, separation facts, and wage evidence for state unemployment review.",
      status: "active",
      audience: "individual",
      tags: ["unemployment", "claim", "wages", "state", "employment"],
    },
    inputSchema: unemploymentInputSchema,
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      stateOfClaim: "CA",
      lastEmployerName: "",
      lastDayWorked: "",
      separationReason: "laid_off",
      wagesLast12Months: 0,
      receivingSeverance: false,
      availableForWork: true,
      identityProofAvailable: false,
      wageProofAvailable: false,
      separationNoticeAvailable: false,
    } satisfies UnemploymentWorkflowInput,
    sections: [
      {
        id: "claim",
        title: "Claim basics",
        fields: [
          { key: "applicant.firstName", label: "Claimant first name", type: "text" },
          { key: "stateOfClaim", label: "State of claim", type: "text" },
          { key: "lastEmployerName", label: "Last employer", type: "text" },
          { key: "lastDayWorked", label: "Last day worked", type: "date" },
        ],
      },
      {
        id: "separation",
        title: "Separation facts",
        fields: [
          {
            key: "separationReason",
            label: "Separation reason",
            type: "select",
            options: [
              { label: "Laid off", value: "laid_off" },
              { label: "Hours reduced", value: "hours_reduced" },
              { label: "Fired", value: "fired" },
              { label: "Quit", value: "quit" },
              { label: "Seasonal end", value: "seasonal_end" },
            ],
          },
          { key: "receivingSeverance", label: "Receiving severance", type: "confirm" },
          { key: "availableForWork", label: "Available for work", type: "confirm" },
          { key: "wagesLast12Months", label: "Wages in last 12 months", type: "currency" },
        ],
      },
    ],
    buildBundle(input: UnemploymentWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("identity", "Identity proof", true, input.identityProofAvailable),
        buildEvidenceItem("wages", "Wage proof", true, input.wageProofAvailable),
        buildEvidenceItem(
          "separation-notice",
          "Separation notice or termination letter",
          input.separationReason !== "hours_reduced",
          input.separationNoticeAvailable,
        ),
      ];
      const flags: ValidationFlag[] = [];
      if (!input.availableForWork) {
        flags.push(
          makeFlag(
            "availableForWork",
            "error",
            "Most unemployment programs require availability for suitable work.",
          ),
        );
      }
      if (input.separationReason === "quit" || input.separationReason === "fired") {
        flags.push(
          makeFlag(
            "separationReason",
            "review",
            "Quit and fired claims often require a fact-specific human review before filing.",
          ),
        );
      }
      if (input.receivingSeverance) {
        flags.push(
          makeFlag(
            "receivingSeverance",
            "review",
            "Severance may affect timing or state-specific eligibility calculations.",
          ),
        );
      }
      const checks = [
        makeCheck(
          "wage-proof",
          "Wage proof available",
          input.wageProofAvailable,
          "warning",
          "Collect wage statements or W-2s before claim review.",
        ),
        makeCheck(
          "availability",
          "Available for work",
          input.availableForWork,
          "error",
          "Claimant must usually certify availability for work.",
        ),
        makeCheck(
          "employer",
          "Employer identified",
          input.lastEmployerName.trim().length > 0,
          "error",
          "Provide the last employer name.",
        ),
      ];
      const missingEvidence = evidence.filter((item) => item.status === "missing").length;

      return {
        workflowId: "unemployment/claim-intake",
        domain: "unemployment",
        title: "Unemployment claim intake",
        summary:
          "State claim intake organizer for identity, wage, and separation facts. PigeonGov does not submit the claim.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          monthlyAverageWages: input.wagesLast12Months / 12,
          readinessState: missingEvidence === 0 ? "review-ready" : "needs-evidence",
          separationTrack: input.separationReason,
        },
        validation: {
          checks,
          flaggedFields: flags,
        },
        review: buildGenericSummary(
          "Claim readiness",
          missingEvidence === 0 ? "ready for state portal review" : "needs more documents",
          evidence,
          flags,
          [
            `State of claim: ${input.stateOfClaim}.`,
            `Last employer: ${input.lastEmployerName}.`,
            `Wages in last 12 months: ${currency(input.wagesLast12Months)}.`,
          ],
        ),
        outputArtifacts: genericArtifacts("unemployment-claim-intake", evidence),
        provenance: ["workflow-registry", "unemployment-claim-model"],
      };
    },
  } satisfies WorkflowDefinition<UnemploymentWorkflowInput>,
  "business/license-starter": {
    summary: {
      id: "business/license-starter",
      domain: "business",
      title: "Business license planner",
      summary: "Map local license, zoning, and entity-registration follow-up tasks for a new business.",
      status: "preview",
      audience: "business",
      tags: ["business", "license", "zoning", "registration"],
    },
    inputSchema: planningInputSchema,
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      entityName: "",
      state: "CA",
      locality: "",
      industry: "",
      needsProfessionalLicense: false,
      hasZoningQuestions: false,
    } satisfies PlanningWorkflowInput,
    sections: [
      {
        id: "business",
        title: "Business setup",
        fields: [
          { key: "entityName", label: "Entity name", type: "text" },
          { key: "state", label: "State", type: "text" },
          { key: "locality", label: "City or county", type: "text" },
          { key: "industry", label: "Industry", type: "text" },
        ],
      },
    ],
    buildBundle(input: PlanningWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("entity", "Entity registration details", true, true),
        buildEvidenceItem(
          "professional-license",
          "Professional license checklist",
          input.needsProfessionalLicense,
          !input.needsProfessionalLicense,
        ),
        buildEvidenceItem(
          "zoning",
          "Zoning approval checklist",
          input.hasZoningQuestions,
          !input.hasZoningQuestions,
          input.hasZoningQuestions ? "Review local zoning and occupancy requirements." : undefined,
        ),
      ];
      return {
        workflowId: "business/license-starter",
        domain: "business",
        title: "Business license planner",
        summary: "Preview workflow for local business licensing planning.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          locality: input.locality,
          planningMode: "preview",
        },
        validation: {
          checks: [makeCheck("entity", "Entity name provided", input.entityName.length > 0, "error", "Provide the business name.")],
          flaggedFields: [],
        },
        review: buildGenericSummary(
          "Business launch planning",
          "preview workflow",
          evidence,
          [],
          [`Industry: ${input.industry}.`, `Locality: ${input.locality}, ${input.state}.`],
        ),
        outputArtifacts: genericArtifacts("business-license-starter", evidence),
        provenance: ["workflow-registry", "business-planning-model"],
      };
    },
  } satisfies WorkflowDefinition<PlanningWorkflowInput>,
  "permits/local-permit-planner": {
    summary: {
      id: "permits/local-permit-planner",
      domain: "permits",
      title: "Local permit planner",
      summary: "Preview workflow for local permit scoping and evidence collection.",
      status: "preview",
      audience: "individual",
      tags: ["permits", "construction", "local", "planning"],
    },
    inputSchema: planningInputSchema,
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
      entityName: "",
      state: "CA",
      locality: "",
      industry: "residential",
      needsProfessionalLicense: false,
      hasZoningQuestions: true,
    } satisfies PlanningWorkflowInput,
    sections: [
      {
        id: "permit",
        title: "Permit basics",
        fields: [
          { key: "entityName", label: "Project or applicant name", type: "text" },
          { key: "locality", label: "City or county", type: "text" },
          { key: "industry", label: "Permit category", type: "text" },
        ],
      },
    ],
    buildBundle(input: PlanningWorkflowInput): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("site-plan", "Site plan or project description", true, true),
        buildEvidenceItem(
          "zoning",
          "Zoning and occupancy questions",
          true,
          !input.hasZoningQuestions,
          input.hasZoningQuestions ? "Review local zoning office guidance before applying." : undefined,
        ),
      ];
      return {
        workflowId: "permits/local-permit-planner",
        domain: "permits",
        title: "Local permit planner",
        summary: "Preview planner for local permit routing and document collection.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {
          locality: input.locality,
          planningMode: "preview",
        },
        validation: {
          checks: [makeCheck("locality", "Locality provided", input.locality.length > 0, "error", "Provide the city or county.")],
          flaggedFields: [],
        },
        review: buildGenericSummary(
          "Permit planning",
          "preview workflow",
          evidence,
          [],
          [`Permit area: ${input.locality}, ${input.state}.`, `Permit category: ${input.industry}.`],
        ),
        outputArtifacts: genericArtifacts("permits-local-permit-planner", evidence),
        provenance: ["workflow-registry", "permit-planning-model"],
      };
    },
  } satisfies WorkflowDefinition<PlanningWorkflowInput>,
} as const;

export type WorkflowId = keyof typeof workflowDefinitions;

const legacyWorkflowAliases: Record<string, WorkflowId> = {
  "1040": "tax/1040",
  "family-visa": "immigration/family-visa-intake",
  "healthcare-enrollment": "healthcare/aca-enrollment",
  "unemployment-claim": "unemployment/claim-intake",
};

export function normalizeWorkflowId(workflowId: string): WorkflowId {
  const directMatch = workflowId as WorkflowId;
  if (directMatch in workflowDefinitions) {
    return directMatch;
  }

  const alias = legacyWorkflowAliases[workflowId];
  if (alias) {
    return alias;
  }

  throw new Error(`Unsupported workflow: ${workflowId}`);
}

export function listWorkflowSummaries(filters?: { domain?: WorkflowDomain }) {
  return Object.values(workflowDefinitions)
    .map((definition) => definition.summary)
    .filter((summary) => (filters?.domain ? summary.domain === filters.domain : true));
}

export function listDomains(): WorkflowDomain[] {
  return [...new Set(Object.values(workflowDefinitions).map((definition) => definition.summary.domain))];
}

function describeField(name: string, schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodDefault) {
    return describeField(name, schema.unwrap() as z.ZodTypeAny);
  }
  if (schema instanceof z.ZodOptional) {
    const child = describeField(name, schema.unwrap() as z.ZodTypeAny);
    return { ...child, optional: true };
  }
  if (schema instanceof z.ZodObject) {
    return {
      name,
      kind: "object",
      fields: Object.entries(schema.shape).map(([childName, childSchema]) =>
        describeField(childName, childSchema as z.ZodTypeAny),
      ),
    };
  }
  if (schema instanceof z.ZodArray) {
    return {
      name,
      kind: "array",
      items: describeField(`${name}[]`, schema.element as z.ZodTypeAny),
    };
  }
  return {
    name,
    kind: schema.constructor.name.replace(/^Zod/, "").toLowerCase(),
  };
}

export function describeWorkflow(workflowId: string) {
  const normalizedId = normalizeWorkflowId(workflowId);
  const definition = workflowDefinitions[normalizedId];
  const schema =
    definition.inputSchema instanceof z.ZodObject
      ? Object.entries(definition.inputSchema.shape).map(([name, value]) =>
          describeField(name, value as z.ZodTypeAny),
        )
      : [];

  return {
    ...definition.summary,
    sections: definition.sections,
    starterData: definition.starterData,
    inputSchema: schema,
  };
}

export function getWorkflowStarterData(workflowId: string) {
  const normalizedId = normalizeWorkflowId(workflowId);
  return structuredClone(workflowDefinitions[normalizedId].starterData) as unknown;
}

export function buildWorkflowBundle(workflowId: string, data: unknown): WorkflowBundle {
  const normalizedId = normalizeWorkflowId(workflowId);
  const definition = workflowDefinitions[normalizedId];
  const parsed = definition.inputSchema.parse(data);
  return definition.buildBundle(parsed as never);
}

export function validateWorkflowBundle(bundle: WorkflowBundle) {
  return bundle.validation;
}

export function reviewWorkflowBundle(bundle: WorkflowBundle) {
  return bundle.review;
}

export function explainWorkflowFlag(bundle: WorkflowBundle, field: string) {
  const flag = bundle.validation.flaggedFields.find((item) => item.field === field);
  if (!flag) {
    return {
      found: false,
      field,
      explanation: "No flag was found for that field.",
    };
  }

  return {
    found: true,
    field,
    severity: flag.severity,
    explanation: flag.message,
    suggestedNextStep:
      flag.severity === "error"
        ? "Resolve the missing or contradictory data before relying on this packet."
        : "Review the underlying evidence with a human before finalizing the packet.",
  };
}

export function isWorkflowBundle(value: unknown): value is WorkflowBundle {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "workflowId" in value && "validation" in value && "review" in value;
}
