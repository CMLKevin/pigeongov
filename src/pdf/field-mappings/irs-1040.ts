/**
 * IRS Form 1040 field mapping — 2025 tax year.
 *
 * Each entry maps a line on the official Form 1040 to:
 *   - `pdfFieldName`: the form field name inside the IRS fillable PDF
 *     (IRS names follow a consistent pattern, but the exact names will
 *     need to be confirmed against the actual 2025 fillable PDF once
 *     the IRS publishes it. These are best-effort based on historical
 *     patterns from 2022-2024 PDFs.)
 *   - `bundlePath`: a dot-notation path into ReturnBundle
 *   - `kind`: text | currency | checkbox | ssn | filing-status
 *   - `line`: the human-readable line reference on the 1040
 *   - `label`: a short description for display
 *
 * The mapping is intentionally exhaustive. When the form-filler runs
 * against a real IRS PDF, any field that doesn't exist in the template
 * simply gets flagged and skipped — no crash, just a note.
 */

import type { ReturnBundle } from "../../engine/field-mapper.js";

export type FieldKind =
  | "text"
  | "currency"
  | "checkbox"
  | "ssn"
  | "filing-status"
  | "routing-number"
  | "account-number"
  | "account-type";

export interface FormFieldMapping {
  /** The field name embedded in the IRS fillable PDF */
  pdfFieldName: string;
  /** Dot-notation path into ReturnBundle (or a literal resolver key) */
  bundlePath: string;
  /** Field rendering type */
  kind: FieldKind;
  /** Line number on the 1040 (e.g., "1a", "25b") */
  line: string;
  /** Human-readable label */
  label: string;
  /** Section grouping for display */
  section: Form1040Section;
}

export type Form1040Section =
  | "header"
  | "filing-status"
  | "identity"
  | "dependents"
  | "income"
  | "deductions"
  | "tax-and-credits"
  | "payments"
  | "refund"
  | "amount-owed"
  | "signature";

/**
 * Complete field mapping for Form 1040 (2025).
 *
 * The PDF field names use the pattern the IRS has historically used:
 * `topmostSubform[0].Page1[0].f1_XX[0]` for page 1 text fields and
 * `topmostSubform[0].Page1[0].c1_XX[0]` for checkboxes. The exact
 * ordinals will need verification against the published PDF.
 *
 * For now we use short logical names that are stable across years,
 * because filling the mock PDF doesn't need real field names — and
 * when we switch to real IRS PDFs, we just update pdfFieldName values.
 */
