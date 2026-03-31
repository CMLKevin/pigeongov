"use client";

import { useState, useTransition } from "react";
import type {
  SaveTransitionInput,
  SaveTransitionResult,
} from "@/lib/student-loans-types";
import { analyzeTransition } from "@/lib/student-loans-actions";
import TransitionResults from "./transition-results";

// ---------------------------------------------------------------------------
// Style tokens (match form-fields.tsx)
// ---------------------------------------------------------------------------

const inputBase =
  "w-full rounded-lg border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white placeholder:text-[#6b6b8a] " +
  "transition-all duration-200 " +
  "focus:border-[#6c3aed] focus:outline-none focus:ring-2 focus:ring-[#6c3aed]/40";

const labelBase = "block text-sm font-medium text-[#c4c4d4] mb-1.5";

const selectBase = `${inputBase} appearance-none pr-10`;

// ---------------------------------------------------------------------------
// Default form values
// ---------------------------------------------------------------------------

const defaults: SaveTransitionInput = {
  currentPlan: "SAVE",
  loanBalance: 0,
  interestRate: 0.05,
  annualIncome: 0,
  householdSize: 1,
  state: "CA",
  filingStatus: "single",
  monthsInRepayment: 0,
  monthsInSaveForbearance: 0,
  isParentPlusLoan: false,
  hasConsolidatedLoans: false,
  employerType: "other",
  monthsOfPSLFEmployment: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TransitionForm() {
  const [form, setForm] = useState<SaveTransitionInput>(defaults);
  const [result, setResult] = useState<SaveTransitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof SaveTransitionInput>(
    key: K,
    value: SaveTransitionInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await analyzeTransition(form);
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ----- Current plan & loan details ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Loan Details
          </legend>
          <div className="mt-2 grid gap-5 sm:grid-cols-2">
            {/* Current plan */}
            <div>
              <label htmlFor="currentPlan" className={labelBase}>
                Current repayment plan
              </label>
              <div className="relative">
                <select
                  id="currentPlan"
                  value={form.currentPlan}
                  onChange={(e) =>
                    update(
                      "currentPlan",
                      e.target.value as SaveTransitionInput["currentPlan"],
                    )
                  }
                  className={selectBase}
                >
                  <option value="SAVE">SAVE (ended)</option>
                  <option value="REPAYE">REPAYE (ended)</option>
                  <option value="PAYE">PAYE</option>
                  <option value="IBR">IBR</option>
                  <option value="ICR">ICR</option>
                  <option value="standard">Standard</option>
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* Loan balance */}
            <div>
              <label htmlFor="loanBalance" className={labelBase}>
                Loan balance
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] text-sm font-medium select-none">
                  $
                </span>
                <input
                  id="loanBalance"
                  type="number"
                  step="100"
                  min="0"
                  value={form.loanBalance || ""}
                  placeholder="45,000"
                  onChange={(e) =>
                    update("loanBalance", parseFloat(e.target.value) || 0)
                  }
                  className={`${inputBase} pl-8 tabular-nums`}
                />
              </div>
            </div>

            {/* Interest rate */}
            <div>
              <label htmlFor="interestRate" className={labelBase}>
                Interest rate
              </label>
              <div className="relative">
                <input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={
                    form.interestRate
                      ? (form.interestRate * 100).toFixed(1)
                      : ""
                  }
                  placeholder="5.0"
                  onChange={(e) =>
                    update(
                      "interestRate",
                      (parseFloat(e.target.value) || 0) / 100,
                    )
                  }
                  className={`${inputBase} pr-8 tabular-nums`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] text-sm font-medium select-none">
                  %
                </span>
              </div>
            </div>

            {/* Annual income */}
            <div>
              <label htmlFor="annualIncome" className={labelBase}>
                Annual income (AGI)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] text-sm font-medium select-none">
                  $
                </span>
                <input
                  id="annualIncome"
                  type="number"
                  step="1000"
                  min="0"
                  value={form.annualIncome || ""}
                  placeholder="55,000"
                  onChange={(e) =>
                    update("annualIncome", parseFloat(e.target.value) || 0)
                  }
                  className={`${inputBase} pl-8 tabular-nums`}
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* ----- Household & filing ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Household & Filing
          </legend>
          <div className="mt-2 grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="householdSize" className={labelBase}>
                Household size
              </label>
              <input
                id="householdSize"
                type="number"
                min="1"
                max="20"
                value={form.householdSize}
                onChange={(e) =>
                  update("householdSize", parseInt(e.target.value) || 1)
                }
                className={`${inputBase} tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="filingStatus" className={labelBase}>
                Filing status
              </label>
              <div className="relative">
                <select
                  id="filingStatus"
                  value={form.filingStatus}
                  onChange={(e) =>
                    update(
                      "filingStatus",
                      e.target.value as SaveTransitionInput["filingStatus"],
                    )
                  }
                  className={selectBase}
                >
                  <option value="single">Single</option>
                  <option value="married_filing_jointly">
                    Married filing jointly
                  </option>
                  <option value="married_filing_separately">
                    Married filing separately
                  </option>
                </select>
                <ChevronIcon />
              </div>
            </div>

            <div>
              <label htmlFor="state" className={labelBase}>
                State
              </label>
              <input
                id="state"
                type="text"
                maxLength={2}
                value={form.state}
                placeholder="CA"
                onChange={(e) =>
                  update("state", e.target.value.toUpperCase().slice(0, 2))
                }
                className={`${inputBase} uppercase`}
              />
            </div>
          </div>
        </fieldset>

        {/* ----- Repayment history ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Repayment History
          </legend>
          <div className="mt-2 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="monthsInRepayment" className={labelBase}>
                Months in repayment
              </label>
              <input
                id="monthsInRepayment"
                type="number"
                min="0"
                value={form.monthsInRepayment || ""}
                placeholder="36"
                onChange={(e) =>
                  update("monthsInRepayment", parseInt(e.target.value) || 0)
                }
                className={`${inputBase} tabular-nums`}
              />
              <p className="mt-1 text-xs text-[#6b6b8a]">
                Total months you&apos;ve been actively making payments
              </p>
            </div>

            <div>
              <label htmlFor="monthsInSaveForbearance" className={labelBase}>
                Months in SAVE forbearance
              </label>
              <input
                id="monthsInSaveForbearance"
                type="number"
                min="0"
                value={form.monthsInSaveForbearance || ""}
                placeholder="12"
                onChange={(e) =>
                  update(
                    "monthsInSaveForbearance",
                    parseInt(e.target.value) || 0,
                  )
                }
                className={`${inputBase} tabular-nums`}
              />
              <p className="mt-1 text-xs text-amber-400/70">
                These months do NOT count toward forgiveness
              </p>
            </div>
          </div>
        </fieldset>

        {/* ----- Parent PLUS & consolidation ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Loan Type
          </legend>
          <div className="mt-2 space-y-4">
            <div className="flex items-start gap-3">
              <input
                id="isParentPlusLoan"
                type="checkbox"
                checked={form.isParentPlusLoan}
                onChange={(e) =>
                  update("isParentPlusLoan", e.target.checked)
                }
                className="mt-0.5 h-5 w-5 rounded border-white/10 bg-[#1a1a2e] text-[#6c3aed] accent-[#6c3aed] cursor-pointer"
              />
              <label
                htmlFor="isParentPlusLoan"
                className="text-sm text-[#c4c4d4] cursor-pointer select-none"
              >
                This is a Parent PLUS loan
                <span className="block text-xs text-[#6b6b8a] mt-0.5">
                  Parent PLUS loans have a July 1, 2026 consolidation deadline
                </span>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="hasConsolidatedLoans"
                type="checkbox"
                checked={form.hasConsolidatedLoans}
                onChange={(e) =>
                  update("hasConsolidatedLoans", e.target.checked)
                }
                className="mt-0.5 h-5 w-5 rounded border-white/10 bg-[#1a1a2e] text-[#6c3aed] accent-[#6c3aed] cursor-pointer"
              />
              <label
                htmlFor="hasConsolidatedLoans"
                className="text-sm text-[#c4c4d4] cursor-pointer select-none"
              >
                Already consolidated via Direct Consolidation Loan
              </label>
            </div>
          </div>
        </fieldset>

        {/* ----- Employer & PSLF ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Employment & PSLF
          </legend>
          <div className="mt-2 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="employerType" className={labelBase}>
                Employer type
              </label>
              <div className="relative">
                <select
                  id="employerType"
                  value={form.employerType}
                  onChange={(e) =>
                    update(
                      "employerType",
                      e.target.value as SaveTransitionInput["employerType"],
                    )
                  }
                  className={selectBase}
                >
                  <option value="government">Government</option>
                  <option value="nonprofit">Non-profit (501(c)(3))</option>
                  <option value="forprofit">For-profit</option>
                  <option value="other">Other</option>
                </select>
                <ChevronIcon />
              </div>
            </div>

            <div>
              <label htmlFor="monthsOfPSLFEmployment" className={labelBase}>
                Months of qualifying PSLF employment
              </label>
              <input
                id="monthsOfPSLFEmployment"
                type="number"
                min="0"
                value={form.monthsOfPSLFEmployment || ""}
                placeholder="60"
                onChange={(e) =>
                  update(
                    "monthsOfPSLFEmployment",
                    parseInt(e.target.value) || 0,
                  )
                }
                className={`${inputBase} tabular-nums`}
              />
            </div>
          </div>
        </fieldset>

        {/* ----- Submit ----- */}
        <button
          type="submit"
          disabled={isPending || form.loanBalance <= 0 || form.annualIncome <= 0}
          className="w-full rounded-xl bg-gradient-to-r from-[#6c3aed] to-[#d946ef] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:shadow-[0_4px_24px_-4px_rgba(108,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  className="opacity-75"
                />
              </svg>
              Analyzing your options...
            </span>
          ) : (
            "Analyze My Options"
          )}
        </button>
      </form>

      {/* ----- Error ----- */}
      {error && (
        <div className="mt-8 rounded-xl border border-red-500/40 bg-red-500/5 p-5">
          <h3 className="text-sm font-semibold text-red-400">
            Analysis failed
          </h3>
          <p className="mt-1 text-sm text-[#a0a0b8]">{error}</p>
          <p className="mt-2 text-xs text-[#6b6b8a]">
            Make sure the PigeonGov engine is built (run{" "}
            <code className="bg-[#1a1a2e] px-1.5 py-0.5 rounded text-[#c4c4d4]">
              npm run build
            </code>{" "}
            in the project root).
          </p>
        </div>
      )}

      {/* ----- Results ----- */}
      {result && <TransitionResults result={result} input={form} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared chevron icon for selects
// ---------------------------------------------------------------------------

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b6b8a]"
    >
      <path
        fillRule="evenodd"
        d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
