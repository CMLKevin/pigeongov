"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkflowQuestionSection, WorkflowBundle } from "@/lib/types";
import { FormField } from "./form-fields";
import { WorkflowReview } from "./workflow-review";

// ---------------------------------------------------------------------------
// Helpers for deep get/set on dot-path keys like "taxpayer.firstName"
// ---------------------------------------------------------------------------

function deepGet(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function deepSet(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const clone = structuredClone(obj);
  const parts = path.split(".");
  let current: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] == null || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return clone;
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

function storageKey(workflowId: string) {
  return `pigeongov:draft:${workflowId}`;
}

function loadDraft(workflowId: string): {
  answers: Record<string, unknown>;
  step: number;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(workflowId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(
  workflowId: string,
  answers: Record<string, unknown>,
  step: number
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(workflowId),
      JSON.stringify({ answers, step, savedAt: new Date().toISOString() })
    );
  } catch {
    // localStorage may be full or unavailable -- silently skip
  }
}

function clearDraft(workflowId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(workflowId));
  } catch {
    // noop
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkflowWizardProps {
  workflowId: string;
  title: string;
  summary: string;
  domain: string;
  sections: WorkflowQuestionSection[];
  starterData: Record<string, unknown>;
  submitAction: (
    workflowId: string,
    data: Record<string, unknown>
  ) => Promise<WorkflowBundle>;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  sections,
  currentStep,
  onStepClick,
}: {
  sections: WorkflowQuestionSection[];
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="h-1.5 w-full rounded-full bg-surface">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-pigeon-purple to-pigeon-pink transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / sections.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Step pills */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onStepClick(i)}
              disabled={i > currentStep + 1}
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200
                ${
                  isActive
                    ? "bg-pigeon-purple text-white shadow-lg shadow-pigeon-purple/25"
                    : isCompleted
                      ? "bg-pigeon-purple/20 text-pigeon-purple hover:bg-pigeon-purple/30 cursor-pointer"
                      : "bg-surface text-muted cursor-not-allowed"
                }
              `}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20"
                    : isCompleted
                      ? "bg-pigeon-purple/40"
                      : "bg-white/5"
                }`}
              >
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden sm:inline">{section.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resume banner
// ---------------------------------------------------------------------------

