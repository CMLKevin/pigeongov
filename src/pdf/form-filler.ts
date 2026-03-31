/**
 * PDF Form Filler — generates government form PDFs from ReturnBundle data.
 *
 * Two modes of operation:
 *
 * 1. **Template mode** (future): Load an official IRS fillable PDF from
 *    `src/pdf/templates/`, map ReturnBundle fields to the PDF's embedded
 *    form fields via the field-mapping registry, and produce a filled PDF.
 *    This is the ideal path — the output is an actual IRS form that a
 *    taxpayer could print and mail. Requires IRS to publish the 2025
 *    fillable PDF.
 *
 * 2. **Mock mode** (current): Generate a clean, form-like summary PDF
 *    using pdf-lib's PDFDocument.create(). Every line item from the 1040
 *    is laid out in a structured grid that mirrors the real form's sections.
 *    This is what ships today — it's readable, correct, and doesn't require
 *    bundling a 200KB IRS PDF template.
 *
 * The architecture is designed so that switching from mock to template mode
 * is a one-line change: swap `generateMock1040Pdf` for `fillTemplate1040Pdf`.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type { ReturnBundle } from "../engine/field-mapper.js";
import type { ValidationFlag } from "../types.js";
import { formatCurrency } from "./shared.js";
import {
  type FormFieldMapping,
  type Form1040Section,
  IRS_1040_FIELD_MAP,
  groupBySection,
  resolveBundlePath,
  SECTION_META,
} from "./field-mappings/irs-1040.js";

// ─── Types ─────────────────────────────────────────────────────

export type FormId = "1040";

export interface FormFillerOptions {
  /**
   * When true, attempt to load and fill the official IRS template PDF.
   * Falls back to mock mode if the template isn't available.
   */
  useTemplate?: boolean;
  /** Flatten form fields after filling (default: true) */
  flatten?: boolean;
  /** Include the PigeonGov watermark disclaimer (default: true) */
  includeDisclaimer?: boolean;
}

export interface FormFillerResult {
  /** The filled PDF bytes */
  pdfBytes: Uint8Array;
  /** Which form was generated */
  formId: FormId;
  /** Whether the real IRS template was used or a mock was generated */
  mode: "template" | "mock";
  /** Number of fields successfully populated */
  filledFieldCount: number;
  /** Number of fields that were skipped (undefined in bundle) */
  skippedFieldCount: number;
  /** Any issues encountered during filling */
  flaggedFields: ValidationFlag[];
}

export interface FormTemplateRegistry {
  /** Known form templates and their field maps */
  forms: Map<FormId, FormTemplateEntry>;
}

export interface FormTemplateEntry {
  formId: FormId;
  taxYear: number;
  /** Path to the template PDF (if available locally) */
  templatePath?: string;
  /** URL to download the template (IRS or cached) */
  templateUrl?: string;
  /** The field mapping for this form */
  fieldMap: readonly FormFieldMapping[];
  /** Version hash of the template we last validated against */
  templateVersion?: string;
}

// ─── Registry ──────────────────────────────────────────────────

const registry: FormTemplateRegistry = {
  forms: new Map<FormId, FormTemplateEntry>([
    [
      "1040",
      {
        formId: "1040",
        taxYear: 2025,
        templateUrl: "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
        fieldMap: IRS_1040_FIELD_MAP,
      },
    ],
  ]),
};

export function getFormTemplate(formId: FormId): FormTemplateEntry | undefined {
  return registry.forms.get(formId);
}

export function listFormTemplates(): FormTemplateEntry[] {
  return [...registry.forms.values()];
}

// ─── Mock PDF Generation ───────────────────────────────────────

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_WIDTH = LETTER_WIDTH - MARGIN * 2;

interface MockLayoutState {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  bodyFont: PDFFont;
  boldFont: PDFFont;
  monoFont: PDFFont;
  pageNumber: number;
}

function newPage(state: MockLayoutState): void {
  state.pageNumber += 1;
  state.page = state.doc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  state.y = LETTER_HEIGHT - MARGIN;

  // Page header — light gray
  state.page.drawText(
    `Form 1040 (2025) — PigeonGov Draft`,
    {
      x: MARGIN,
      y: LETTER_HEIGHT - 28,
      size: 8,
      font: state.bodyFont,
      color: rgb(0.55, 0.55, 0.55),
    },
  );
  state.page.drawText(
    `Page ${state.pageNumber}`,
    {
      x: LETTER_WIDTH - MARGIN - 30,
      y: LETTER_HEIGHT - 28,
      size: 8,
      font: state.bodyFont,
      color: rgb(0.55, 0.55, 0.55),
    },
  );

  state.y = LETTER_HEIGHT - MARGIN - 8;
}

