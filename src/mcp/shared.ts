import { z } from "zod";

import { buildReturnBundle } from "../engine/field-mapper.js";
import { validateReturnBundle } from "../engine/validator.js";
import { calculateFederalTax, type TaxCalculationInput } from "../engine/tax-calculator.js";
import { schemaRegistry, type SupportedSchemaId } from "../schemas/2025/index.js";
import type {
  ImportedDocument,
  ReviewSummary,
  ValidationCheck,
  ValidationFlag,
} from "../types.js";
import {
  buildWorkflowBundle,
  describeWorkflow,
  explainWorkflowFlag,
  getWorkflowStarterData,
  listDomains,
  listWorkflowSummaries,
  normalizeWorkflowId,
  reviewWorkflowBundle,
  validateWorkflowBundle,
} from "../workflows/registry.js";

export const PIGEONGOV_YEAR = 2025 as const;

export const supportedFormIds = [
  "1040",
  "schedule-1",
  "schedule-c",
  "w2",
  "1099-nec",
  "1099-int",
] as const satisfies readonly SupportedSchemaId[];

export type SupportedFormId = (typeof supportedFormIds)[number];

export const supportedFormSchema = z.enum(supportedFormIds);
export const incomeDocumentTypeSchema = z.enum(["w2", "1099-nec", "1099-int"]);

const dependentSchema = z
  .object({
    name: z.string().trim().min(1),
    ssn: z.string().trim().regex(/^\d{3}-\d{2}-\d{4}$/),
    relationship: z.string().trim().min(1),
    childTaxCreditEligible: z.boolean(),
    eitcEligible: z.boolean().optional(),
  })
  .strict();

const identitySchema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    ssn: z.string().trim().regex(/^\d{3}-\d{2}-\d{4}$/),
    address: z
      .object({
        street1: z.string().trim().min(1),
        street2: z.string().trim().optional(),
        city: z.string().trim().min(1),
        state: z.string().trim().regex(/^[A-Z]{2}$/),
        zipCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
      })
      .strict(),
  })
  .strict();

const adjustmentSchema = z
  .object({
    educatorExpenses: z.coerce.number().default(0),
    hsaDeduction: z.coerce.number().default(0),
    selfEmploymentTaxDeduction: z.coerce.number().default(0),
    iraDeduction: z.coerce.number().default(0),
    studentLoanInterest: z.coerce.number().default(0),
  })
  .strict();

export const taxInputSchema = z
  .object({
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
    adjustments: adjustmentSchema.default({
      educatorExpenses: 0,
      hsaDeduction: 0,
      selfEmploymentTaxDeduction: 0,
      iraDeduction: 0,
      studentLoanInterest: 0,
    }),
    useItemizedDeductions: z.boolean().default(false),
    itemizedDeductions: z.coerce.number().default(0),
    dependents: z.array(dependentSchema).default([]),
    federalWithheld: z.coerce.number().min(0).default(0),
    estimatedPayments: z.coerce.number().min(0).default(0),
  })
  .strict();

export type McpTaxInput = z.infer<typeof taxInputSchema>;

export const sourceDocumentDescriptorSchema = z
  .object({
    path: z.string().trim().min(1),
    type: incomeDocumentTypeSchema.optional(),
  })
  .strict();

export const fillFormInputSchema = z
  .object({
    formId: supportedFormSchema,
    taxYear: z.literal(PIGEONGOV_YEAR).optional(),
    data: taxInputSchema,
    documents: z.array(sourceDocumentDescriptorSchema).optional(),
  })
  .strict();

export const calculateTaxInputSchema = z
  .object({
    taxYear: z.literal(PIGEONGOV_YEAR).optional(),
    data: taxInputSchema,
  })
  .strict();

export const validateFormInputSchema = z
  .object({
    formId: supportedFormSchema,
    taxYear: z.literal(PIGEONGOV_YEAR).optional(),
    data: taxInputSchema,
  })
  .strict();

export const describeFormInputSchema = z
  .object({
    formId: supportedFormSchema,
    taxYear: z.literal(PIGEONGOV_YEAR).optional(),
  })
  .strict();

export const extractDocumentInputSchema = z
  .object({
    path: z.string().trim().min(1),
    type: incomeDocumentTypeSchema.optional(),
  })
  .strict();

export const workflowIdSchema = z.string().trim().min(1);

