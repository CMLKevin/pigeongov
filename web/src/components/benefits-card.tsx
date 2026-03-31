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
        border: 'border-[#4ade80]/60 shadow-[0_0_16px_-4px_rgba(74,222,128,0.2)]',
        badge: 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30',
        badgeLabel: 'Likely Eligible',
        bar: 'bg-[#4ade80]',
      };
    case 'possible':
      return {
        border: 'border-[#8b5cf6]/60',
        badge: 'bg-[#8b5cf6]/15 text-[#c4b5fd] border border-[#8b5cf6]/30',
        badgeLabel: 'Worth Investigating',
        bar: 'bg-[#8b5cf6]',
      };
    case 'unlikely':
      return {
        border: 'border-[#3d2a7a]/40',
        badge: 'bg-[#251660] text-[#6b5b8a]',
        badgeLabel: 'Unlikely',
        bar: 'bg-[#3d2a7a]/40',
      };
    default:
      return {
        border: 'border-[#3d2a7a]/30',
        badge: 'bg-[#251660] text-[#6b5b8a]/60',
        badgeLabel: 'Not Eligible',
        bar: 'bg-[#3d2a7a]/20',
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
        'rounded-xl border-2 bg-[#1a1040] p-5 transition-all hover:bg-[#251660]',
        config.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-[#9d8ec2] font-mono uppercase tracking-wider mb-1">
            {workflowDomain(result.workflowId)}
          </p>
          <h3 className="text-white font-mono font-semibold text-lg leading-tight">
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

      <p className="text-[#c4b5fd]/80 text-sm font-mono leading-relaxed mb-3">{result.reason}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-[#0f0a1f] rounded-full overflow-hidden border border-[#3d2a7a]/50">
            <div
              className={cn('h-full rounded-full transition-all', config.bar)}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs text-[#9d8ec2] font-mono">{confidence}%</span>
        </div>

        {result.nextSteps.length > 0 && (
          <a
            href={`/workflows/${result.workflowId}`}
            className="text-[#4ade80] hover:text-[#4ade80]/80 text-sm font-mono font-medium transition-colors"
          >
            Start application &rarr;
          </a>
        )}
      </div>

      {result.nextSteps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#3d2a7a]">
          <p className="text-xs text-[#9d8ec2] font-mono mb-1.5">Next steps:</p>
          <ul className="space-y-1">
            {result.nextSteps.map((step, i) => (
              <li key={i} className="text-sm text-[#c4b5fd]/80 font-mono flex gap-2">
                <span className="text-[#4ade80] shrink-0">&bull;</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
