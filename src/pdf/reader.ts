import { readFile } from "node:fs/promises";

import { PDFParse } from "pdf-parse";

import type {
  Form1099IntDocument,
  Form1099NecDocument,
  ValidationFlag,
  W2Document,
} from "../types.js";
import {
  createFlag,
  extractMoneyNearLabel,
  extractTextNearLabel,
  firstMeaningfulLine,
  normalizePdfText,
  type PdfDocumentKind,
  type PdfReadOptions,
  type PdfReadResult,
  type PdfSource,
} from "./shared.js";
import { hasTesseract, ocrExtractText } from "./ocr.js";

function toBytes(source: PdfSource): Uint8Array {
  if (typeof source === "string") {
    throw new Error(
      "String sources are treated as file paths by readPdfDocument; pass bytes to parse a string directly.",
    );
  }

  if (source instanceof Uint8Array) {
    return source;
  }

  return new Uint8Array(source);
}

async function loadSourceBytes(source: PdfSource): Promise<{ bytes: Uint8Array; fileName?: string }> {
  if (typeof source === "string") {
    const result: { bytes: Uint8Array; fileName?: string } = {
      bytes: new Uint8Array(await readFile(source)),
    };
    const fileName = source.split(/[\\/]/).at(-1);
    if (fileName) {
      result.fileName = fileName;
    }
    return result;
  }

  return { bytes: toBytes(source) };
}

function detectDocumentType(text: string, typeHint?: Exclude<PdfDocumentKind, "unknown">): {
  detectedType: PdfDocumentKind;
  confidence: number;
  reasons: string[];
} {
  const normalized = text.toLowerCase();
  const reasons: string[] = [];
  const scores: Record<Exclude<PdfDocumentKind, "unknown">, number> = {
    w2: 0,
    "1099-nec": 0,
    "1099-int": 0,
    "1098": 0,
    "1095-a": 0,
    "1099-div": 0,
    "1099-b": 0,
    "1099-r": 0,
    "k-1": 0,
  };

  if (normalized.includes("form w-2")) {
    scores.w2 += 3;
    reasons.push("matched Form W-2 heading");
  }
  if (normalized.includes("wages, tips, other compensation")) {
    scores.w2 += 2;
    reasons.push("matched W-2 wage label");
  }
  if (normalized.includes("social security wages")) {
    scores.w2 += 1;
  }
  if (normalized.includes("form 1099-nec")) {
    scores["1099-nec"] += 3;
    reasons.push("matched Form 1099-NEC heading");
  }
  if (normalized.includes("nonemployee compensation")) {
    scores["1099-nec"] += 2;
    reasons.push("matched 1099-NEC compensation label");
  }
  if (normalized.includes("form 1099-int")) {
    scores["1099-int"] += 3;
    reasons.push("matched Form 1099-INT heading");
  }
  if (normalized.includes("interest income")) {
    scores["1099-int"] += 2;
    reasons.push("matched 1099-INT interest label");
  }

  // New document type scoring
  if (normalized.includes("form 1098") || normalized.includes("mortgage interest statement")) {
    scores["1098"] += 3;
    reasons.push("matched Form 1098 heading");
  }
  if (normalized.includes("mortgage interest received")) {
    scores["1098"] += 2;
  }

  if (normalized.includes("form 1095-a") || normalized.includes("health insurance marketplace")) {
    scores["1095-a"] += 3;
    reasons.push("matched Form 1095-A heading");
  }
  if (normalized.includes("monthly enrollment premiums")) {
    scores["1095-a"] += 2;
  }

  if (normalized.includes("form 1099-div")) {
    scores["1099-div"] += 3;
    reasons.push("matched Form 1099-DIV heading");
  }
  if (normalized.includes("ordinary dividends") && normalized.includes("qualified dividends")) {
    scores["1099-div"] += 2;
  }

  if (normalized.includes("form 1099-b") || normalized.includes("proceeds from broker")) {
    scores["1099-b"] += 3;
    reasons.push("matched Form 1099-B heading");
  }
  if (normalized.includes("cost or other basis") && normalized.includes("proceeds")) {
    scores["1099-b"] += 2;
  }

  if (normalized.includes("form 1099-r")) {
    scores["1099-r"] += 3;
    reasons.push("matched Form 1099-R heading");
  }
  if (normalized.includes("gross distribution") && normalized.includes("taxable amount")) {
    scores["1099-r"] += 2;
  }

  if (normalized.includes("schedule k-1") || normalized.includes("partner's share")) {
    scores["k-1"] += 3;
    reasons.push("matched Schedule K-1 heading");
  }
  if (normalized.includes("ordinary business income")) {
    scores["k-1"] += 2;
  }

  if (typeHint) {
    scores[typeHint] += 1.5;
    reasons.push(`type hint: ${typeHint}`);
  }

  const entries = Object.entries(scores) as Array<
    [Exclude<PdfDocumentKind, "unknown">, number]
  >;
  entries.sort((left, right) => right[1] - left[1]);

  const [bestType, bestScore] = entries[0] ?? ["unknown", 0];
  const secondScore = entries[1]?.[1] ?? 0;
  const confidence = bestScore <= 0 ? 0 : Math.min(1, Math.max(0.35, (bestScore - secondScore + 1) / 4));

  if (bestScore <= 0) {
    return {
      detectedType: typeHint ?? "unknown",
      confidence: typeHint ? 0.45 : 0,
      reasons,
    };
  }

  return {
    detectedType: bestType,
    confidence,
    reasons,
  };
}