export const describeWorkflowInputSchema = z
  .object({
    workflowId: workflowIdSchema,
  })
  .strict();

export const startWorkflowInputSchema = z
  .object({
    workflowId: workflowIdSchema,
  })
  .strict();

export const fillWorkflowInputSchema = z
  .object({
    workflowId: workflowIdSchema,
    data: z.record(z.string(), z.unknown()),
  })
  .strict();

export const validateWorkflowInputSchema = z
  .object({
    workflowId: workflowIdSchema.optional(),
    bundle: z.record(z.string(), z.unknown()),
  })
  .strict();

export const reviewWorkflowInputSchema = validateWorkflowInputSchema;

export const buildPacketInputSchema = z
  .object({
    workflowId: workflowIdSchema,
    data: z.record(z.string(), z.unknown()),
  })
  .strict();

export const explainFlagInputSchema = z
  .object({
    bundle: z.record(z.string(), z.unknown()),
    field: z.string().trim().min(1),
  })
  .strict();

export interface FieldDescription {
  name: string;
  kind: string;
  description?: string;
  optional: boolean;
  children?: FieldDescription[];
}

export interface ValidationResult {
  checks: ValidationCheck[];
  flaggedFields: ValidationFlag[];
}

function unwrapSchema(schema: z.ZodTypeAny): { schema: z.ZodTypeAny; optional: boolean } {
  if (schema instanceof z.ZodOptional) {
    const unwrapped = unwrapSchema(schema.unwrap() as z.ZodTypeAny);
    return { schema: unwrapped.schema, optional: true };
  }
  if (schema instanceof z.ZodDefault) {
    const unwrapped = unwrapSchema(schema.removeDefault() as z.ZodTypeAny);
    return { schema: unwrapped.schema, optional: true };
  }
  return { schema, optional: false };
}

function describeSchemaField(name: string, schema: z.ZodTypeAny): FieldDescription {
  const { schema: unwrapped, optional } = unwrapSchema(schema);
  const field: FieldDescription = {
    name,
    kind: unwrapped.constructor.name.replace(/^Zod/, "").toLowerCase() || "value",
    optional,
  };
  if (unwrapped.description !== undefined) {
    field.description = unwrapped.description;
  }
  if (unwrapped instanceof z.ZodObject) {
    field.kind = "object";
    field.children = Object.entries(unwrapped.shape).map(([childName, childSchema]) =>
      describeSchemaField(childName, childSchema as z.ZodTypeAny),
    );
  } else if (unwrapped instanceof z.ZodArray) {
    field.kind = "array";
    field.children = [describeSchemaField(`${name}[]`, unwrapped.element as z.ZodTypeAny)];
  }
  return field;
}

export function listForms() {
  return supportedFormIds.map((formId) => ({
    formId,
    taxYear: PIGEONGOV_YEAR,
    meta: schemaRegistry[formId].meta,
  }));
}

export function describeForm(formId: SupportedFormId) {
  const definition = schemaRegistry[formId];
  const fields =
    definition.schema instanceof z.ZodObject
      ? Object.entries(definition.schema.shape).map(([name, schema]) =>
          describeSchemaField(name, schema as z.ZodTypeAny),
        )
      : [];

  return {
    formId,
    taxYear: PIGEONGOV_YEAR,
    meta: definition.meta,
    fields,
  };
}

export function listWorkflows() {
  return listWorkflowSummaries();
}

export function workflowDomains() {
  return listDomains();
}

export function describeWorkflowDefinition(workflowId: string) {
  return describeWorkflow(workflowId);
}

export function startWorkflow(workflowId: string) {
  const normalizedId = normalizeWorkflowId(workflowId);
  return {
    workflowId: normalizedId,
    starterData: getWorkflowStarterData(normalizedId),
  };
}

export function fillWorkflow(workflowId: string, data: unknown) {
  return buildWorkflowBundle(workflowId, data);
}

export function validateWorkflow(bundle: unknown) {
  const parsed = bundle as { workflowId?: string };
  const workflowBundle = parsed.workflowId
    ? buildWorkflowBundle(parsed.workflowId, (bundle as { answers?: unknown }).answers ?? bundle)
    : (bundle as never);

  return validateWorkflowBundle(workflowBundle);
}

export function reviewWorkflow(workflowId: string, data: unknown) {
  const bundle = buildWorkflowBundle(workflowId, data);
  return {
    bundle,
    review: reviewWorkflowBundle(bundle),
    validation: validateWorkflowBundle(bundle),
  };
}

