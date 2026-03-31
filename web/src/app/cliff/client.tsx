'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import { ContextForm, type HouseholdContext } from '@/components/context-form';
import { CliffSkeleton } from '@/components/skeleton';
import { calculateCliff, type CliffAnalysis } from '@/app/actions';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function CliffClient() {
  const [result, setResult] = useState<CliffAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<{
    household: number;
    state: string;
  } | null>(null);

  function handleSubmit(data: HouseholdContext) {
    setError(null);
    setFormData({ household: data.householdSize, state: data.state });

    startTransition(async () => {
      try {
        const res = await calculateCliff(
          data.annualIncome,
          data.householdSize,
          data.state
        );
        setResult(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      }
    });
  }

  if (result && formData) {
    return (
      <CliffResults
        result={result}
        household={formData.household}
        state={formData.state}
        onReset={() => {
          setResult(null);
          setFormData(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Household basics
        </h2>
        <p className="text-muted text-sm mb-6">
          We only need three numbers to model your benefits cliff.
        </p>

        <ContextForm
          mode="cliff"
          storageKey="pigeongov-cliff"
          submitLabel="Calculate my cliff"
          pending={isPending}
          onSubmit={handleSubmit}
        />

        {error && (
          <div className="mt-4 rounded-lg border border-urgent/30 bg-urgent/10 p-4 text-sm text-urgent">
            {error}
          </div>
        )}
      </div>

      {isPending && (
        <div className="mt-8">
          <CliffSkeleton />
        </div>
      )}
    </div>
  );
}

// ── Results view with live income slider ─────────────────────────────────────

interface CliffResultsProps {
  result: CliffAnalysis;
  household: number;
  state: string;
  onReset: () => void;
}

function CliffResults({ result: initialResult, household, state, onReset }: CliffResultsProps) {
  const [result, setResult] = useState(initialResult);
  const [sliderIncome, setSliderIncome] = useState(initialResult.currentIncome);
  const [isRecalculating, startRecalc] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const totalMonthly = result.currentBenefits.reduce(
    (sum, b) => sum + b.monthlyValue,
    0
  );

  // Debounced recalculation when slider changes
  const recalculate = useCallback(
    (income: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        startRecalc(async () => {
          try {
            const res = await calculateCliff(income, household, state);
            setResult(res);
          } catch {
            // Keep existing result on error
          }
        });
      }, 300);
    },
    [household, state]
  );

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const income = Number(e.target.value);
    setSliderIncome(income);
    recalculate(income);
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Compute slider range (0 to max cliff + 30k, or at least 100k)
  const maxCliff = result.cliffPoints.length > 0
    ? Math.max(...result.cliffPoints.map((c) => c.income))
    : result.currentIncome;
  const sliderMax = Math.max(maxCliff + 30000, 100000, result.currentIncome * 2);

  return (
    <div className="space-y-8">
      {/* Income slider */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-muted">
            Adjust annual income
          </label>
          <span className={cn(
            'text-lg font-bold tabular-nums',
            isRecalculating ? 'text-muted animate-pulse' : 'text-foreground'
          )}>
            {formatCurrency(sliderIncome)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={500}
          value={sliderIncome}
          onChange={handleSliderChange}
          className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-pigeon-purple"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>$0</span>
          <span>{formatCurrency(sliderMax)}</span>
        </div>
      </div>

      {/* Current benefits summary */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="font-mono text-sm text-pigeon-cyan uppercase tracking-wider mb-4">
          Current Benefits at {formatCurrency(result.currentIncome)}/yr
        </h3>

        {result.currentBenefits.length === 0 ? (
          <p className="text-muted text-sm">
            No federal benefit eligibility at this income level.
          </p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {result.currentBenefits.map((b) => (
                <div
                  key={b.program}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground">{b.program}</span>
                  <span className="text-green-400 font-medium tabular-nums">
                    {formatCurrency(b.monthlyValue)}/mo
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-foreground font-semibold">Total</span>
              <span className="text-green-400 font-bold text-lg tabular-nums">
                {formatCurrency(totalMonthly)}/mo
              </span>
            </div>
            <p className="text-muted text-xs mt-2">
              {formatCurrency(totalMonthly * 12)}/year in benefits
            </p>
          </>
        )}
      </div>

      {/* Cliff points table */}
      {result.cliffPoints.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="font-mono text-sm text-yellow-400 uppercase tracking-wider mb-4">
            Cliff Points
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-2 pr-4">At income</th>
                  <th className="pb-2 pr-4">Lose program</th>
                  <th className="pb-2 text-right">Annual loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.cliffPoints.map((cp, i) => (
                  <tr key={i} className="text-foreground">
                    <td className="py-3 pr-4 tabular-nums font-medium">
                      {formatCurrency(cp.income)}/yr
                    </td>
                    <td className="py-3 pr-4">{cp.programLost}</td>
                    <td className="py-3 text-right text-urgent tabular-nums font-medium">
                      -{formatCurrency(cp.annualLoss)}/yr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Safe raise threshold */}
      {result.safeRaiseThreshold > result.currentIncome && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6">
          <h3 className="font-mono text-sm text-green-400 uppercase tracking-wider mb-3">
            Safe Raise Target
          </h3>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl font-bold text-green-400 tabular-nums">
              {formatCurrency(result.safeRaiseThreshold)}
            </span>
            <span className="text-green-400/60">/year</span>
          </div>
          <p className="text-sm text-muted">
            A raise of{' '}
            <span className="text-foreground font-medium tabular-nums">
              {formatCurrency(result.safeRaiseThreshold - result.currentIncome)}
            </span>{' '}
            would fully offset the lost benefits. Below this threshold, a raise
            could leave you worse off in total.
          </p>
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="font-mono text-sm text-pigeon-purple uppercase tracking-wider mb-3">
          Recommendation
        </h3>
        <p className="text-muted text-sm leading-relaxed">
          {result.recommendation}
        </p>
      </div>

      {/* Cross-link to screener */}
      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-foreground font-semibold">
            Want to see all programs you qualify for?
          </p>
          <p className="text-muted text-sm">
            The benefits screener checks 13 federal programs with detailed next steps.
          </p>
        </div>
        <Link
          href="/screen"
          className="shrink-0 bg-gradient-to-r from-pigeon-purple to-pigeon-pink text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Screen my eligibility
        </Link>
      </div>

      {/* Start over */}
      <div className="text-center">
        <button
          onClick={onReset}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          &larr; Change inputs and re-run
        </button>
      </div>
    </div>
  );
}
