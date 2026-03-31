"use client";

import type { PSLFTrackerResult } from "@/lib/student-loans-types";

interface Props {
  result: PSLFTrackerResult;
}

export default function PSLFResults({ result }: Props) {
  const riskColors: Record<string, string> = {
    low: "text-[#4ade80] bg-[#4ade80]/10 border-2 border-[#4ade80]/30",
    medium: "text-amber-400 bg-amber-500/10 border-2 border-amber-500/30",
    high: "text-red-400 bg-red-500/10 border-2 border-red-500/30",
    ineligible: "text-red-400 bg-red-500/10 border-2 border-red-500/40",
  };

  const riskColor = riskColors[result.riskAssessment.level] ?? riskColors.medium;

  return (
    <div className="mt-10 space-y-8">
      {/* ----- Progress ----- */}
      <section className="rounded-xl border-2 border-[#3d2a7a] bg-[#1a1040] p-6">
        <h2 className="mb-4 text-lg font-mono font-bold text-white">
          PSLF Progress
        </h2>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-[#c4b5fd] font-mono tabular-nums">
              {result.qualifyingPayments} / {result.paymentsNeeded} qualifying
              payments
            </span>
            <span className="text-[#4ade80] font-mono font-semibold tabular-nums">
              {result.progressPercent}%
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-[#0f0a1f] overflow-hidden border border-[#3d2a7a]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#22d3ee] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, result.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-[#0f0a1f] border border-[#3d2a7a] p-4">
            <p className="text-xs text-[#9d8ec2] font-mono">Payments remaining</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">
              {result.paymentsRemaining}
            </p>
            <p className="text-xs text-[#9d8ec2] font-mono tabular-nums">
              ~{Math.ceil(result.paymentsRemaining / 12)} years
            </p>
          </div>

          {result.estimatedForgivenessDate && (
            <div className="rounded-lg bg-[#0f0a1f] border border-[#3d2a7a] p-4">
              <p className="text-xs text-[#9d8ec2] font-mono">Est. forgiveness date</p>
              <p className="mt-1 text-lg font-mono font-semibold text-[#4ade80]">
                {result.estimatedForgivenessDate}
              </p>
            </div>
          )}

          {result.estimatedForgivenessAmount > 0 && (
            <div className="rounded-lg bg-[#0f0a1f] border border-[#3d2a7a] p-4">
              <p className="text-xs text-[#9d8ec2] font-mono">Est. amount forgiven</p>
              <p className="mt-1 text-lg font-mono font-semibold text-[#22d3ee] tabular-nums">
                ${result.estimatedForgivenessAmount.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ----- Risk assessment ----- */}
      <section
        className={`rounded-xl border p-6 ${riskColor}`}
      >
        <h2 className="mb-2 text-base font-mono font-bold">
          Employer Risk:{" "}
          <span className="capitalize">{result.riskAssessment.level}</span>
        </h2>
        <p className="text-sm text-[#c4b5fd] font-mono leading-relaxed">
          {result.riskAssessment.reason}
        </p>
        {!result.employerEligible && (
          <p className="mt-3 text-sm font-medium text-red-400">
            Your current employer type does not qualify for PSLF. Consider
            transitioning to a government or 501(c)(3) employer.
          </p>
        )}
      </section>

      {/* ----- Buyback opportunity ----- */}
      {result.buybackOpportunity.eligible && (
        <section className="rounded-xl border-2 border-[#8b5cf6]/30 bg-[#8b5cf6]/5 p-6">
          <h2 className="mb-3 text-base font-mono font-bold text-white">
            Buyback Opportunity
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-[#0f0a1f] border border-[#3d2a7a] p-4">
              <p className="text-xs text-[#9d8ec2] font-mono">Months available</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {result.buybackOpportunity.monthsAvailable}
              </p>
            </div>
            <div className="rounded-lg bg-[#0f0a1f] border border-[#3d2a7a] p-4">
              <p className="text-xs text-[#9d8ec2] font-mono">Estimated cost</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-400">
                ${result.buybackOpportunity.estimatedCost.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[#c4b5fd] font-mono leading-relaxed">
            {result.buybackOpportunity.benefitDescription}
          </p>
        </section>
      )}

      {/* ----- Recommendations ----- */}
      {result.recommendations.length > 0 && (
        <section className="rounded-xl border-2 border-[#3d2a7a] bg-[#1a1040] p-6">
          <h2 className="mb-3 text-base font-mono font-bold text-white">
            Recommendations
          </h2>
          <ul className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 text-[10px] font-mono font-bold text-[#4ade80]">
                  {i + 1}
                </span>
                <span className="text-[#c4b5fd] font-mono leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
