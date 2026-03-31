'use client';

import { cn } from '@/lib/utils';
import type { EligibilityResult } from '@/app/actions';

interface BenefitsCardProps {
  result: EligibilityResult;
  className?: string;
}

function eligibilityConfig(eligible: EligibilityResult['eligible']) {
  switch (eligible) {
    case 'likely':
      return {
        border: 'border-green-500/60',
        badge: 'bg-green-500/20 text-green-400',
        badgeLabel: 'Likely Eligible',
        bar: 'bg-green-500',
      };
    case 'possible':
      return {
        border: 'border-yellow-500/60',
        badge: 'bg-yellow-500/20 text-yellow-400',
        badgeLabel: 'Worth Investigating',
        bar: 'bg-yellow-500',
      };
    case 'unlikely':
      return {
        border: 'border-border',
        badge: 'bg-surface text-muted',
        badgeLabel: 'Unlikely',
        bar: 'bg-muted/40',
      };
    default:
      return {
        border: 'border-border',
        badge: 'bg-surface text-muted/60',
        badgeLabel: 'Not Eligible',
        bar: 'bg-muted/20',
      };
  }
}

function workflowDisplayName(workflowId: string): string {
  const parts = workflowId.split('/');
  const name = parts[parts.length - 1] ?? workflowId;
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function workflowDomain(workflowId: string): string {
  const domain = workflowId.split('/')[0] ?? '';
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export function BenefitsCard({ result, className }: BenefitsCardProps) {
  const config = eligibilityConfig(result.eligible);
  const confidence = Math.round(result.confidence * 100);

  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-5 transition-all hover:bg-surface-hover',
        config.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-1">
            {workflowDomain(result.workflowId)}
          </p>
          <h3 className="text-foreground font-semibold text-lg leading-tight">
            {workflowDisplayName(result.workflowId)}
          </h3>
        </div>
        <span
          className={cn(
            'shrink-0 text-xs font-medium px-2.5 py-1 rounded-full',
            config.badge
          )}
        >
          {config.badgeLabel}
        </span>
      </div>

      <p className="text-muted text-sm leading-relaxed mb-3">{result.reason}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', config.bar)}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs text-muted">{confidence}%</span>
        </div>

        {result.nextSteps.length > 0 && (
          <a
            href={`/workflows/${result.workflowId}`}
            className="text-pigeon-purple hover:text-pigeon-purple/80 text-sm font-medium transition-colors"
          >
            Start application &rarr;
          </a>
        )}
      </div>

      {result.nextSteps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted mb-1.5">Next steps:</p>
          <ul className="space-y-1">
            {result.nextSteps.map((step, i) => (
              <li key={i} className="text-sm text-muted flex gap-2">
                <span className="text-pigeon-cyan shrink-0">&bull;</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
