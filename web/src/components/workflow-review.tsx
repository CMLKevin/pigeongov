"use client";

import { useCallback, useMemo, useState } from "react";
import type { WorkflowBundle, ValidationFlag } from "@/lib/types";

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const severityConfig: Record<
  ValidationFlag["severity"],
  { bg: string; text: string; border: string; icon: string; label: string }
> = {
  error: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    icon: "M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    label: "Error",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    icon: "M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566ZM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5Zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
    label: "Warning",
  },
  review: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    icon: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm1 7.5a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 1.5 0v3ZM8 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    label: "Review",
  },
};

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "good" | "bad";
}) {
  const colors = {
    default: "bg-white/5 text-white",
    good: "bg-emerald-500/10 text-emerald-400",
    bad: "bg-red-500/10 text-red-400",
  };
  return (
    <div className={`rounded-lg px-4 py-3 ${colors[variant]}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted mb-1">
        {label}
      </div>
      <div className="text-lg font-mono font-bold">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flag card
// ---------------------------------------------------------------------------

function FlagCard({ flag }: { flag: ValidationFlag }) {
  const config = severityConfig[flag.severity];
  return (
    <div
      className={`rounded-lg border ${config.border} ${config.bg} px-4 py-3`}
    >
      <div className="flex items-start gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`h-4 w-4 flex-shrink-0 mt-0.5 ${config.text}`}
        >
          <path fillRule="evenodd" d={config.icon} clipRule="evenodd" />
        </svg>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${config.text}`}
            >
              {config.label}
            </span>
            <code className="text-[11px] font-mono text-muted">
              {flag.field}
            </code>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {flag.message}
          </p>
          {flag.source && (
            <p className="mt-1 text-[11px] text-muted/40">
              Source: {flag.source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Check card
// ---------------------------------------------------------------------------

function CheckRow({
  check,
}: {
  check: { id: string; label: string; passed: boolean; message: string };
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${
          check.passed ? "bg-emerald-500/20" : "bg-red-500/20"
        }`}
      >
        {check.passed ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3 w-3 text-emerald-400"
          >
            <path
              fillRule="evenodd"
              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3 w-3 text-red-400"
          >
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{check.label}</p>
        <p className="text-xs text-muted">{check.message}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main review component
// ---------------------------------------------------------------------------

interface WorkflowReviewProps {
  bundle: WorkflowBundle;
  onStartOver: () => void;
}

export function WorkflowReview({ bundle, onStartOver }: WorkflowReviewProps) {
  const [showFullBundle, setShowFullBundle] = useState(false);
  const { review, validation } = bundle;

  // Counts
  const errorCount = validation.flaggedFields.filter(
    (f) => f.severity === "error"
  ).length;
  const warningCount = validation.flaggedFields.filter(
    (f) => f.severity === "warning"
  ).length;
  const checksPassed = validation.checks.filter((c) => c.passed).length;

  // Derived values for stat pills (try to extract meaningful numbers)
  const derived = bundle.derived as Record<string, unknown>;
  const statPills = useMemo(() => {
    const pills: Array<{
      label: string;
      value: string;
      variant: "default" | "good" | "bad";
    }> = [];

    if (typeof derived.refund === "number" && derived.refund > 0) {
      pills.push({
        label: "Refund",
        value: `$${derived.refund.toLocaleString()}`,
        variant: "good",
      });
    }
    if (typeof derived.amountOwed === "number" && derived.amountOwed > 0) {
      pills.push({
        label: "Amount owed",
        value: `$${derived.amountOwed.toLocaleString()}`,
        variant: "bad",
      });
    }
    if (typeof derived.taxableIncome === "number") {
      pills.push({
        label: "Taxable income",
        value: `$${derived.taxableIncome.toLocaleString()}`,
        variant: "default",
      });
    }

    return pills;
  }, [derived]);

  // Download JSON
  const handleDownloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bundle.workflowId.replace(/\//g, "-")}-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bundle]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted mb-4">
            Workflow complete
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
            {review.headline}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {bundle.title} &mdash; {bundle.summary}
          </p>
        </div>

        {/* Stat pills */}
        {statPills.length > 0 && (
          <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statPills.map((pill) => (
              <StatPill key={pill.label} {...pill} />
            ))}
          </div>
        )}

        {/* Notes */}
        {review.notes.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-white font-mono mb-3">
              Key findings
            </h2>
            <ul className="space-y-2">
              {review.notes.map((note, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pigeon-purple flex-shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation checks */}
        {validation.checks.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white font-mono">
                Validation checks
              </h2>
              <span className="text-xs text-muted">
                {checksPassed}/{validation.checks.length} passed
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {validation.checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </div>
          </div>
        )}

        {/* Flagged fields */}
        {validation.flaggedFields.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white font-mono">
                Flagged fields
              </h2>
              <div className="flex gap-2 text-xs">
                {errorCount > 0 && (
                  <span className="text-red-400">
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-amber-400">
                    {warningCount} warning{warningCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {validation.flaggedFields.map((flag, i) => (
                <FlagCard key={`${flag.field}-${i}`} flag={flag} />
              ))}
            </div>
          </div>
        )}

        {/* Evidence tracker */}
        {bundle.evidence.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-white font-mono mb-3">
              Evidence checklist
            </h2>
            <div className="space-y-2">
              {bundle.evidence.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.status === "provided"
                          ? "bg-emerald-400"
                          : item.status === "review"
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                    />
                    <span className="text-sm text-foreground/80">
                      {item.label}
                    </span>
                    {item.required && (
                      <span className="text-[10px] text-muted uppercase tracking-wider">
                        required
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      item.status === "provided"
                        ? "text-emerald-400"
                        : item.status === "review"
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output artifacts */}
        {bundle.outputArtifacts.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-white font-mono mb-3">
              Output artifacts
            </h2>
            <div className="space-y-2">
              {bundle.outputArtifacts.map((artifact, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted uppercase">
                      {artifact.format}
                    </span>
                    <span className="text-sm text-foreground/80">
                      {artifact.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted/40">
                    {artifact.kind}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Household members */}
        {bundle.household.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-semibold text-white font-mono mb-3">
              Household
            </h2>
            <div className="space-y-2">
              {bundle.household.map((member, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pigeon-purple/20 text-[11px] font-bold text-pigeon-purple">
                    {member.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm text-white">{member.name}</p>
                    <p className="text-xs text-muted">
                      {member.relationship}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full bundle JSON toggle */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowFullBundle((v) => !v)}
            className="text-xs text-muted hover:text-pigeon-purple transition-colors"
          >
            {showFullBundle ? "Hide" : "Show"} raw bundle JSON
          </button>
          {showFullBundle && (
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-pigeon-darker p-4 text-xs text-muted font-mono border border-white/[0.04]">
              {JSON.stringify(bundle, null, 2)}
            </pre>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pigeon-purple to-pigeon-pink px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pigeon-purple/25 transition-all duration-200 hover:from-pigeon-purple/80 hover:to-pigeon-pink/80"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
              <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
            </svg>
            Download JSON bundle
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-2.5 text-sm font-medium text-pigeon-purple hover:bg-white/5 transition-all duration-200"
          >
            Start over
          </button>
        </div>

        {/* Provenance */}
        {bundle.provenance.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-[11px] text-muted/40">
              Provenance: {bundle.provenance.join(" → ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowReview;