function ensureSpace(state: MockLayoutState, needed: number): void {
  if (state.y < MARGIN + needed) {
    newPage(state);
  }
}

function drawSectionHeader(state: MockLayoutState, title: string): void {
  ensureSpace(state, 40);
  state.y -= 10;

  // Section separator line
  state.page.drawLine({
    start: { x: MARGIN, y: state.y + 6 },
    end: { x: LETTER_WIDTH - MARGIN, y: state.y + 6 },
    thickness: 0.75,
    color: rgb(0.2, 0.2, 0.2),
  });

  state.page.drawText(title, {
    x: MARGIN,
    y: state.y - 10,
    size: 12,
    font: state.boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  state.y -= 24;
}

function formatFieldValue(
  value: string | number | boolean | undefined,
  kind: FormFieldMapping["kind"],
): string {
  if (value === undefined || value === null) {
    return "";
  }

  switch (kind) {
    case "currency":
      return typeof value === "number" ? formatCurrency(value) : String(value);
    case "checkbox":
      return value ? "[X]" : "[ ]";
    case "ssn":
      return String(value);
    case "routing-number":
    case "account-number":
      return String(value);
    case "account-type":
      return String(value);
    default:
      return String(value);
  }
}

function drawFieldRow(
  state: MockLayoutState,
  mapping: FormFieldMapping,
  value: string | number | boolean | undefined,
): void {
  ensureSpace(state, 16);

  const lineLabel = mapping.line === "header" || mapping.line === "filing-status"
    ? ""
    : `Line ${mapping.line}`;
  const displayValue = formatFieldValue(value, mapping.kind);

  // Skip empty values for cleaner output (except checkboxes — show unchecked)
  if (!displayValue && mapping.kind !== "checkbox") {
    return;
  }

  const lineColWidth = 58;
  const labelColWidth = CONTENT_WIDTH - lineColWidth - 110;
  const valueColWidth = 110;

  // Line number (monospaced, muted)
  if (lineLabel) {
    state.page.drawText(lineLabel, {
      x: MARGIN,
      y: state.y,
      size: 9,
      font: state.monoFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // Label
  state.page.drawText(truncateText(mapping.label, labelColWidth, state.bodyFont, 9), {
    x: MARGIN + lineColWidth,
    y: state.y,
    size: 9,
    font: state.bodyFont,
    color: rgb(0.15, 0.15, 0.15),
  });

  // Value (right-aligned for currency, left-aligned otherwise)
  const valueX = LETTER_WIDTH - MARGIN - valueColWidth;

  if (mapping.kind === "currency" && typeof value === "number") {
    const textWidth = state.monoFont.widthOfTextAtSize(displayValue, 10);
    state.page.drawText(displayValue, {
      x: LETTER_WIDTH - MARGIN - textWidth,
      y: state.y,
      size: 10,
      font: state.monoFont,
      color: value < 0 ? rgb(0.7, 0.15, 0.15) : rgb(0.1, 0.1, 0.1),
    });
  } else if (mapping.kind === "checkbox") {
    state.page.drawText(displayValue, {
      x: valueX,
      y: state.y,
      size: 10,
      font: state.monoFont,
      color: value ? rgb(0.1, 0.4, 0.1) : rgb(0.6, 0.6, 0.6),
    });
  } else {
    state.page.drawText(truncateText(displayValue, valueColWidth, state.monoFont, 10), {
      x: valueX,
      y: state.y,
      size: 10,
      font: state.monoFont,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  state.y -= 15;
}

function truncateText(text: string, maxWidth: number, font: PDFFont, size: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + "...", size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}

/**
 * Generate a mock Form 1040 PDF that shows all filled line items
 * in a structured, form-like layout.
 *
 * This is the primary output method until real IRS fillable PDFs
 * are integrated. The layout mirrors the 1040's section structure.
 */
export async function generateMock1040Pdf(
  bundle: ReturnBundle,
  options?: FormFillerOptions,
): Promise<FormFillerResult> {
  const doc = await PDFDocument.create();
  doc.setTitle("Form 1040 — U.S. Individual Income Tax Return (2025)");
  doc.setSubject("PigeonGov generated form");
  doc.setAuthor("PigeonGov");
  doc.setCreator("PigeonGov PDF Form Filler");

  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await doc.embedFont(StandardFonts.Courier);

  const state: MockLayoutState = {
    doc,
    page: doc.addPage([LETTER_WIDTH, LETTER_HEIGHT]),
    y: LETTER_HEIGHT - MARGIN,
    bodyFont,
    boldFont,
    monoFont,
    pageNumber: 1,
  };

  const flaggedFields: ValidationFlag[] = [];
  let filledCount = 0;
  let skippedCount = 0;

  // ─── Title block ─────────────────────────────────────────────
  state.page.drawText("Form 1040", {
    x: MARGIN,
    y: state.y,
    size: 24,
    font: boldFont,
    color: rgb(0.08, 0.08, 0.08),
  });
  state.y -= 20;

  state.page.drawText("U.S. Individual Income Tax Return", {
    x: MARGIN,
    y: state.y,
    size: 13,
    font: bodyFont,
    color: rgb(0.25, 0.25, 0.25),
  });

  state.page.drawText("2025", {
    x: LETTER_WIDTH - MARGIN - boldFont.widthOfTextAtSize("2025", 20),
    y: state.y + 6,
    size: 20,
    font: boldFont,
    color: rgb(0.08, 0.08, 0.08),
  });
  state.y -= 14;

  state.page.drawText("Department of the Treasury — Internal Revenue Service", {
    x: MARGIN,
    y: state.y,
    size: 8.5,
    font: bodyFont,
    color: rgb(0.45, 0.45, 0.45),
  });
  state.y -= 18;

  // Disclaimer
  if (options?.includeDisclaimer !== false) {
    state.page.drawRectangle({
      x: MARGIN,
      y: state.y - 24,
      width: CONTENT_WIDTH,
      height: 22,
      color: rgb(0.97, 0.95, 0.9),
      borderColor: rgb(0.85, 0.75, 0.5),
      borderWidth: 0.5,
    });
    state.page.drawText(
      "DRAFT — Generated by PigeonGov. Not for filing. Verify all values before submitting to the IRS.",
      {
        x: MARGIN + 8,
        y: state.y - 18,
        size: 8,
        font: boldFont,
        color: rgb(0.6, 0.4, 0.1),
      },
    );
    state.y -= 32;
  }

  // ─── Render sections ─────────────────────────────────────────
  const sections = groupBySection();
  const sectionOrder = [...sections.entries()]
    .sort(([a], [b]) => (SECTION_META[a]?.order ?? 99) - (SECTION_META[b]?.order ?? 99));

  for (const [sectionId, mappings] of sectionOrder) {
    const meta = SECTION_META[sectionId];
    if (!meta) continue;

    // Skip empty header section (title already drawn)
    if (sectionId === "header") continue;

    drawSectionHeader(state, meta.title);

    for (const mapping of mappings) {
      const value = resolveBundlePath(bundle, mapping.bundlePath);

      if (value !== undefined) {
        filledCount += 1;
      } else {
        skippedCount += 1;
      }

      drawFieldRow(state, mapping, value);
    }
  }

  // ─── Dependents section (dynamic, not in the static field map) ─
  if (bundle.dependents.length > 0) {
    drawSectionHeader(state, "Dependents");
    for (const dep of bundle.dependents) {
      ensureSpace(state, 16);
      const depLine = `${dep.name} (${dep.relationship}) SSN: ${dep.ssn}` +
        (dep.childTaxCreditEligible ? "  [CTC eligible]" : "");
      state.page.drawText(depLine, {
        x: MARGIN + 12,
        y: state.y,
        size: 9,
        font: state.bodyFont,
        color: rgb(0.15, 0.15, 0.15),
      });
      state.y -= 14;
    }
  }

  // ─── Calculation Summary section ─────────────────────────────
  drawSectionHeader(state, "Calculation Summary");
  const calc = bundle.calculation;
  const summaryLines: Array<[string, string, boolean?]> = [
    ["Gross Income", formatCurrency(calc.grossIncome)],
    ["Adjusted Gross Income", formatCurrency(calc.adjustedGrossIncome)],
    ["Total Deduction", formatCurrency(calc.deduction)],
    ["Taxable Income", formatCurrency(calc.taxableIncome)],
    ["Federal Tax", formatCurrency(calc.federalTax)],
    ["Self-Employment Tax", formatCurrency(calc.selfEmploymentTax)],
    ["Capital Gains Tax", formatCurrency(calc.capitalGainsTax)],
    ["Total Tax", formatCurrency(calc.totalTax)],
    ["Total Credits", formatCurrency(calc.totalCredits)],
    ["Total Payments", formatCurrency(calc.totalPayments)],
    ["Effective Rate", `${(calc.effectiveRate * 100).toFixed(2)}%`],
    ["Marginal Rate", `${(calc.marginalRate * 100).toFixed(1)}%`],
  ];

  if (calc.refund > 0) {
    summaryLines.push(["Refund", formatCurrency(calc.refund), true]);
  }
  if (calc.amountOwed > 0) {
    summaryLines.push(["Amount Owed", formatCurrency(calc.amountOwed), true]);
  }

  for (const [label, value, highlight] of summaryLines) {
    if (value === "$0.00" && !highlight) continue;
    ensureSpace(state, 14);

    state.page.drawText(label, {
      x: MARGIN + 12,
      y: state.y,
      size: 9,
      font: highlight ? state.boldFont : state.bodyFont,
      color: rgb(0.15, 0.15, 0.15),
    });

    const valWidth = state.monoFont.widthOfTextAtSize(value, 10);
    state.page.drawText(value, {
      x: LETTER_WIDTH - MARGIN - valWidth,
      y: state.y,
      size: 10,
      font: state.monoFont,
      color: highlight ? rgb(0.1, 0.35, 0.1) : rgb(0.1, 0.1, 0.1),
    });

    state.y -= 14;
  }

  // ─── Footer ──────────────────────────────────────────────────
  ensureSpace(state, 40);
  state.y -= 16;
  state.page.drawLine({
    start: { x: MARGIN, y: state.y },
    end: { x: LETTER_WIDTH - MARGIN, y: state.y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  state.y -= 14;
  state.page.drawText(
    "Generated by PigeonGov. This document is a draft and is NOT a substitute for an official IRS form.",
    {
      x: MARGIN,
      y: state.y,
      size: 7.5,
      font: state.bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    },
  );
  state.y -= 10;
  state.page.drawText(
    "PigeonGov does not file returns or transmit data to the IRS. Review all values before filing.",
    {
      x: MARGIN,
      y: state.y,
      size: 7.5,
      font: state.bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  const pdfBytes = await doc.save();

  return {
    pdfBytes,
    formId: "1040",
    mode: "mock",
    filledFieldCount: filledCount,
    skippedFieldCount: skippedCount,
    flaggedFields,
  };
}

// ─── Template Mode (future) ────────────────────────────────────

/**
 * Fill an official IRS fillable PDF template.
 *
 * This function is the future path: it loads the real IRS 1040 PDF,
 * walks the field map, and fills every field. The existing
 * `fillPdfTemplate` in writer.ts handles the low-level PDF form
 * manipulation — this function builds the field list from the
 * ReturnBundle using the field mapping registry.
 *
 * NOT YET ACTIVE — requires IRS 2025 fillable PDF to be available
 * in src/pdf/templates/. The mock mode covers us until then.
 */
export async function fillTemplate1040Pdf(
  bundle: ReturnBundle,
  templateBytes: Uint8Array,
  options?: FormFillerOptions,
): Promise<FormFillerResult> {
  // Use the existing fillPdfTemplate infrastructure from writer.ts
  const { fillPdfTemplate } = await import("./writer.js");

  const fields: Array<{ name: string; value: string | number | boolean | null | undefined; kind?: "text" | "checkbox" | "radio" }> = [];
  let filledCount = 0;
  let skippedCount = 0;

  for (const mapping of IRS_1040_FIELD_MAP) {
    const value = resolveBundlePath(bundle, mapping.bundlePath);
    if (value === undefined) {
      skippedCount += 1;
      continue;
    }

    filledCount += 1;
    fields.push({
      name: mapping.pdfFieldName,
      value,
      kind: mapping.kind === "checkbox" ? "checkbox" : "text",
    });
  }

  const result = await fillPdfTemplate({
    template: templateBytes,
    fields,
    flatten: options?.flatten ?? true,
    title: "Form 1040 — U.S. Individual Income Tax Return (2025)",
    subject: "PigeonGov filled form",
    author: "PigeonGov",
  });

  return {
    pdfBytes: result.pdfBytes,
    formId: "1040",
    mode: "template",
    filledFieldCount: filledCount,
    skippedFieldCount: skippedCount,
    flaggedFields: result.flaggedFields,
  };
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Generate a filled Form 1040 PDF from a ReturnBundle.
 *
 * Currently produces a mock (structured summary) PDF.
 * When IRS templates are available, set `options.useTemplate = true`
 * and provide the template bytes to get real form filling.
 */
export async function generateForm1040Pdf(
  bundle: ReturnBundle,
  options?: FormFillerOptions & { templateBytes?: Uint8Array },
): Promise<FormFillerResult> {
  if (options?.useTemplate && options?.templateBytes) {
    return fillTemplate1040Pdf(bundle, options.templateBytes, options);
  }

  return generateMock1040Pdf(bundle, options);
}