export const IRS_1040_FIELD_MAP: readonly FormFieldMapping[] = [
  // ─── Header / Identity ────────────────────────────────────────
  {
    pdfFieldName: "f1_01",
    bundlePath: "taxpayer.firstName",
    kind: "text",
    line: "header",
    label: "Your first name and middle initial",
    section: "identity",
  },
  {
    pdfFieldName: "f1_02",
    bundlePath: "taxpayer.lastName",
    kind: "text",
    line: "header",
    label: "Your last name",
    section: "identity",
  },
  {
    pdfFieldName: "f1_03",
    bundlePath: "taxpayer.ssn",
    kind: "ssn",
    line: "header",
    label: "Your social security number",
    section: "identity",
  },
  {
    pdfFieldName: "f1_04",
    bundlePath: "spouse.firstName",
    kind: "text",
    line: "header",
    label: "Spouse's first name and middle initial",
    section: "identity",
  },
  {
    pdfFieldName: "f1_05",
    bundlePath: "spouse.lastName",
    kind: "text",
    line: "header",
    label: "Spouse's last name",
    section: "identity",
  },
  {
    pdfFieldName: "f1_06",
    bundlePath: "spouse.ssn",
    kind: "ssn",
    line: "header",
    label: "Spouse's social security number",
    section: "identity",
  },
  {
    pdfFieldName: "f1_07",
    bundlePath: "form1040.mailingAddress.street1",
    kind: "text",
    line: "header",
    label: "Home address (number and street)",
    section: "identity",
  },
  {
    pdfFieldName: "f1_08",
    bundlePath: "form1040.mailingAddress.street2",
    kind: "text",
    line: "header",
    label: "Apt. no.",
    section: "identity",
  },
  {
    pdfFieldName: "f1_09",
    bundlePath: "form1040.mailingAddress.city",
    kind: "text",
    line: "header",
    label: "City, town, or post office",
    section: "identity",
  },
  {
    pdfFieldName: "f1_10",
    bundlePath: "form1040.mailingAddress.state",
    kind: "text",
    line: "header",
    label: "State",
    section: "identity",
  },
  {
    pdfFieldName: "f1_11",
    bundlePath: "form1040.mailingAddress.zipCode",
    kind: "text",
    line: "header",
    label: "ZIP code",
    section: "identity",
  },

  // ─── Filing Status (checkboxes) ──────────────────────────────
  {
    pdfFieldName: "c1_01",
    bundlePath: "filing-status:single",
    kind: "checkbox",
    line: "filing-status",
    label: "Single",
    section: "filing-status",
  },
  {
    pdfFieldName: "c1_02",
    bundlePath: "filing-status:married_filing_jointly",
    kind: "checkbox",
    line: "filing-status",
    label: "Married filing jointly",
    section: "filing-status",
  },
  {
    pdfFieldName: "c1_03",
    bundlePath: "filing-status:married_filing_separately",
    kind: "checkbox",
    line: "filing-status",
    label: "Married filing separately",
    section: "filing-status",
  },
  {
    pdfFieldName: "c1_04",
    bundlePath: "filing-status:head_of_household",
    kind: "checkbox",
    line: "filing-status",
    label: "Head of household",
    section: "filing-status",
  },
  {
    pdfFieldName: "c1_05",
    bundlePath: "filing-status:qualifying_surviving_spouse",
    kind: "checkbox",
    line: "filing-status",
    label: "Qualifying surviving spouse",
    section: "filing-status",
  },

  // ─── Income (Lines 1-9) ──────────────────────────────────────
  {
    pdfFieldName: "f1_12",
    bundlePath: "form1040.lines.line1a",
    kind: "currency",
    line: "1a",
    label: "Wages, salaries, tips (W-2 box 1)",
    section: "income",
  },
  {
    pdfFieldName: "f1_13",
    bundlePath: "form1040.lines.line1b",
    kind: "currency",
    line: "1b",
    label: "Household employee income",
    section: "income",
  },
  {
    pdfFieldName: "f1_14",
    bundlePath: "form1040.lines.line1c",
    kind: "currency",
    line: "1c",
    label: "Tip income not on line 1a",
    section: "income",
  },
  {
    pdfFieldName: "f1_15",
    bundlePath: "form1040.lines.line1d",
    kind: "currency",
    line: "1d",
    label: "Medicaid waiver payments",
    section: "income",
  },
  {
    pdfFieldName: "f1_16",
    bundlePath: "form1040.lines.line1e",
    kind: "currency",
    line: "1e",
    label: "Taxable dependent care benefits",
    section: "income",
  },
  {
    pdfFieldName: "f1_17",
    bundlePath: "form1040.lines.line1f",
    kind: "currency",
    line: "1f",
    label: "Employer-provided adoption benefits",
    section: "income",
  },
  {
    pdfFieldName: "f1_18",
    bundlePath: "form1040.lines.line1g",
    kind: "currency",
    line: "1g",
    label: "Wages from Form 8919",
    section: "income",
  },
  {
    pdfFieldName: "f1_19",
    bundlePath: "form1040.lines.line1h",
    kind: "currency",
    line: "1h",
    label: "Strike benefits",
    section: "income",
  },
  {
    pdfFieldName: "f1_20",
    bundlePath: "form1040.lines.line2a",
    kind: "currency",
    line: "2a",
    label: "Tax-exempt interest",
    section: "income",
  },
  {
    pdfFieldName: "f1_21",
    bundlePath: "form1040.lines.line2b",
    kind: "currency",
    line: "2b",
    label: "Taxable interest",
    section: "income",
  },
  {
    pdfFieldName: "f1_22",
    bundlePath: "form1040.lines.line3a",
    kind: "currency",
    line: "3a",
    label: "Qualified dividends",
    section: "income",
  },
  {
    pdfFieldName: "f1_23",
    bundlePath: "form1040.lines.line3b",
    kind: "currency",
    line: "3b",
    label: "Ordinary dividends",
    section: "income",
  },
  {
    pdfFieldName: "f1_24",
    bundlePath: "form1040.lines.line4a",
    kind: "currency",
    line: "4a",
    label: "IRA distributions",
    section: "income",
  },
  {
    pdfFieldName: "f1_25",
    bundlePath: "form1040.lines.line4b",
    kind: "currency",
    line: "4b",
    label: "Taxable IRA amount",
    section: "income",
  },
  {
    pdfFieldName: "f1_26",
    bundlePath: "form1040.lines.line5a",
    kind: "currency",
    line: "5a",
    label: "Pensions and annuities",
    section: "income",
  },
  {
    pdfFieldName: "f1_27",
    bundlePath: "form1040.lines.line5b",
    kind: "currency",
    line: "5b",
    label: "Taxable pension amount",
    section: "income",
  },
  {
    pdfFieldName: "f1_28",
    bundlePath: "form1040.lines.line6a",
    kind: "currency",
    line: "6a",
    label: "Social security benefits",
    section: "income",
  },
  {
    pdfFieldName: "f1_29",
    bundlePath: "form1040.lines.line6b",
    kind: "currency",
    line: "6b",
    label: "Taxable social security",
    section: "income",
  },
  {
    pdfFieldName: "f1_30",
    bundlePath: "form1040.lines.line7",
    kind: "currency",
    line: "7",
    label: "Capital gain or (loss)",
    section: "income",
  },
  {
    pdfFieldName: "f1_31",
    bundlePath: "form1040.lines.line8",
    kind: "currency",
    line: "8",
    label: "Other income from Schedule 1, line 10",
    section: "income",
  },
  {
    pdfFieldName: "f1_32",
    bundlePath: "form1040.lines.line9",
    kind: "currency",
    line: "9",
    label: "Total income",
    section: "income",
  },

  // ─── Adjustments & Deductions (Lines 10-13) ──────────────────
  {
    pdfFieldName: "f1_33",
    bundlePath: "form1040.lines.line10",
    kind: "currency",
    line: "10",
    label: "Adjustments to income from Schedule 1, line 26",
    section: "deductions",
  },
  {
    pdfFieldName: "f1_34",
    bundlePath: "form1040.lines.line11",
    kind: "currency",
    line: "11",
    label: "Adjusted gross income",
    section: "deductions",
  },
  {
    pdfFieldName: "f1_35",
    bundlePath: "form1040.lines.line12a",
    kind: "currency",
    line: "12a",
    label: "Standard deduction",
    section: "deductions",
  },
  {
    pdfFieldName: "f1_36",
    bundlePath: "form1040.lines.line12b",
    kind: "currency",
    line: "12b",
    label: "Itemized deductions (Schedule A)",
    section: "deductions",
  },
  {
    pdfFieldName: "f1_37",
    bundlePath: "form1040.lines.line12c",
    kind: "currency",
    line: "12c",
    label: "Qualified business income deduction",
    section: "deductions",
  },
  {
    pdfFieldName: "f1_38",
    bundlePath: "form1040.lines.line12z",
    kind: "currency",
    line: "12z",
    label: "Total deductions",
    section: "deductions",
  },
  {
    pdfFieldName: "f1_39",
    bundlePath: "form1040.lines.line13",
    kind: "currency",
    line: "13",
    label: "Taxable income",
    section: "deductions",
  },

  // ─── Tax and Credits (Lines 14-24) ───────────────────────────
  {
    pdfFieldName: "f2_01",
    bundlePath: "form1040.lines.line14",
    kind: "currency",
    line: "14",
    label: "Tax (from Tax Table or Tax Computation Worksheet)",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_02",
    bundlePath: "form1040.lines.line15",
    kind: "currency",
    line: "15",
    label: "Amount from Schedule 2, Part I, line 4",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_03",
    bundlePath: "form1040.lines.line16",
    kind: "currency",
    line: "16",
    label: "Add lines 14 and 15",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_04",
    bundlePath: "form1040.lines.line17",
    kind: "currency",
    line: "17",
    label: "Amount from Schedule 3, line 8",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_05",
    bundlePath: "form1040.lines.line18",
    kind: "currency",
    line: "18",
    label: "Subtract line 17 from line 16",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_06",
    bundlePath: "form1040.lines.line19",
    kind: "currency",
    line: "19",
    label: "Other taxes from Schedule 2",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_07",
    bundlePath: "form1040.lines.line20",
    kind: "currency",
    line: "20",
    label: "Self-employment tax",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_08",
    bundlePath: "form1040.lines.line21",
    kind: "currency",
    line: "21",
    label: "Child tax credit / other credits",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_09",
    bundlePath: "form1040.lines.line22",
    kind: "currency",
    line: "22",
    label: "Amount from Schedule 2, Part II, line 21",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_10",
    bundlePath: "form1040.lines.line23",
    kind: "currency",
    line: "23",
    label: "Other taxes from Schedule 2",
    section: "tax-and-credits",
  },
  {
    pdfFieldName: "f2_11",
    bundlePath: "form1040.lines.line24",
    kind: "currency",
    line: "24",
    label: "Total tax",
    section: "tax-and-credits",
  },

  // ─── Payments (Lines 25-33) ──────────────────────────────────
  {
    pdfFieldName: "f2_12",
    bundlePath: "form1040.lines.line25a",
    kind: "currency",
    line: "25a",
    label: "Federal tax withheld from W-2s",
    section: "payments",
  },
  {
    pdfFieldName: "f2_13",
    bundlePath: "form1040.lines.line25b",
    kind: "currency",
    line: "25b",
    label: "Federal tax withheld from 1099s",
    section: "payments",
  },
  {
    pdfFieldName: "f2_14",
    bundlePath: "form1040.lines.line26",
    kind: "currency",
    line: "26",
    label: "Estimated tax payments",
    section: "payments",
  },
  {
    pdfFieldName: "f2_15",
    bundlePath: "form1040.lines.line27",
    kind: "currency",
    line: "27",
    label: "Earned income credit (EIC)",
    section: "payments",
  },
  {
    pdfFieldName: "f2_16",
    bundlePath: "form1040.lines.line28",
    kind: "currency",
    line: "28",
    label: "Additional child tax credit (Form 8812)",
    section: "payments",
  },
  {
    pdfFieldName: "f2_17",
    bundlePath: "form1040.lines.line29",
    kind: "currency",
    line: "29",
    label: "American opportunity credit (Form 8863, line 8)",
    section: "payments",
  },
  {
    pdfFieldName: "f2_18",
    bundlePath: "form1040.lines.line30",
    kind: "currency",
    line: "30",
    label: "Recovery rebate credit",
    section: "payments",
  },
  {
    pdfFieldName: "f2_19",
    bundlePath: "form1040.lines.line31",
    kind: "currency",
    line: "31",
    label: "Amount from Schedule 3, line 15",
    section: "payments",
  },
  {
    pdfFieldName: "f2_20",
    bundlePath: "form1040.lines.line32",
    kind: "currency",
    line: "32",
    label: "Add lines 27-31 (total other payments/credits)",
    section: "payments",
  },
  {
    pdfFieldName: "f2_21",
    bundlePath: "form1040.lines.line33",
    kind: "currency",
    line: "33",
    label: "Total payments",
    section: "payments",
  },

  // ─── Refund (Lines 34-36) ────────────────────────────────────
  {
    pdfFieldName: "f2_22",
    bundlePath: "form1040.lines.line34",
    kind: "currency",
    line: "34",
    label: "Overpayment (refund)",
    section: "refund",
  },
  {
    pdfFieldName: "f2_23",
    bundlePath: "form1040.lines.line35a",
    kind: "routing-number",
    line: "35a",
    label: "Routing number",
    section: "refund",
  },
  {
    pdfFieldName: "c2_01",
    bundlePath: "form1040.lines.line35b",
    kind: "account-type",
    line: "35b",
    label: "Account type (checking/savings)",
    section: "refund",
  },
  {
    pdfFieldName: "f2_24",
    bundlePath: "form1040.lines.line36",
    kind: "account-number",
    line: "36",
    label: "Account number",
    section: "refund",
  },

  // ─── Amount You Owe (Line 37) ────────────────────────────────
  {
    pdfFieldName: "f2_25",
    bundlePath: "form1040.lines.line37",
    kind: "currency",
    line: "37",
    label: "Amount you owe",
    section: "amount-owed",
  },
] as const;