export function explainFlag(bundle: unknown, field: string) {
  return explainWorkflowFlag(bundle as never, field);
}

export function buildTaxCalculationInput(input: McpTaxInput): TaxCalculationInput {
  return {
    filingStatus: input.filingStatus,
    wages: input.wages,
    taxableInterest: input.taxableInterest,
    ordinaryDividends: input.ordinaryDividends,
    scheduleCNet: input.scheduleCNet,
    otherIncome: input.otherIncome,
    adjustments: input.adjustments,
    useItemizedDeductions: input.useItemizedDeductions,
    itemizedDeductions: input.itemizedDeductions,
    dependents: input.dependents.map((dependent) => {
      const normalized = {
        name: dependent.name,
        ssn: dependent.ssn,
        relationship: dependent.relationship,
        childTaxCreditEligible: dependent.childTaxCreditEligible,
      };
      return dependent.eitcEligible === undefined
        ? normalized
        : { ...normalized, eitcEligible: dependent.eitcEligible };
    }),
    federalWithheld: input.federalWithheld,
    estimatedPayments: input.estimatedPayments,
  };
}

export function calculateTaxFromInput(input: McpTaxInput) {
  return calculateFederalTax(buildTaxCalculationInput(input));
}

export async function extractDocumentFromPath(
  path: string,
  typeHint?: "w2" | "1099-nec" | "1099-int",
) {
  const { readPdfDocument } = await import("../pdf/reader.js");
  const result = await readPdfDocument(path, typeHint ? { typeHint } : {});
  return {
    documentType: result.detectedType,
    confidence: result.confidence,
    extracted: result.detectedType === "unknown" ? null : (result.document as ImportedDocument),
    text: result.rawText,
    flaggedFields: result.flaggedFields,
  };
}

export function mergeImportedDocuments(
  baseInput: McpTaxInput,
  documents: ImportedDocument[],
): { input: McpTaxInput; flaggedFields: ValidationFlag[] } {
  const merged = structuredClone(baseInput);

  for (const document of documents) {
    if (document.type === "w2") {
      merged.wages += document.wages;
      merged.federalWithheld += document.federalWithheld;
    } else if (document.type === "1099-nec") {
      merged.scheduleCNet += document.nonemployeeCompensation;
      merged.federalWithheld += document.federalWithheld ?? 0;
    } else if (document.type === "1099-int") {
      merged.taxableInterest += document.interestIncome;
      merged.federalWithheld += document.federalWithheld ?? 0;
    }
  }

  return {
    input: merged,
    flaggedFields:
      documents.length > 0
        ? [
            {
              field: "documents",
              severity: "review",
              message: `Merged ${documents.length} imported document${documents.length === 1 ? "" : "s"}.`,
              source: "mcp",
            },
          ]
        : [],
  };
}

export function validateTaxInput(input: McpTaxInput): ValidationResult {
  const bundle = buildReturnBundle({
    formId: "1040",
    taxYear: PIGEONGOV_YEAR,
    filingStatus: input.filingStatus,
    taxpayer: identitySchema.parse({
      firstName: "Taxpayer",
      lastName: "Example",
      ssn: "000-00-0000",
      address: {
        street1: "Unknown",
        city: "Unknown",
        state: "CA",
        zipCode: "00000",
      },
    }) as never,
    dependents: buildTaxCalculationInput(input).dependents,
    importedDocuments: [],
    taxInput: buildTaxCalculationInput(input),
  });
  return validateReturnBundle(bundle);
}

export function reviewTaxInput(input: McpTaxInput): ReviewSummary & {
  checks: ValidationCheck[];
  calculation: ReturnType<typeof calculateFederalTax>;
} {
  const calculation = calculateTaxFromInput(input);
  const validation = validateTaxInput(input);

  return {
    headline:
      calculation.refund > 0
        ? "Refund due"
        : calculation.amountOwed > 0
          ? "Balance due"
          : "No balance due",
    notes: [
      `Gross income: $${calculation.grossIncome.toFixed(2)}`,
      `Taxable income: $${calculation.taxableIncome.toFixed(2)}`,
      `Federal tax: $${calculation.federalTax.toFixed(2)}`,
      `Refund: $${calculation.refund.toFixed(2)}`,
    ],
    flaggedFields: validation.flaggedFields,
    checks: validation.checks,
    calculation,
  };
}
