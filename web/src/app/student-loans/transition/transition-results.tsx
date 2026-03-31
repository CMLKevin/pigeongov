"use client";

import type {
  SaveTransitionInput,
  SaveTransitionResult,
  PlanComparisonEntry,
} from "@/lib/student-loans-types";

interface Props {
  result: SaveTransitionResult;
  input: SaveTransitionInput;
}

export default function TransitionResults({ result, input }: Props) {
  const lowestMonthly = Math.min(
    ...result.planComparison.map((p) => p.monthlyPayment),
  );
  const lowestTotal = Math.min(
    ...result.planComparison.map((p) => p.totalPaid),
  );

  return (
    <div className="mt-10 space-y-8">
      {/* ----- Urgent actions ----- */}
      {result.urgentActions.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            Urgent Actions Required
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.urgentActions.map((action, i) => {
              const isPast =
                new Date(action.deadline) <= new Date("2026-03-31");
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-5 ${
                    isPast
                      ? "border-red-500/50 bg-red-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={`text-sm font-medium ${
                        isPast ? "text-red-300" : "text-amber-300"
                      }`}
                    >
                      {action.action}
                    </p>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                        isPast
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {isPast ? "PAST DUE" : action.deadline}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#9d8ec2] font-mono leading-relaxed">
                    {action.consequence}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ----- Plan comparison table ----- */}
      {result.planComparison.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-mono font-bold text-white">Plan Comparison</h2>
          <div className="overflow-x-auto rounded-xl border-2 border-[#3d2a7a] bg-[#1a1040]">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b-2 border-[#3d2a7a] text-[#9d8ec2]">
                  <th className="px-5 py-3 text-left font-medium">Plan</th>
                  <th className="px-5 py-3 text-right font-medium">Monthly</th>
                  <th className="px-5 py-3 text-right font-medium">
                    Total Paid
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    Forgiven
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    Forgiveness Date
                  </th>
                  <th className="px-5 py-3 text-right font-medium">Years</th>
                </tr>
              </thead>
              <tbody>
                {result.planComparison.map((plan) => (
                  <PlanRow
                    key={plan.plan}
                    plan={plan}
                    isLowestMonthly={plan.monthlyPayment === lowestMonthly}
                    isLowestTotal={plan.totalPaid === lowestTotal}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[#9d8ec2] font-mono">
            Based on ${input.loanBalance.toLocaleString()} balance,{" "}
            {(input.interestRate * 100).toFixed(1)}% rate, $
            {input.annualIncome.toLocaleString()}/yr income, household of{" "}
            {input.householdSize}.
          </p>
        </section>
      )}

      {/* ----- PSLF section ----- */}
      <section className="rounded-xl border-2 border-[#3d2a7a] bg-[#1a1040] p-6">
        <h2 className="mb-4 text-lg font-mono font-bold text-white">
          Public Service Loan Forgiveness (PSLF)
        </h2>
        {result.pslf.eligible ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 text-[#4ade80]"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="text-sm font-mono font-medium text-[#4ade80]">
                You appear eligible for PSLF
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-[#0f0a1f] border border-[#3d2a7a] p-4">
                <p className="text-xs text-[#9d8ec2] font-mono">Payments remaining</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                  {result.pslf.paymentsRemaining}
                  <span className="text-sm font-normal text-[#6b6b8a]">
                    {" "}
                    / 120
                  </span>
                </p>
              </div>
              {result.pslf.estimatedForgivenessDate && (
                <div className="rounded-lg bg-[#0f0a1f] border border-[#3d2a7a] p-4">
                  <p className="text-xs text-[#9d8ec2] font-mono">Est. forgiveness</p>
                  <p className="mt-1 text-lg font-mono font-semibold text-[#4ade80]">
                    {result.pslf.estimatedForgivenessDate}
                  </p>
                </div>
              )}
              {result.pslf.atRisk && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
                  <p className="text-xs text-amber-400">Risk detected</p>
                  <p className="mt-1 text-xs text-[#c4b5fd] font-mono leading-relaxed">
                    {result.pslf.riskReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f0a1f] border border-[#3d2a7a]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 text-[#9d8ec2]"
              >
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </span>
            <span className="text-sm text-[#9d8ec2] font-mono">
              Not eligible for PSLF based on current employer type
            </span>
          </div>
        )}
      </section>

      {/* ----- Consolidation deadline ----- */}
      {result.consolidationDeadline && (
        <div className="rounded-xl border-2 border-red-500/50 bg-red-500/5 p-6 urgent-pulse">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-base font-bold text-red-400">
                Consolidation Deadline: {result.consolidationDeadline}
              </p>
              <p className="mt-1 text-sm text-[#c4b5fd] font-mono">
                Parent PLUS loans must be consolidated via Direct Consolidation
                Loan before this date to preserve access to IBR. After this
                date, only ICR (the most expensive IDR plan) will be available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ----- Recommendation ----- */}
      <section className="rounded-xl border-2 border-[#4ade80]/30 bg-[#4ade80]/5 p-6">
        <h2 className="mb-2 text-base font-mono font-bold text-[#4ade80]">Recommendation</h2>
        <p className="text-sm text-[#c4b5fd] font-mono leading-relaxed">
          {result.recommendation}
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan row
// ---------------------------------------------------------------------------

function PlanRow({
  plan,
  isLowestMonthly,
  isLowestTotal,
}: {
  plan: PlanComparisonEntry;
  isLowestMonthly: boolean;
  isLowestTotal: boolean;
}) {
  return (
    <tr className="border-b border-[#3d2a7a]/50 last:border-0 hover:bg-[#251660]/50 transition-colors">
      <td className="px-5 py-3.5 font-medium text-white">{plan.plan}</td>
      <td
        className={`px-5 py-3.5 text-right tabular-nums ${
          isLowestMonthly ? "text-[#4ade80] font-semibold" : "text-[#c4b5fd]"
        }`}
      >
        ${plan.monthlyPayment.toLocaleString()}
      </td>
      <td
        className={`px-5 py-3.5 text-right tabular-nums ${
          isLowestTotal ? "text-[#4ade80] font-semibold" : "text-[#c4b5fd]"
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
  );
}