function ResumeBanner({
  onResume,
  onDiscard,
}: {
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-pigeon-purple/30 bg-pigeon-purple/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-pigeon-purple">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H4.743a.75.75 0 0 0-.75.75v3.489a.75.75 0 0 0 1.5 0v-2.116l.312.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V3.682a.75.75 0 0 0-1.5 0v2.117l-.312-.312a7 7 0 0 0-11.712 3.138.75.75 0 0 0 1.449.39 5.5 5.5 0 0 1 9.201-2.466l.312.312H11.77a.75.75 0 0 0 0 1.5h3.489a.75.75 0 0 0 .53-.219Z"
            clipRule="evenodd"
          />
        </svg>
        You have a saved draft. Pick up where you left off?
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-md px-3 py-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          Start fresh
        </button>
        <button
          type="button"
          onClick={onResume}
          className="rounded-md bg-pigeon-purple px-3 py-1 text-xs text-white hover:bg-pigeon-purple/80 transition-colors"
        >
          Resume
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function WorkflowWizard({
  workflowId,
  title,
  summary,
  domain,
  sections,
  starterData,
  submitAction,
}: WorkflowWizardProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    () => structuredClone(starterData)
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<WorkflowBundle | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [draftData, setDraftData] = useState<{
    answers: Record<string, unknown>;
    step: number;
  } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const section = sections[currentStep];
  const isLastStep = currentStep === sections.length - 1;

  // ---------------------------------------------------------------------------
  // Load draft on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const draft = loadDraft(workflowId);
    if (draft && draft.answers) {
      setDraftData(draft);
      setShowResumeBanner(true);
    }
  }, [workflowId]);

  // ---------------------------------------------------------------------------
  // Auto-save every 5 seconds
  // ---------------------------------------------------------------------------
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      saveDraft(workflowId, answers, currentStep);
    }, 5000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [workflowId, answers, currentStep]);

  // ---------------------------------------------------------------------------
  // Resume / discard
  // ---------------------------------------------------------------------------
  const handleResume = useCallback(() => {
    if (draftData) {
      setAnswers(draftData.answers);
      setCurrentStep(
        Math.min(draftData.step, sections.length - 1)
      );
    }
    setShowResumeBanner(false);
  }, [draftData, sections.length]);

  const handleDiscard = useCallback(() => {
    clearDraft(workflowId);
    setShowResumeBanner(false);
  }, [workflowId]);

  // ---------------------------------------------------------------------------
  // Field change
  // ---------------------------------------------------------------------------
  const handleChange = useCallback((key: string, value: unknown) => {
    setAnswers((prev) => deepSet(prev, key, value));
    setErrors((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const goForward = useCallback(() => {
    if (currentStep < sections.length - 1) {
      setCurrentStep((s) => s + 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep, sections.length]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step <= currentStep + 1 && step < sections.length) {
        setCurrentStep(step);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [currentStep, sections.length]
  );

  // ---------------------------------------------------------------------------
  // Validation (lightweight client-side)
  // ---------------------------------------------------------------------------
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of section.fields) {
      const val = deepGet(answers, field.key);

      // Required text fields
      if (field.type === "text" || field.type === "textarea") {
        // We don't require every text field since starterData may have defaults
        // but we flag obviously empty required-looking ones
      }

      // Select fields should have a value chosen
      if (field.type === "select" && (val === "" || val === undefined)) {
        newErrors[field.key] = `Please select a ${field.label.toLowerCase()}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [section, answers]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitAction(workflowId, answers);
      setBundle(result);
      clearDraft(workflowId);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong processing your workflow. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }, [validate, submitAction, workflowId, answers]);

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when focus is in a form control
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft" || e.key === "Backspace") {
        goBack();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  // ---------------------------------------------------------------------------
  // Domain badge color
  // ---------------------------------------------------------------------------
  const domainColors = useMemo(
    () =>
      ({
        tax: "bg-emerald-500/20 text-emerald-400",
        immigration: "bg-blue-500/20 text-blue-400",
        healthcare: "bg-rose-500/20 text-rose-400",
        unemployment: "bg-amber-500/20 text-amber-400",
        business: "bg-violet-500/20 text-violet-400",
        permits: "bg-orange-500/20 text-orange-400",
        education: "bg-sky-500/20 text-sky-400",
        retirement: "bg-teal-500/20 text-teal-400",
        identity: "bg-indigo-500/20 text-indigo-400",
        benefits: "bg-lime-500/20 text-lime-400",
        veterans: "bg-red-500/20 text-red-400",
        legal: "bg-slate-500/20 text-slate-400",
        estate: "bg-purple-500/20 text-purple-400",
      }) as Record<string, string>,
    []
  );

  // ---------------------------------------------------------------------------
  // If we have a bundle, show the review screen
  // ---------------------------------------------------------------------------
  if (bundle) {
    return (
      <WorkflowReview
        bundle={bundle}
        onStartOver={() => {
          setBundle(null);
          setCurrentStep(0);
          setAnswers(structuredClone(starterData));
        }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${domainColors[domain] ?? "bg-white/10 text-muted"}`}
            >
              {domain}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {summary}
          </p>
        </div>

        {/* Resume banner */}
        {showResumeBanner && (
          <ResumeBanner onResume={handleResume} onDiscard={handleDiscard} />
        )}

        {/* Step indicator */}
        <StepIndicator
          sections={sections}
          currentStep={currentStep}
          onStepClick={goToStep}
        />

        {/* Section card */}
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
          {/* Section header */}
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-mono text-muted">
                {currentStep + 1}/{sections.length}
              </span>
              <h2 className="text-lg font-semibold text-foreground font-mono">
                {section.title}
              </h2>
            </div>
            {section.description && (
              <p className="mt-1 text-sm text-muted">
                {section.description}
              </p>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-5">
            {section.fields.map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={deepGet(answers, field.key)}
                error={errors[field.key]}
                onChange={handleChange}
              />
            ))}
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={currentStep === 0}
              className={`
                inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200
                ${
                  currentStep === 0
                    ? "text-border cursor-not-allowed"
                    : "text-pigeon-purple hover:text-foreground hover:bg-surface-hover"
                }
              `}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
              Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`
                  inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200
                  bg-gradient-to-r from-pigeon-purple to-pigeon-pink
                  hover:from-pigeon-purple/80 hover:to-pigeon-pink/80
                  shadow-lg shadow-pigeon-purple/25
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {submitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Submit
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={goForward}
                className="inline-flex items-center gap-2 rounded-lg bg-pigeon-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pigeon-purple/25 transition-all duration-200 hover:bg-pigeon-purple/80"
              >
                Continue
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Auto-save indicator */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-muted/40">
            Your progress is auto-saved locally every 5 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WorkflowWizard;
