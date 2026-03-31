"use client";

import { useState, useTransition } from "react";
import type {
  SaveTransitionInput,
  CompareResult,
  PlanComparisonEntry,
} from "@/lib/student-loans-types";
import { comparePlansAction } from "@/lib/student-loans-actions";

// ---------------------------------------------------------------------------
// Style tokens
// ---------------------------------------------------------------------------

const inputBase =
  "w-full rounded-lg border-2 border-[#3d2a7a] bg-[#1a1040] px-4 py-3 text-white font-mono placeholder:text-[#6b5b8a] " +
  "transition-all duration-200 " +
  "focus:border-[#4ade80] focus:outline-none focus:ring-2 focus:ring-[#4ade80]/20";

const labelBase = "block text-sm font-semibold text-[#c4b5fd] font-mono uppercase tracking-wider mb-1.5";

// ---------------------------------------------------------------------------
// Defaults (minimal — compare needs fewer fields)
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

export default function CompareForm() {
  const [form, setForm] = useState<SaveTransitionInput>(defaults);
  const [result, setResult] = useState<CompareResult | null>(null);
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
      const res = await comparePlansAction(form);
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      {/* ----- Compact inline form ----- */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border-2 border-[#3d2a7a] bg-[#1a1040] p-6"
      >
        <div className="grid gap-5 sm:grid-cols-4">
          <div>
            <label htmlFor="loanBalance" className={labelBase}>
              Loan balance
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4ade80] text-sm font-bold font-mono select-none">
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
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4ade80] text-sm font-bold font-mono select-none">
                %
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="annualIncome" className={labelBase}>
              Annual income
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4ade80] text-sm font-bold font-mono select-none">
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
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-4">
          <div>
            <label htmlFor="monthsInRepayment" className={labelBase}>
              Months in repayment
            </label>
            <input
              id="monthsInRepayment"
              type="number"
              min="0"
              value={form.monthsInRepayment || ""}
              placeholder="0"
              onChange={(e) =>
                update("monthsInRepayment", parseInt(e.target.value) || 0)
              }
              className={`${inputBase} tabular-nums`}
            />
          </div>

          <div className="sm:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={
                isPending ||
                form.loanBalance <= 0 ||
                form.annualIncome <= 0
              }
              className="w-full rounded-xl bg-gradient-to-r from-[#4ade80] to-[#22d3ee] px-6 py-3 text-base font-mono font-bold text-[#0f0a1f] shadow-lg transition-all hover:shadow-[0_0_24px_-4px_rgba(74,222,128,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {isPending ? "Comparing..." : "Compare Plans"}
            </button>
          </div>
        </div>
      </form>

      {/* ----- Error ----- */}
      {error && (
        <div className="mt-6 rounded-xl border-2 border-[#f472b6]/40 bg-[#f472b6]/5 p-5">
          <h3 className="text-sm font-mono font-semibold text-[#f472b6]">
            Comparison failed
          </h3>
          <p className="mt-1 text-sm text-[#c4b5fd] font-mono">{error}</p>
        </div>
      )}

      {/* ----- Results ----- */}
      {result && <CompareResults result={result} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Results — big visual table + cards
// ---------------------------------------------------------------------------

function CompareResults({ result }: { result: CompareResult }) {
  const lowestMonthly = Math.min(...result.plans.map((p) => p.monthlyPayment));
  const lowestTotal = Math.min(...result.plans.map((p) => p.totalPaid));
  const highestForgiveness = Math.max(
    ...result.plans.map((p) => p.forgivenessAmount),
  );

  return (
    <div className="mt-8 space-y-6">
      {/* ----- Summary bar ----- */}
      <div className="flex flex-wrap gap-4 text-sm text-[#9d8ec2] font-mono">
        <span>
          Loan:{" "}
          <span className="text-white font-medium">
            ${result.input.loanBalance.toLocaleString()}
          </span>
        </span>
        <span>
          Rate:{" "}
          <span className="text-white font-medium">
            {(result.input.interestRate * 100).toFixed(1)}%
          </span>
        </span>
        <span>
          Income:{" "}
          <span className="text-white font-medium">
            ${result.input.annualIncome.toLocaleString()}/yr
          </span>
        </span>
        <span>
          Household:{" "}
          <span className="text-white font-medium">
            {result.input.householdSize}
          </span>
        </span>
      </div>

      {/* ----- Visual cards ----- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.plans.map((plan) => (
          <PlanCard
            key={plan.plan}
            plan={plan}
            isLowestMonthly={plan.monthlyPayment === lowestMonthly}
            isLowestTotal={plan.totalPaid === lowestTotal}
            isHighestForgiveness={
              plan.forgivenessAmount === highestForgiveness &&
              highestForgiveness > 0
            }
          />
        ))}
      </div>

      {/* ----- Full table ----- */}
      <div className="overflow-x-auto rounded-xl border-2 border-[#3d2a7a] bg-[#1a1040]">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b-2 border-[#3d2a7a] text-[#9d8ec2]">
              <th className="px-5 py-3 text-left font-medium">Plan</th>
              <th className="px-5 py-3 text-right font-medium">Monthly</th>
              <th className="px-5 py-3 text-right font-medium">Total Paid</th>
              <th className="px-5 py-3 text-right font-medium">Forgiven</th>
              <th className="px-5 py-3 text-right font-medium">
                Forgiveness Date
              </th>
              <th className="px-5 py-3 text-right font-medium">Years</th>
            </tr>
          </thead>
          <tbody>
            {result.plans.map((plan) => (
              <tr
                key={plan.plan}
                className="border-b border-[#3d2a7a]/50 last:border-0 hover:bg-[#251660]/50 transition-colors"
              >
                <td className="px-5 py-3.5 font-medium text-white">
                  {plan.plan}
                </td>
                <td
                  className={`px-5 py-3.5 text-right tabular-nums ${
                    plan.monthlyPayment === lowestMonthly
                      ? "text-[#4ade80] font-semibold"
                      : "text-[#c4b5fd]"
                  }`}
                >
                  ${plan.monthlyPayment.toLocaleString()}
                </td>
                <td
                  className={`px-5 py-3.5 text-right tabular-nums ${
                    plan.totalPaid === lowestTotal
                      ? "text-[#4ade80] font-semibold"
                      : "text-[#c4b5fd]"
                  }`}
                >
                  ${plan.totalPaid.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">
                  {plan.forgivenessAmount > 0 ? (
                    <span className="text-[#22d3ee]">
                      ${plan.forgivenessAmount.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[#3d2a7a]">&mdash;</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[#c4b5fd]">
                  {plan.forgivenessDate ?? (
                    <span className="text-[#3d2a7a]">&mdash;</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[#c4b5fd]">
                  {plan.yearsToPayoff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ----- Recommendation ----- */}
      <div className="rounded-xl border-2 border-[#4ade80]/30 bg-[#4ade80]/5 p-6">
        <h3 className="mb-2 text-base font-mono font-bold text-[#4ade80]">Recommendation</h3>
        <p className="text-sm text-[#c4b5fd] font-mono leading-relaxed">
          {result.recommendation}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan card
// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  isLowestMonthly,
  isLowestTotal,
  isHighestForgiveness,
}: {
  plan: PlanComparisonEntry;
  isLowestMonthly: boolean;
  isLowestTotal: boolean;
  isHighestForgiveness: boolean;
}) {
  const badges: Array<{ label: string; color: string }> = [];
  if (isLowestMonthly)
    badges.push({
      label: "Lowest monthly",
      color: "text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/30",
    });
  if (isLowestTotal)
    badges.push({
      label: "Lowest total",
      color: "text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/30",
    });
  if (isHighestForgiveness)
    badges.push({
      label: "Most forgiven",
      color: "text-[#22d3ee] bg-[#22d3ee]/10 border border-[#22d3ee]/30",
    });

  return (
    <div className="rounded-xl border-2 border-[#3d2a7a] bg-[#1a1040] p-5 hover:border-[#4ade80]/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white leading-tight">
          {plan.plan}
        </h3>
        {badges.length > 0 && (
          <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${b.color}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#9d8ec2]">Monthly</span>
          <span
            className={`tabular-nums font-medium ${
              isLowestMonthly ? "text-[#4ade80]" : "text-white"
            }`}
          >
            ${plan.monthlyPayment.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#9d8ec2]">Total paid</span>
          <span
            className={`tabular-nums font-medium ${
              isLowestTotal ? "text-[#4ade80]" : "text-white"
            }`}
          >
            ${plan.totalPaid.toLocaleString()}
          </span>
        </div>
        {plan.forgivenessAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-[#9d8ec2]">Forgiven</span>
            <span className="tabular-nums font-medium text-[#22d3ee]">
              ${plan.forgivenessAmount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#9d8ec2]">Years</span>
          <span className="tabular-nums text-white">{plan.yearsToPayoff}</span>
        </div>
      </div>
    </div>
  );
}
