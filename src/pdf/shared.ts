import type {
  Form1099IntDocument,
  Form1099NecDocument,
  ImportedDocument,
  ReviewSummary,
  ValidationFlag,
  W2Document,
} from "../types.js";

export type PdfDocumentKind = ImportedDocument["type"] | "unknown";
export type PdfSource = string | Uint8Array | ArrayBuffer | Buffer;

export interface PdfReadOptions {
  fileName?: string;
  password?: string;
  typeHint?: Exclude<PdfDocumentKind, "unknown">;
  pageNumbers?: number[];
  includeRawText?: boolean;
}

export interface PdfTextPage {
  pageNumber: number;
  text: string;
}

export interface PdfReadResultBase {
  detectedType: PdfDocumentKind;
  confidence: number;
  pageCount: number;
  rawText: string;
  textPages: PdfTextPage[];
  flaggedFields: ValidationFlag[];
  sourceFileName?: string;
}

export type PdfReadResult =
  | (PdfReadResultBase & {
      detectedType: "w2";
      document: Partial<W2Document> & { type: "w2" };
    })
  | (PdfReadResultBase & {
      detectedType: "1099-nec";
      document: Partial<Form1099NecDocument> & { type: "1099-nec" };
    })
  | (PdfReadResultBase & {
      detectedType: "1099-int";
      document: Partial<Form1099IntDocument> & { type: "1099-int" };
    })
  | (PdfReadResultBase & {
      detectedType: "unknown";
      document: { type: "unknown" };
    });

export interface PdfReviewSectionItem {
  label: string;
  value: string;
  severity?: ValidationFlag["severity"];
}

export interface PdfReviewSection {
  title: string;
  items: PdfReviewSectionItem[];
}

export interface PdfReviewInput extends ReviewSummary {
  title: string;
  subtitle?: string;
  sections?: PdfReviewSection[];
  footer?: string[];
}

export interface PdfTemplateFieldValue {
  name: string;
  value: string | number | boolean | null | undefined;
  kind?: "text" | "checkbox" | "radio";
}

export interface PdfTemplateFillInput {
  template: PdfSource;
  fields: PdfTemplateFieldValue[];
  flatten?: boolean;
  title?: string;
  subject?: string;
  author?: string;
}

export interface PdfWriteResult {
  pdfBytes: Uint8Array;
  flaggedFields: ValidationFlag[];
  appliedFields: number;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function compactTextLines(text: string): string[] {
  return normalizePdfText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseMoney(text: string | undefined): number | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = text
    .replace(/[\s,$]/g, "")
    .replace(/[^\d().-]/g, "");

  if (!normalized) {
    return undefined;
  }

  const isNegative = normalized.startsWith("(") && normalized.endsWith(")");
  const stripped = normalized.replace(/[()]/g, "");
  const parsed = Number.parseFloat(stripped);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return isNegative ? -parsed : parsed;
}

export function formatTemplateValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(2).replace(/\.00$/, "");
  }

  return value;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findLineIndex(lines: string[], label: string): number {
  const lowerLabel = label.toLowerCase();
  return lines.findIndex((line) => line.toLowerCase().includes(lowerLabel));
}

export function extractMoneyNearLabel(
  text: string,
  labels: string[],
): number | undefined {
  const lines = compactTextLines(text);

  for (const label of labels) {
    const lowerLabel = label.toLowerCase();

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) {
        continue;
      }
      if (!line.toLowerCase().includes(lowerLabel)) {
        continue;
      }

      const sameLineMatch = line.match(/\(?-?\$?\d[\d,]*(?:\.\d{2})?\)?/g);
      const nextLine = lines[index + 1];
      const nextLineMatch = nextLine?.match(/\(?-?\$?\d[\d,]*(?:\.\d{2})?\)?/g);
      const token = sameLineMatch?.at(-1) ?? nextLineMatch?.at(-1);
      const parsed = parseMoney(token);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

export function extractTextNearLabel(
  text: string,
  labels: string[],
): string | undefined {
  const lines = compactTextLines(text);

  for (const label of labels) {
    const lowerLabel = label.toLowerCase();

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) {
        continue;
      }
      if (!line.toLowerCase().includes(lowerLabel)) {
        continue;
      }

      const tail = line
        .slice(line.toLowerCase().indexOf(lowerLabel) + label.length)
        .trim();
      if (tail) {
        return tail;
      }

      const nextLine = lines[index + 1];
      if (nextLine) {
        return nextLine;
      }
    }
  }

  return undefined;
}

export function firstMeaningfulLine(lines: string[]): string | undefined {
  return lines.find((line) => {
    const lower = line.toLowerCase();
    return (
      line.length > 1 &&
      !lower.includes("form ") &&
      !lower.includes("department of the treasury") &&
      !lower.includes("internal revenue service") &&
      !lower.includes("omb no.") &&
      !lower.includes("social security number")
    );
  });
}

export function createFlag(
  field: string,
  message: string,
  severity: ValidationFlag["severity"] = "review",
  source?: string,
): ValidationFlag {
  const flag: ValidationFlag = {
    field,
    severity,
    message,
  };

  if (source) {
    flag.source = source;
  }

  return flag;
}