function normalizeSourceName(options: PdfReadOptions, fallback?: string): string | undefined {
  return options.fileName ?? fallback;
}

function buildW2Document(text: string): Partial<W2Document> & { type: "w2" } {
  const lines = normalizePdfText(text).split("\n");
  const employerName =
    firstMeaningfulLine(lines) ??
    extractTextNearLabel(text, ["Employer's name", "Employer name", "Employer"]) ??
    "";
  const employeeName =
    extractTextNearLabel(text, ["Employee's first name and initial", "Employee name"]) ??
    undefined;

  const document: Partial<W2Document> & { type: "w2" } = {
    type: "w2",
    employerName,
    wages: extractMoneyNearLabel(text, [
      "Wages, tips, other compensation",
      "Box 1",
      "1 Wages",
    ]) ?? 0,
    federalWithheld:
      extractMoneyNearLabel(text, [
        "Federal income tax withheld",
        "Box 2",
        "2 Federal income tax withheld",
      ]) ?? 0,
  };

  if (employeeName) {
    document.employeeName = employeeName;
  }

  const employerEin = extractTextNearLabel(text, ["Employer identification number", "EIN"]);
  if (employerEin) {
    document.employerEin = employerEin;
  }

  const socialSecurityWages = extractMoneyNearLabel(text, ["Social security wages", "Box 3"]);
  if (socialSecurityWages !== undefined) {
    document.socialSecurityWages = socialSecurityWages;
  }

  const medicareWages = extractMoneyNearLabel(text, ["Medicare wages and tips", "Box 5"]);
  if (medicareWages !== undefined) {
    document.medicareWages = medicareWages;
  }

  return document;
}

function build1099NecDocument(text: string): Partial<Form1099NecDocument> & { type: "1099-nec" } {
  const lines = normalizePdfText(text).split("\n");
  const payerName =
    firstMeaningfulLine(lines) ??
    extractTextNearLabel(text, ["Payer's name", "Payer name", "PAYER"]) ??
    "";

  const document: Partial<Form1099NecDocument> & { type: "1099-nec" } = {
    type: "1099-nec",
    payerName,
    nonemployeeCompensation:
      extractMoneyNearLabel(text, [
        "Nonemployee compensation",
        "Box 1",
        "1 Nonemployee compensation",
      ]) ?? 0,
  };

  const federalWithheld = extractMoneyNearLabel(text, [
    "Federal income tax withheld",
    "Box 4",
    "4 Federal income tax withheld",
  ]);
  if (federalWithheld !== undefined) {
    document.federalWithheld = federalWithheld;
  }

  return document;
}

function build1099IntDocument(text: string): Partial<Form1099IntDocument> & { type: "1099-int" } {
  const lines = normalizePdfText(text).split("\n");
  const payerName =
    firstMeaningfulLine(lines) ??
    extractTextNearLabel(text, ["Payer's name", "Payer name", "PAYER"]) ??
    "";

  const document: Partial<Form1099IntDocument> & { type: "1099-int" } = {
    type: "1099-int",
    payerName,
    interestIncome:
      extractMoneyNearLabel(text, ["Interest income", "Box 1", "1 Interest income"]) ?? 0,
  };

  const federalWithheld = extractMoneyNearLabel(text, [
    "Federal income tax withheld",
    "Box 4",
    "4 Federal income tax withheld",
  ]);
  if (federalWithheld !== undefined) {
    document.federalWithheld = federalWithheld;
  }

  return document;
}

function buildFallbackDocument(detectedType: PdfDocumentKind): { type: "unknown" } {
  return {
    type: "unknown",
  };
}

