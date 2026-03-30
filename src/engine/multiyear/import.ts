// ---------------------------------------------------------------------------
// Prior-Year Return Import
// ---------------------------------------------------------------------------
// Import data from a previous year's return bundle to pre-fill the
// current year. The goal: minimize re-entry of stable information
// (identity, address, dependents, bank accounts) while flagging
// anything that likely needs updating.
//
// This is the "are these still correct?" module — because life changes
// but your SSN doesn't.
// ---------------------------------------------------------------------------

export interface ImportResult {
  prefilled: Record<string, unknown>;
  fieldsImported: string[];
  fieldsSkipped: string[];
  notes: string[];
}

/**
 * Fields that are stable year-over-year and safe to import directly.
 */
const IMPORTABLE_IDENTITY_FIELDS = [
  "firstName",
  "lastName",
  "ssn",
  "dateOfBirth",
] as const;

const IMPORTABLE_ADDRESS_FIELDS = [
  "street1",
  "street2",
  "city",
  "state",
  "zipCode",
] as const;

/**
 * Fields that should NOT be imported because they're year-specific.
 */
const SKIP_FIELDS = new Set([
  "federalWithheld",
  "estimatedPayments",
  "wages",
  "taxableInterest",
  "ordinaryDividends",
  "scheduleCNet",
  "otherIncome",
  "refund",
  "amountOwed",
  "totalTax",
  "totalPayments",
  "calculation",
  "validation",
  "review",
  "outputArtifacts",
  "provenance",
  "filledForm",
]);

function safeGet(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function safeSet(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;
}

/**
 * Import stable data from a previous year's return bundle.
 *
 * Imports:
 * - Identity (name, SSN, DOB)
 * - Address (with a note to verify — people move)
 * - Dependents (with count verification prompt)
 * - Filing status (as a suggestion, not a lock)
 * - Recurring income source labels (not amounts)
 * - Bank account info for direct deposit
 *
 * Skips:
 * - All dollar amounts (income, withholding, payments, results)
 * - Calculation results, validation, review summaries
 * - Year-specific artifacts
 */
export function importFromPreviousYear(
  previousBundle: Record<string, unknown>,
): ImportResult {
  const prefilled: Record<string, unknown> = {};
  const fieldsImported: string[] = [];
  const fieldsSkipped: string[] = [];
  const notes: string[] = [];

  // --- Identity ---
  const applicant = safeGet(previousBundle, "applicant") as
    | Record<string, unknown>
    | undefined;
  if (applicant && typeof applicant === "object") {
    const importedApplicant: Record<string, unknown> = {};

    for (const field of IMPORTABLE_IDENTITY_FIELDS) {
      const value = applicant[field];
      if (value !== undefined && value !== null) {
        importedApplicant[field] = value;
        fieldsImported.push(`applicant.${field}`);
      }
    }

    // Import address with verification note
    const address = applicant["address"] as
      | Record<string, unknown>
      | undefined;
    if (address && typeof address === "object") {
      const importedAddress: Record<string, unknown> = {};
      for (const field of IMPORTABLE_ADDRESS_FIELDS) {
        const value = address[field];
        if (value !== undefined && value !== null) {
          importedAddress[field] = value;
          fieldsImported.push(`applicant.address.${field}`);
        }
      }
      importedApplicant["address"] = importedAddress;
      notes.push("Address imported from last year. Has your address changed?");
    }

    prefilled["applicant"] = importedApplicant;
  }

  // --- Filing status ---
  const filingStatus = safeGet(previousBundle, "filingStatus") ??
    safeGet(previousBundle, "answers.filingStatus");
  if (filingStatus !== undefined) {
    prefilled["filingStatus"] = filingStatus;
    fieldsImported.push("filingStatus");
    notes.push(
      `Last year you filed as "${String(filingStatus)}". Has your filing status changed?`,
    );
  }

  // --- Dependents ---
  const dependents = safeGet(previousBundle, "dependents") ??
    safeGet(previousBundle, "answers.dependents") ??
    safeGet(previousBundle, "household");
  if (Array.isArray(dependents)) {
    prefilled["dependents"] = dependents;
    fieldsImported.push("dependents");
    notes.push(
      `Last year you had ${dependents.length} dependent(s). Still correct?`,
    );
  }

  // --- Bank account info (for direct deposit) ---
  const bankAccount = safeGet(previousBundle, "bankAccount") ??
    safeGet(previousBundle, "answers.bankAccount");
  if (bankAccount !== undefined && bankAccount !== null) {
    prefilled["bankAccount"] = bankAccount;
    fieldsImported.push("bankAccount");
    notes.push("Bank account for direct deposit imported. Please verify.");
  }

  // --- Recurring income source labels (not amounts) ---
  const answers = previousBundle["answers"] as
    | Record<string, unknown>
    | undefined;
  if (answers && typeof answers === "object") {
    const incomeSourceLabels: string[] = [];

    // Check for W-2 employers
    const w2s = answers["w2Documents"] ?? answers["w2s"];
    if (Array.isArray(w2s)) {
      for (const w2 of w2s) {
        if (typeof w2 === "object" && w2 !== null) {
          const employer = (w2 as Record<string, unknown>)["employerName"];
          if (typeof employer === "string") {
            incomeSourceLabels.push(`W-2: ${employer}`);
          }
        }
      }
    }

    // Check for 1099 sources
    const docs1099 = answers["form1099s"] ?? answers["documents"];
    if (Array.isArray(docs1099)) {
      for (const doc of docs1099) {
        if (typeof doc === "object" && doc !== null) {
          const payer = (doc as Record<string, unknown>)["payerName"];
          const docType = (doc as Record<string, unknown>)["type"];
          if (typeof payer === "string") {
            incomeSourceLabels.push(
              `${typeof docType === "string" ? docType.toUpperCase() : "1099"}: ${payer}`,
            );
          }
        }
      }
    }

    if (incomeSourceLabels.length > 0) {
      prefilled["priorIncomeSources"] = incomeSourceLabels;
      fieldsImported.push("priorIncomeSources");
      notes.push(
        `Found ${incomeSourceLabels.length} income source(s) from last year. ` +
          "Do you still have these same sources?",
      );
    }
  }

  // --- Track skipped fields ---
  for (const key of Object.keys(previousBundle)) {
    if (SKIP_FIELDS.has(key) || key in prefilled) {
      if (SKIP_FIELDS.has(key)) {
        fieldsSkipped.push(key);
      }
    }
  }

  return { prefilled, fieldsImported, fieldsSkipped, notes };
}
