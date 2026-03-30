import { readFile } from "node:fs/promises";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type { ReviewSummary, ValidationFlag } from "../types.js";
import {
  compactTextLines,
  formatTemplateValue,
  type PdfReviewInput,
  type PdfReviewSection,
  type PdfSource,
  type PdfTemplateFillInput,
  type PdfWriteResult,
} from "./shared.js";

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const MARGIN = 48;

interface LayoutState {
  page: PDFPage;
  y: number;
  bodyFont: PDFFont;
  boldFont: PDFFont;
}

async function loadPdfBytes(source: PdfSource): Promise<Uint8Array> {
  if (typeof source === "string") {
    return new Uint8Array(await readFile(source));
  }

  if (source instanceof Uint8Array) {
    return source;
  }

  return new Uint8Array(source);
}

function ensurePageSpace(pdfDoc: PDFDocument, state: LayoutState, requiredSpace = 36): void {
  if (state.y > MARGIN + requiredSpace) {
    return;
  }

  state.page = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  state.y = LETTER_HEIGHT - MARGIN;
}

function drawWrappedLines(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    width: number;
    font: PDFFont;
    size: number;
    color?: ReturnType<typeof rgb>;
    lineGap?: number;
    bold?: boolean;
  },
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (options.font.widthOfTextAtSize(candidate, options.size) <= options.width) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  let currentY = options.y;
  const lineGap = options.lineGap ?? 14;

  for (const line of lines) {
    page.drawText(line, {
      x: options.x,
      y: currentY,
      size: options.size,
      font: options.font,
      color: options.color ?? rgb(0, 0, 0),
    });
    currentY -= lineGap;
  }

  return currentY;
}

function drawKeyValueLine(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
): number {
  page.drawText(`${label}:`, {
    x,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.12, 0.12, 0.12),
  });

  return drawWrappedLines(page, value, {
    x: x + 148,
    y,
    width: LETTER_WIDTH - MARGIN * 2 - 160,
    font,
    size: 11,
    color: rgb(0.18, 0.18, 0.18),
    lineGap: 13,
  });
}

function drawSection(
  pdfDoc: PDFDocument,
  state: LayoutState,
  title: string,
): void {
  ensurePageSpace(pdfDoc, state, 32);
  state.y -= 8;
  state.page.drawText(title, {
    x: MARGIN,
    y: state.y,
    size: 13,
    font: state.boldFont,
    color: rgb(0.13, 0.13, 0.13),
  });
  state.y -= 18;
}

function drawFlaggedFields(
  pdfDoc: PDFDocument,
  state: LayoutState,
  flaggedFields: ValidationFlag[],
): void {
  if (flaggedFields.length === 0) {
    state.page.drawText("None", {
      x: MARGIN,
      y: state.y,
      size: 11,
      font: state.bodyFont,
      color: rgb(0.2, 0.45, 0.2),
    });
    state.y -= 18;
    return;
  }

  for (const flag of flaggedFields) {
    ensurePageSpace(pdfDoc, state, 42);
    const bullet = flag.severity === "error" ? "!" : "•";
    const color =
      flag.severity === "error"
        ? rgb(0.75, 0.16, 0.16)
        : flag.severity === "warning"
          ? rgb(0.78, 0.48, 0.12)
          : rgb(0.25, 0.32, 0.58);
    const label = `${bullet} ${flag.field}`;

    state.page.drawText(label, {
      x: MARGIN,
      y: state.y,
      size: 11,
      font: state.boldFont,
      color,
    });
    state.y -= 13;
    state.y = drawWrappedLines(state.page, flag.message, {
      x: MARGIN + 14,
      y: state.y,
      width: LETTER_WIDTH - MARGIN * 2 - 18,
      font: state.bodyFont,
      size: 10.5,
      color,
      lineGap: 12,
    });
    state.y -= 6;
  }
}

function sectionItemsToLines(section: PdfReviewSection): string[] {
  return section.items.map((item) => `${item.label}: ${item.value}`);
}

