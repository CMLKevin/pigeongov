'use client';

import { useState, useTransition } from 'react';
import { ContextForm, type HouseholdContext } from '@/components/context-form';
import { BenefitsCard } from '@/components/benefits-card';
import { ScreenerResultsSkeleton } from '@/components/skeleton';
import {
  screenEligibility,
  type EligibilityResult,
  type ScreenerInput,
} from '@/app/actions';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

// Rough monthly value estimates for programs to compute a headline number
const MONTHLY_VALUE_ESTIMATES: Record<string, number> = {
  'benefits/snap': 290,
  'benefits/medicaid': 500,
  'healthcare/aca-enrollment': 400,
  'benefits/wic': 75,
  'benefits/liheap': 150,
  'benefits/section8': 800,
  'unemployment/claim-intake': 1400,
  'benefits/ssdi-application': 1400,
  'veterans/disability-claim': 1800,
  'veterans/va-healthcare': 400,
  'benefits/ssi': 940,
  'benefits/tanf': 450,
  'education/fafsa': 500,
};

function estimateAnnualValue(results: EligibilityResult[]): number {
  const likely = results.filter((r) => r.eligible === 'likely');
  return likely.reduce((sum, r) => {
    const monthly = MONTHLY_VALUE_ESTIMATES[r.workflowId] ?? 200;
    return sum + monthly * 12;
  }, 0);
}

export function ScreenerClient() {
  const [results, setResults] = useState<EligibilityResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(data: HouseholdContext) {
    setError(null);
    startTransition(async () => {
      try {
        const ages = data.ages
          ? data.ages.split(',').map((a) => parseInt(a.trim(), 10)).filter((a) => !isNaN(a))
          : Array.from({ length: data.householdSize }, () => 30);

        const input: ScreenerInput = {
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

        const result = await screenEligibility(input);
        setResults(result.results);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      }
    });
  }

  // Show results view
  if (results) {
    const likely = results.filter((r) => r.eligible === 'likely');
    const possible = results.filter((r) => r.eligible === 'possible');
    const unlikely = results.filter((r) => r.eligible === 'unlikely');
    const annualValue = estimateAnnualValue(results);

    return (
      <div className="space-y-8">
        {/* Headline value */}
        {likely.length > 0 && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center">
            <p className="text-sm text-green-400 font-mono uppercase tracking-wider mb-2">
              Estimated unclaimed annual value
            </p>
            <p className="text-4xl sm:text-5xl font-bold text-green-400 tabular-nums">
              ~{formatCurrency(annualValue)}<span className="text-lg text-green-400/60">/year</span>
            </p>
            <p className="text-sm text-muted mt-2">
              across {likely.length} program{likely.length !== 1 ? 's' : ''} you likely qualify for
            </p>
          </div>
        )}

        {results.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-foreground font-semibold mb-2">
              No likely program eligibility found
            </p>
            <p className="text-muted text-sm">
              This screener covers common federal programs. State and local programs
              may be available. Try the{' '}
              <Link href="/cliff" className="text-pigeon-pink hover:underline">
                benefits cliff calculator
              </Link>{' '}
              to see what you currently qualify for.
            </p>
          </div>
        )}

        {/* Likely eligible */}
        {likely.length > 0 && (
          <div>
            <h3 className="text-sm font-mono text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Likely Eligible ({likely.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {likely.map((r) => (
                <BenefitsCard key={r.workflowId} result={r} />
              ))}
            </div>
          </div>
        )}

        {/* Worth investigating */}
        {possible.length > 0 && (
          <div>
            <h3 className="text-sm font-mono text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Worth Investigating ({possible.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {possible.map((r) => (
                <BenefitsCard key={r.workflowId} result={r} />
              ))}
            </div>
          </div>
        )}

        {/* Unlikely -- collapsed by default */}
        {unlikely.length > 0 && (
          <details className="group">
            <summary className="text-sm font-mono text-muted uppercase tracking-wider cursor-pointer flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-muted/40" />
              Unlikely ({unlikely.length})
              <span className="text-xs text-muted ml-1 group-open:hidden">
                (click to expand)
              </span>
            </summary>
            <div className="grid gap-3 sm:grid-cols-2">
              {unlikely.map((r) => (
                <BenefitsCard key={r.workflowId} result={r} />
              ))}
            </div>
          </details>
        )}

        {/* Cross-link to cliff calculator */}
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-foreground font-semibold">
              Worried about losing benefits if you earn more?
            </p>
            <p className="text-muted text-sm">
              The cliff calculator shows exactly where benefits drop off.
            </p>
          </div>
          <Link
            href="/cliff"
            className="shrink-0 bg-gradient-to-r from-pigeon-purple to-pigeon-pink text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Calculate my cliff
          </Link>
        </div>

        {/* Start over */}
        <div className="text-center">
          <button
            onClick={() => setResults(null)}
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
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Household Information
          </h2>
          <p className="text-muted text-sm mb-6">
            Answer these questions to check eligibility across SNAP, Medicaid,
            TANF, WIC, SSI, LIHEAP, ACA subsidies, and more.
          </p>

          <ContextForm
            mode="full"
            storageKey="pigeongov-screener"
            submitLabel="Check my eligibility"
            pending={isPending}
            onSubmit={handleSubmit}
          />

          {error && (
            <div className="mt-4 rounded-lg border border-urgent/30 bg-urgent/10 p-4 text-sm text-urgent">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-mono text-sm text-pigeon-cyan uppercase tracking-wider mb-3">
            What we check
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            {[
              'SNAP (food stamps)',
              'Medicaid & CHIP',
              'ACA marketplace subsidies',
              'WIC (women, infants, children)',
              'LIHEAP (energy assistance)',
              'Section 8 housing',
              'Unemployment insurance',
              'SSDI & SSI disability',
              'TANF cash assistance',
              'VA healthcare & disability',
              'FAFSA financial aid',
            ].map((program) => (
              <li key={program} className="flex items-center gap-2">
                <span className="text-pigeon-cyan">&#10003;</span>
                {program}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-mono text-sm text-pigeon-purple uppercase tracking-wider mb-3">
            Privacy
          </h3>
          <p className="text-sm text-muted leading-relaxed">
            All calculations happen on the server. We don&apos;t store your data,
            sell it, or send it to third parties. Your answers are saved to your
            browser&apos;s localStorage only.
          </p>
        </div>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="lg:col-span-5">
          <ScreenerResultsSkeleton />
        </div>
      )}
    </div>
  );
}