export async function readPdfDocument(
  source: PdfSource,
  options: PdfReadOptions = {},
): Promise<PdfReadResult> {
  const { bytes, fileName } = await loadSourceBytes(source);
  const parser = new PDFParse({ data: bytes });

  try {
    const textResult = await parser.getText({
      ...(options.pageNumbers ? { partial: options.pageNumbers } : {}),
      pageJoiner: "\n",
      itemJoiner: " ",
      includeMarkedContent: false,
      disableNormalization: false,
      lineEnforce: true,
      parseHyperlinks: false,
    });

    const textPages = textResult.pages.map((page) => ({
      pageNumber: page.num,
      text: normalizePdfText(page.text),
    }));
    let rawText = normalizePdfText(textResult.text);
    let ocrUsed = false;

    // If the native text layer is suspiciously short and Tesseract is
    // available, fall back to OCR. This handles scanned PDFs that are
    // essentially images with no embedded text.
    const OCR_THRESHOLD = 50;
    if (rawText.length < OCR_THRESHOLD && hasTesseract()) {
      try {
        const ocrText = await ocrExtractText(bytes);
        if (ocrText.trim().length > rawText.length) {
          rawText = normalizePdfText(ocrText);
          ocrUsed = true;
        }
      } catch {
        // OCR failed — proceed with whatever text we managed to extract.
      }
    }

    const detection = detectDocumentType(rawText, options.typeHint);
    const sourceFileName = normalizeSourceName(options, fileName);
    const flaggedFields: ValidationFlag[] = [];

    if (options.typeHint && detection.detectedType !== options.typeHint) {
      flaggedFields.push(
        createFlag(
          "documentType",
          `Type hint ${options.typeHint} disagrees with heuristic detection of ${detection.detectedType}.`,
          "review",
          sourceFileName,
        ),
      );
    }

    if (detection.detectedType === "w2") {
      const document = buildW2Document(rawText);
      if (!document.employerName) {
        flaggedFields.push(
          createFlag(
            "employerName",
            "Employer name was not confidently extracted.",
            "review",
            sourceFileName,
          ),
        );
      }
      if (document.wages === 0) {
        flaggedFields.push(
          createFlag(
            "wages",
            "W-2 wages could not be confidently extracted.",
            "review",
            sourceFileName,
          ),
        );
      }

      const result: PdfReadResult = {
        detectedType: "w2",
        confidence: detection.confidence,
        pageCount: textResult.total,
        rawText: options.includeRawText === false ? "" : rawText,
        textPages,
        flaggedFields,
        document,
        ocrUsed,
      };
      if (sourceFileName) {
        result.sourceFileName = sourceFileName;
      }
      return result;
    }

    if (detection.detectedType === "1099-nec") {
      const document = build1099NecDocument(rawText);
      if (!document.payerName) {
        flaggedFields.push(
          createFlag(
            "payerName",
            "Payer name was not confidently extracted.",
            "review",
            sourceFileName,
          ),
        );
      }
      if (document.nonemployeeCompensation === 0) {
        flaggedFields.push(
          createFlag(
            "nonemployeeCompensation",
            "1099-NEC compensation could not be confidently extracted.",
            "review",
            sourceFileName,
          ),
        );
      }

      const result: PdfReadResult = {
        detectedType: "1099-nec",
        confidence: detection.confidence,
        pageCount: textResult.total,
        rawText: options.includeRawText === false ? "" : rawText,
        textPages,
        flaggedFields,
        document,
        ocrUsed,
      };
      if (sourceFileName) {
        result.sourceFileName = sourceFileName;
      }
      return result;
    }

    if (detection.detectedType === "1099-int") {
      const document = build1099IntDocument(rawText);
      if (!document.payerName) {
        flaggedFields.push(
          createFlag(
            "payerName",
            "Payer name was not confidently extracted.",
            "review",
            sourceFileName,
          ),
        );
      }
      if (document.interestIncome === 0) {
        flaggedFields.push(
          createFlag(
            "interestIncome",
            "1099-INT interest income could not be confidently extracted.",
            "review",
            sourceFileName,
          ),
        );
      }

      const result: PdfReadResult = {
        detectedType: "1099-int",
        confidence: detection.confidence,
        pageCount: textResult.total,
        rawText: options.includeRawText === false ? "" : rawText,
        textPages,
        flaggedFields,
        document,
        ocrUsed,
      };
      if (sourceFileName) {
        result.sourceFileName = sourceFileName;
      }
      return result;
    }

    const document = buildFallbackDocument(detection.detectedType);
    flaggedFields.push(
      createFlag(
        "documentType",
        "Could not confidently identify the PDF as a W-2 or 1099 form.",
        "review",
        sourceFileName,
      ),
    );

    const result: PdfReadResult = {
      detectedType: "unknown",
      confidence: detection.confidence,
      pageCount: textResult.total,
      rawText: options.includeRawText === false ? "" : rawText,
      textPages,
      flaggedFields,
      document,
      ocrUsed,
    };
    if (sourceFileName) {
      result.sourceFileName = sourceFileName;
    }
    return result;
  } finally {
    await parser.destroy();
  }
}