export async function createReviewPdf(input: PdfReviewInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(input.title);
  pdfDoc.setSubject(input.subtitle ?? "Govforms review");
  pdfDoc.setAuthor("PigeonGov");

  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  let y = LETTER_HEIGHT - MARGIN;

  const state: LayoutState = {
    page,
    y,
    bodyFont,
    boldFont,
  };

  page.drawText(input.title, {
    x: MARGIN,
    y: state.y,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  state.y -= 26;

  if (input.subtitle) {
    state.y = drawWrappedLines(page, input.subtitle, {
      x: MARGIN,
      y: state.y,
      width: LETTER_WIDTH - MARGIN * 2,
      font: bodyFont,
      size: 11.5,
      color: rgb(0.35, 0.35, 0.35),
      lineGap: 14,
    });
    state.y -= 6;
  }

  drawSection(pdfDoc, state, "Summary");
  for (const note of input.notes) {
    ensurePageSpace(pdfDoc, state, 20);
    state.page.drawText(`• ${note}`, {
      x: MARGIN,
      y: state.y,
      size: 11,
      font: bodyFont,
      color: rgb(0.18, 0.18, 0.18),
    });
    state.y -= 15;
  }

  if (input.sections?.length) {
    for (const section of input.sections) {
      drawSection(pdfDoc, state, section.title);
      for (const line of sectionItemsToLines(section)) {
        ensurePageSpace(pdfDoc, state, 18);
        state.y = drawWrappedLines(state.page, line, {
          x: MARGIN,
          y: state.y,
          width: LETTER_WIDTH - MARGIN * 2,
          font: bodyFont,
          size: 11,
          color: rgb(0.18, 0.18, 0.18),
          lineGap: 13,
        });
        state.y -= 4;
      }
    }
  }

  drawSection(pdfDoc, state, "Flagged fields");
  drawFlaggedFields(pdfDoc, state, input.flaggedFields);

  if (input.footer?.length) {
    drawSection(pdfDoc, state, "Next steps");
    for (const line of input.footer) {
      ensurePageSpace(pdfDoc, state, 18);
      state.y = drawWrappedLines(state.page, line, {
        x: MARGIN,
        y: state.y,
        width: LETTER_WIDTH - MARGIN * 2,
        font: bodyFont,
        size: 10.5,
        color: rgb(0.22, 0.22, 0.22),
        lineGap: 12,
      });
      state.y -= 4;
    }
  }

  return pdfDoc.save();
}

export async function fillPdfTemplate(
  input: PdfTemplateFillInput,
): Promise<PdfWriteResult> {
  const bytes = await loadPdfBytes(input.template);
  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();
  const existingFields = new Set(form.getFields().map((field) => field.getName()));
  const flaggedFields: ValidationFlag[] = [];
  let appliedFields = 0;

  for (const field of input.fields) {
    if (!existingFields.has(field.name)) {
      flaggedFields.push({
        field: field.name,
        severity: "review",
        message: "Template does not expose a field with this name.",
      });
      continue;
    }

    try {
      if (field.kind === "checkbox" || typeof field.value === "boolean") {
        const checkbox = form.getCheckBox(field.name);
        if (field.value) {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
      } else if (field.kind === "radio") {
        form.getRadioGroup(field.name).select(formatTemplateValue(field.value));
      } else {
        form.getTextField(field.name).setText(formatTemplateValue(field.value));
      }
      appliedFields += 1;
    } catch (error) {
      flaggedFields.push({
        field: field.name,
        severity: "review",
        message:
          error instanceof Error
            ? `Could not fill field: ${error.message}`
            : "Could not fill field because the template field type was unexpected.",
      });
    }
  }

  if (input.flatten ?? true) {
    try {
      form.flatten();
    } catch (error) {
      flaggedFields.push({
        field: "template",
        severity: "review",
        message:
          error instanceof Error
            ? `Could not flatten PDF form: ${error.message}`
            : "Could not flatten PDF form.",
      });
    }
  }

  if (input.title) {
    pdfDoc.setTitle(input.title);
  }
  if (input.subject) {
    pdfDoc.setSubject(input.subject);
  }
  if (input.author) {
    pdfDoc.setAuthor(input.author);
  }

  return {
    pdfBytes: await pdfDoc.save(),
    flaggedFields,
    appliedFields,
  };
}

export function summarizeReviewSections(review: ReviewSummary): PdfReviewSection[] {
  return [
    {
      title: "Review notes",
      items: review.notes.map((note, index) => ({
        label: `Note ${index + 1}`,
        value: note,
      })),
    },
  ];
}

export function buildReviewFooter(flaggedFields: ValidationFlag[]): string[] {
  if (flaggedFields.length === 0) {
    return ["No flagged fields. Review complete."];
  }

  return [
    "Double-check any flagged fields before filing.",
    "Govforms does not submit returns to the IRS.",
  ];
}

export function splitLongText(text: string): string[] {
  return compactTextLines(text);
}
