'use client';

import { useState, useTransition } from 'react';
import { ContextForm, type HouseholdContext } from '@/components/context-form';
import { ActionPlan } from '@/components/action-plan';
import { BenefitsCard } from '@/components/benefits-card';
import { PlanSkeleton } from '@/components/skeleton';
import {
  getLifeEventPlan,
  screenEligibility,
  type LifeEventPlanResult,
  type EligibilityResult,
} from '@/app/actions';

interface LifeEventClientProps {
  eventId: string;
}

export function LifeEventClient({ eventId }: LifeEventClientProps) {
  const [plan, setPlan] = useState<LifeEventPlanResult | null>(null);
  const [screenerResults, setScreenerResults] = useState<EligibilityResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [eventDate, setEventDate] = useState('');
  const [planning, setPlanning] = useState(false);

  function handleSubmit(data: HouseholdContext) {
    setError(null);
    startTransition(async () => {
      try {
        // Build the date arg
        const date = planning ? undefined : eventDate || undefined;

        // Get the life event plan
        const planResult = await getLifeEventPlan(eventId, date);
        setPlan(planResult);

        // If household data is provided, also run the screener
        if (data.state && data.annualIncome > 0) {
          const ages = data.ages
            ? data.ages.split(',').map((a) => parseInt(a.trim(), 10)).filter((a) => !isNaN(a))
            : Array.from({ length: data.householdSize }, () => 30);

          const screenerInput = {
            householdSize: data.householdSize,
            annualHouseholdIncome: data.annualIncome,
            state: data.state,
            citizenshipStatus: data.citizenshipStatus || 'us_citizen',
            ages,
            hasDisability: data.hasDisability,
            employmentStatus: data.employmentStatus || 'employed',
            isVeteran: data.isVeteran,
            hasHealthInsurance: data.hasHealthInsurance ?? true,
            monthlyRent: data.monthlyRent || 0,
          };

          const screenerResult = await screenEligibility(screenerInput);
          setScreenerResults(screenerResult.results);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      }
    });
  }

  // If we have results, show the plan
  if (plan) {
    const likelyResults = screenerResults?.filter((r) => r.eligible === 'likely') ?? [];
    const possibleResults = screenerResults?.filter((r) => r.eligible === 'possible') ?? [];

    return (
      <div className="space-y-10">
        {/* Action plan header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
            {plan.event.label}
          </h2>
          <p className="text-muted">{plan.event.description}</p>
        </div>

        {/* The plan itself */}
        <ActionPlan plan={plan} />

        {/* Screener results if available */}
        {screenerResults && screenerResults.length > 0 && (
          <div className="border-t border-border pt-8">
            <h2 className="text-xl font-bold text-foreground mb-1">
              Based on your household, you may also qualify for:
            </h2>
            <p className="text-muted text-sm mb-6">
              These programs are separate from the life event workflows above.
            </p>

            {likelyResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-mono text-green-400 uppercase tracking-wider mb-3">
                  Likely Eligible
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {likelyResults.map((r) => (
                    <BenefitsCard key={r.workflowId} result={r} />
                  ))}
                </div>
              </div>
            )}

            {possibleResults.length > 0 && (
              <div>
                <h3 className="text-sm font-mono text-yellow-400 uppercase tracking-wider mb-3">
                  Worth Investigating
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {possibleResults.map((r) => (
                    <BenefitsCard key={r.workflowId} result={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start over button */}
        <div className="text-center pt-4">
          <button
            onClick={() => {
              setPlan(null);
              setScreenerResults(null);
            }}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            &larr; Change answers and re-run
          </button>
        </div>
      </div>
    );
  }

  // Show the form
  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Quick context
        </h2>
        <p className="text-muted text-sm mb-6">
          A few details so we can compute deadlines and check benefit eligibility.
        </p>

        {/* Date picker */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-muted mb-1.5">
            When did this happen?
          </label>
          <div className="flex gap-3 items-center mb-2">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                setPlanning(false);
              }}
              disabled={planning}
              className={`flex-1 rounded-lg border border-border bg-background px-4 py-3 text-foreground transition-all duration-200 focus:border-pigeon-purple focus:outline-none focus:ring-2 focus:ring-pigeon-purple/40 ${
                planning ? 'opacity-50' : ''
              }`}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={planning}
              onChange={(e) => {
                setPlanning(e.target.checked);
                if (e.target.checked) setEventDate('');
              }}
              className="h-5 w-5 rounded border-white/10 bg-[#1a1a2e] text-pigeon-purple focus:ring-2 focus:ring-pigeon-purple/40 cursor-pointer accent-pigeon-purple"
            />
            <span className="text-sm text-[#c4c4d4] select-none">
              Not yet &mdash; I&apos;m planning
            </span>
          </label>
        </div>

        {/* Household context form */}
        <ContextForm
          mode="compact"
          storageKey={`pigeongov-life-event-${eventId}`}
          submitLabel="Build my action plan"
          pending={isPending}
          onSubmit={handleSubmit}
        />

        {/* Error display */}
        {error && (
          <div className="mt-4 rounded-lg border border-urgent/30 bg-urgent/10 p-4 text-sm text-urgent">
            {error}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="mt-8">
          <PlanSkeleton />
        </div>
      )}
    </div>
  );
}
