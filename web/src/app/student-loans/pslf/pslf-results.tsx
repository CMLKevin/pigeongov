"use client";

import type { PSLFTrackerResult } from "@/lib/student-loans-types";

interface Props {
  result: PSLFTrackerResult;
}

export default function PSLFResults({ result }: Props) {
  const riskColors: Record<string, string> = {
    low: "text-green-400 bg-green-500/10 border-green-500/20",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    high: "text-red-400 bg-red-500/10 border-red-500/20",
    ineligible: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  const riskColor = riskColors[result.riskAssessment.level] ?? riskColors.medium;

  return (
    <div className="mt-10 space-y-8">
      {/* ----- Progress ----- */}
      <section className="rounded-xl border border-white/10 bg-[#252538] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">
          PSLF Progress
        </h2>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-[#c4c4d4] tabular-nums">
              {result.qualifyingPayments} / {result.paymentsNeeded} qualifying
              payments
            </span>
            <span className="text-[#6c3aed] font-semibold tabular-nums">
              {result.progressPercent}%
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-[#1a1a2e] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6c3aed] to-[#d946ef] transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, result.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-[#1a1a2e] p-4">
            <p className="text-xs text-[#6b6b8a]">Payments remaining</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">
              {result.paymentsRemaining}
            </p>
            <p className="text-xs text-[#6b6b8a] tabular-nums">
              ~{Math.ceil(result.paymentsRemaining / 12)} years
            </p>
          </div>

          {result.estimatedForgivenessDate && (
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs text-[#6b6b8a]">Est. forgiveness date</p>
              <p className="mt-1 text-lg font-semibold text-green-400">
                {result.estimatedForgivenessDate}
              </p>
            </div>
          )}

          {result.estimatedForgivenessAmount > 0 && (
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs text-[#6b6b8a]">Est. amount forgiven</p>
              <p className="mt-1 text-lg font-semibold text-cyan-400 tabular-nums">
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
        <h2 className="mb-2 text-base font-bold">
          Employer Risk:{" "}
          <span className="capitalize">{result.riskAssessment.level}</span>
        </h2>
        <p className="text-sm text-[#c4c4d4] leading-relaxed">
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
        <section className="rounded-xl border border-[#6c3aed]/30 bg-[#6c3aed]/5 p-6">
          <h2 className="mb-3 text-base font-bold text-white">
            Buyback Opportunity
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs text-[#6b6b8a]">Months available</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {result.buybackOpportunity.monthsAvailable}
              </p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs text-[#6b6b8a]">Estimated cost</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-400">
                ${result.buybackOpportunity.estimatedCost.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[#c4c4d4] leading-relaxed">
            {result.buybackOpportunity.benefitDescription}
          </p>
        </section>
      )}

      {/* ----- Recommendations ----- */}
      {result.recommendations.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-[#252538] p-6">
          <h2 className="mb-3 text-base font-bold text-white">
            Recommendations
          </h2>
          <ul className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#6c3aed]/10 text-[10px] font-bold text-[#6c3aed]">
                  {i + 1}
                </span>
                <span className="text-[#c4c4d4] leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