/**
 * Group mappings by their section — useful for rendering a mock PDF
 * with section headers.
 */
export function groupBySection(): Map<Form1040Section, FormFieldMapping[]> {
  const groups = new Map<Form1040Section, FormFieldMapping[]>();
  for (const mapping of IRS_1040_FIELD_MAP) {
    const existing = groups.get(mapping.section) ?? [];
    existing.push(mapping);
    groups.set(mapping.section, existing);
  }
  return groups;
}

/**
 * Resolve a dot-notation bundlePath against a ReturnBundle.
 *
 * Handles special prefixes:
 *   - `filing-status:<status>` -> boolean (is this the active filing status?)
 *   - Normal dot paths like `form1040.lines.line1a`
 */
export function resolveBundlePath(
  bundle: ReturnBundle,
  bundlePath: string,
): string | number | boolean | undefined {
  // Filing status checkbox resolver
  if (bundlePath.startsWith("filing-status:")) {
    const targetStatus = bundlePath.slice("filing-status:".length);
    return bundle.form1040.filingStatus === targetStatus;
  }

  // Walk the dot path
  const segments = bundlePath.split(".");
  let current: unknown = bundle;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (current === null || current === undefined) {
    return undefined;
  }

  if (typeof current === "string" || typeof current === "number" || typeof current === "boolean") {
    return current;
  }

  return undefined;
}

/**
 * Section display order and labels for mock PDF rendering.
 */
export const SECTION_META: Record<Form1040Section, { order: number; title: string }> = {
  "header": { order: 0, title: "Form 1040 — U.S. Individual Income Tax Return (2025)" },
  "filing-status": { order: 1, title: "Filing Status" },
  "identity": { order: 2, title: "Taxpayer Information" },
  "dependents": { order: 3, title: "Dependents" },
  "income": { order: 4, title: "Income" },
  "deductions": { order: 5, title: "Adjustments & Deductions" },
  "tax-and-credits": { order: 6, title: "Tax and Credits" },
  "payments": { order: 7, title: "Payments" },
  "refund": { order: 8, title: "Refund" },
  "amount-owed": { order: 9, title: "Amount You Owe" },
  "signature": { order: 10, title: "Sign Here" },
};
