"use client";

import { useState, useTransition } from "react";
import type {
  PSLFTrackerInput,
  PSLFTrackerResult,
} from "@/lib/student-loans-types";
import { trackPSLFAction } from "@/lib/student-loans-actions";
import PSLFResults from "./pslf-results";

// ---------------------------------------------------------------------------
// Style tokens
// ---------------------------------------------------------------------------

const inputBase =
  "w-full rounded-lg border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white placeholder:text-[#6b6b8a] " +
  "transition-all duration-200 " +
  "focus:border-[#6c3aed] focus:outline-none focus:ring-2 focus:ring-[#6c3aed]/40";

const labelBase = "block text-sm font-medium text-[#c4c4d4] mb-1.5";

const selectBase = `${inputBase} appearance-none pr-10`;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaults: PSLFTrackerInput = {
  qualifyingPaymentsMade: 0,
  monthsInForbearance: 0,
  monthsInDeferment: 0,
  employerType: "government",
  employerName: "",
  loanBalance: 0,
  annualIncome: 0,
  householdSize: 1,
  isOnIDRPlan: true,
  currentMonthlyPayment: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PSLFForm() {
  const [form, setForm] = useState<PSLFTrackerInput>(defaults);
  const [result, setResult] = useState<PSLFTrackerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof PSLFTrackerInput>(
    key: K,
    value: PSLFTrackerInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await trackPSLFAction(form);
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
        {/* ----- Payment progress ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Payment Progress
          </legend>
          <div className="mt-2 grid gap-5 sm:grid-cols-3">
            <div>
              <label
                htmlFor="qualifyingPaymentsMade"
                className={labelBase}
              >
                Qualifying payments made
              </label>
              <input
                id="qualifyingPaymentsMade"
                type="number"
                min="0"
                max="120"
                value={form.qualifyingPaymentsMade || ""}
                placeholder="48"
                onChange={(e) =>
                  update(
                    "qualifyingPaymentsMade",
                    parseInt(e.target.value) || 0,
                  )
                }
                className={`${inputBase} tabular-nums`}
              />
              <p className="mt-1 text-xs text-[#6b6b8a]">Out of 120 needed</p>
            </div>

            <div>
              <label htmlFor="monthsInForbearance" className={labelBase}>
                Months in forbearance
              </label>
              <input
                id="monthsInForbearance"
                type="number"
                min="0"
                value={form.monthsInForbearance || ""}
                placeholder="12"
                onChange={(e) =>
                  update(
                    "monthsInForbearance",
                    parseInt(e.target.value) || 0,
                  )
                }
                className={`${inputBase} tabular-nums`}
              />
              <p className="mt-1 text-xs text-amber-400/70">
                Do not count toward PSLF
              </p>
            </div>

            <div>
              <label htmlFor="monthsInDeferment" className={labelBase}>
                Months in deferment
              </label>
              <input
                id="monthsInDeferment"
                type="number"
                min="0"
                value={form.monthsInDeferment || ""}
                placeholder="0"
                onChange={(e) =>
                  update(
                    "monthsInDeferment",
                    parseInt(e.target.value) || 0,
                  )
                }
                className={`${inputBase} tabular-nums`}
              />
            </div>
          </div>
        </fieldset>

        {/* ----- Employer ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Employer
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
                      e.target.value as PSLFTrackerInput["employerType"],
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
              <label htmlFor="employerName" className={labelBase}>
                Employer name (optional)
              </label>
              <input
                id="employerName"
                type="text"
                value={form.employerName ?? ""}
                placeholder="e.g. Department of Education"
                onChange={(e) => update("employerName", e.target.value)}
                className={inputBase}
              />
            </div>
          </div>
        </fieldset>

        {/* ----- Loan & income ----- */}
        <fieldset className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <legend className="px-2 text-base font-semibold text-white">
            Loan & Income
          </legend>
          <div className="mt-2 grid gap-5 sm:grid-cols-2">
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
              <label htmlFor="currentMonthlyPayment" className={labelBase}>
                Current monthly payment
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] text-sm font-medium select-none">
                  $
                </span>
                <input
                  id="currentMonthlyPayment"
                  type="number"
                  step="1"
                  min="0"
                  value={form.currentMonthlyPayment || ""}
                  placeholder="250"
                  onChange={(e) =>
                    update(
                      "currentMonthlyPayment",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className={`${inputBase} pl-8 tabular-nums`}
                />
              </div>
            </div>
          </div>

          {/* IDR checkbox */}
          <div className="mt-5 flex items-start gap-3">
            <input
              id="isOnIDRPlan"
              type="checkbox"
              checked={form.isOnIDRPlan}
              onChange={(e) => update("isOnIDRPlan", e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-white/10 bg-[#1a1a2e] text-[#6c3aed] accent-[#6c3aed] cursor-pointer"
            />
            <label
              htmlFor="isOnIDRPlan"
              className="text-sm text-[#c4c4d4] cursor-pointer select-none"
            >
              Currently on an income-driven repayment (IDR) plan
              <span className="block text-xs text-[#6b6b8a] mt-0.5">
                Only IDR or 10-year standard payments count toward PSLF
              </span>
            </label>
          </div>
        </fieldset>

        {/* ----- Submit ----- */}
        <button
          type="submit"
          disabled={isPending || form.loanBalance <= 0}
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
              Tracking...
            </span>
          ) : (
            "Track My PSLF Progress"
          )}
        </button>
      </form>

      {/* ----- Error ----- */}
      {error && (
        <div className="mt-8 rounded-xl border border-red-500/40 bg-red-500/5 p-5">
          <h3 className="text-sm font-semibold text-red-400">
            Tracking failed
          </h3>
          <p className="mt-1 text-sm text-[#a0a0b8]">{error}</p>
          <p className="mt-2 text-xs text-[#6b6b8a]">
            Make sure the PigeonGov engine is built.
          </p>
        </div>
      )}

      {/* ----- Results ----- */}
      {result && <PSLFResults result={result} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared chevron icon
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
