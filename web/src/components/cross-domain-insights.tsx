'use client';

import { cn } from '@/lib/utils';
import type {
  CrossDomainInsight,
  InsightsResult,
} from '@/lib/cross-domain';

// ---------------------------------------------------------------------------
// Cross-Domain Insights Panel
//
// After you finish a workflow, the government wants to pretend the other
// agencies don't exist. This panel connects the dots they won't:
// tax filings that affect benefit eligibility, income cliffs that would
// vaporize your SNAP, student loan payments that could be halved.
// ---------------------------------------------------------------------------

function InsightIcon({ category }: { category: CrossDomainInsight['category'] }) {
  const icons: Record<string, string> = {
    benefits: '\u2713',
    cliff: '\u26A0',
    'student-loans': '\u00A7',
    tax: '\u00A7',
    immigration: '\u25CB',
    healthcare: '+',
    aging: '\u25CB',
  };
  return <span>{icons[category] ?? '\u25CB'}</span>;
}

function urgencyColor(urgency: CrossDomainInsight['urgency']): string {
  switch (urgency) {
    case 'high':
      return 'text-[#ef4444]';
    case 'medium':
      return 'text-[#fbbf24]';
    default:
      return 'text-[#9d8ec2]';
  }
}

function confidenceBadge(confidence: CrossDomainInsight['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MED';
    default:
      return 'LOW';
  }
}

// ---------------------------------------------------------------------------
// Individual insight row
// ---------------------------------------------------------------------------

function InsightRow({ insight }: { insight: CrossDomainInsight }) {
  const uColor = urgencyColor(insight.urgency);

  return (
    <div className="group">
      {/* Main line */}
      <div className="flex items-start gap-0">
        <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
          {'\u2502  \u251C\u2500 '}
        </span>
        <span className={cn('shrink-0 mr-2', uColor)}>
          <InsightIcon category={insight.category} />
        </span>
        <span className="text-white/90 text-sm flex-1">{insight.headline}</span>
        <span className="shrink-0 ml-2 text-xs text-[#9d8ec2] tabular-nums">
          [{confidenceBadge(insight.confidence)}]
        </span>
      </div>

      {/* Benefits sub-items */}
      {insight.benefits && insight.benefits.length > 0 && (
        <div className="ml-0">
          {insight.benefits.map((b, i) => {
            const symbol = b.eligible === 'likely' ? '\u2713' : b.eligible === 'possible' ? '?' : '\u25CB';
            const color =
              b.eligible === 'likely'
                ? 'text-[#4ade80]'
                : b.eligible === 'possible'
                  ? 'text-[#fbbf24]'
                  : 'text-[#9d8ec2]';
            return (
              <div key={i} className="flex items-center gap-0">
                <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                  {'\u2502     '}
                </span>
                <span className={cn('shrink-0 w-4 text-center', color)}>{symbol}</span>
                <span className="text-white/80 text-xs ml-1 flex-1">{b.program}</span>
                <span className="text-[#4ade80] text-xs tabular-nums shrink-0 ml-2">
                  ~${b.estimatedMonthly}/mo
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cliff warning */}
      {insight.cliff && (
        <div className="flex items-center gap-0">
          <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
            {'\u2502     '}
          </span>
          <span className="text-[#ef4444] text-xs">
            {'\u26A1'} ${insight.cliff.margin.toLocaleString()} below {insight.cliff.program} cutoff
            {' \u2014 '}losing it costs ~${insight.cliff.annualLoss.toLocaleString()}/yr
          </span>
        </div>
      )}

      {/* Student loan detail */}
      {insight.studentLoan && (
        <div className="flex items-center gap-0">
          <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
            {'\u2502     '}
          </span>
          <span className="text-[#22d3ee] text-xs">
            Standard: ${insight.studentLoan.currentPayment}/mo {'\u2192'} IDR: ${insight.studentLoan.idrPayment}/mo
            {' (save $'}{insight.studentLoan.monthlySavings}/mo{')'}
          </span>
        </div>
      )}

      {/* Estimated annual value */}
      {insight.estimatedAnnualValue != null && insight.estimatedAnnualValue > 0 && (
        <div className="flex items-center gap-0">
          <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
            {'\u2502     '}
          </span>
          <span className="text-[#4ade80] text-xs">
            est. ~${insight.estimatedAnnualValue.toLocaleString()}/yr
          </span>
        </div>
      )}

      {/* Spacer */}
      <div className="text-[#3d2a7a]" aria-hidden="true">
        {'\u2502'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CrossDomainInsightsProps {
  insights: InsightsResult;
}

export function CrossDomainInsights({ insights }: CrossDomainInsightsProps) {
  if (insights.insights.length === 0) return null;

  return (
    <div className="border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono rounded-none">
      {/* Header */}
      <div className="border-b-2 border-[#3d2a7a] px-4 py-2 flex items-center justify-between bg-[#1a1040]/50">
        <span className="text-[#22d3ee] font-bold text-sm">
          Cross-Domain Intelligence
        </span>
        <span className="text-[#9d8ec2] text-xs">
          {insights.connectionCount} connection{insights.connectionCount !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 text-sm">
        {/* Summary line */}
        {insights.totalEstimatedUnclaimed > 0 && (
          <>
            <div className="flex items-center gap-0 mb-1">
              <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                {'\u2502'}
              </span>
            </div>
            <div className="flex items-center gap-0 mb-2">
              <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                {'\u251C\u2500\u2500 '}
              </span>
              <span className="text-[#4ade80] font-bold">
                Estimated unclaimed: ~${insights.totalEstimatedUnclaimed.toLocaleString()}/yr
              </span>
            </div>
          </>
        )}

        {/* Individual insights */}
        {insights.insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} />
        ))}

        {/* Closing connector */}
        <div className="text-[#3d2a7a]" aria-hidden="true">
          {'\u2514\u2500\u2500 '}
          <span className="text-[#9d8ec2] text-xs">
            generated {new Date(insights.generatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock insights generator for workflow types
// ---------------------------------------------------------------------------

export function generateMockInsights(
  workflowId: string,
  domain: string
): InsightsResult {
  const insights: CrossDomainInsight[] = [];
  let nextId = 1;

  if (domain === 'tax' || workflowId.includes('1040') || workflowId.includes('tax')) {
    insights.push({
      id: `mock-${nextId++}`,
      category: 'benefits',
      headline: 'Your AGI may qualify you for benefit programs',
      confidence: 'medium',
      benefits: [
        { program: 'SNAP', estimatedMonthly: 290, eligible: 'possible', action: 'Check eligibility' },
        { program: 'ACA Subsidies', estimatedMonthly: 400, eligible: 'likely', action: 'Check eligibility' },
      ],
      estimatedAnnualValue: 8280,
      urgency: 'medium',
    });
    insights.push({
      id: `mock-${nextId++}`,
      category: 'tax',
      headline: 'You may qualify for the Earned Income Tax Credit (EITC)',
      confidence: 'low',
      estimatedAnnualValue: 3000,
      urgency: 'medium',
    });
  }

  if (domain === 'benefits' || workflowId.includes('snap') || workflowId.includes('medicaid')) {
    insights.push({
      id: `mock-${nextId++}`,
      category: 'benefits',
      headline: 'Since you qualify for this program, you may also qualify for:',
      confidence: 'medium',
      benefits: [
        { program: 'LIHEAP', estimatedMonthly: 150, eligible: 'possible', action: 'Check eligibility' },
        { program: 'Medicaid', estimatedMonthly: 500, eligible: 'likely', action: 'Check eligibility' },
        { program: 'CHIP', estimatedMonthly: 250, eligible: 'possible', action: 'Check eligibility' },
      ],
      estimatedAnnualValue: 10800,
      urgency: 'medium',
    });
    insights.push({
      id: `mock-${nextId++}`,
      category: 'cliff',
      headline: 'Income cliff detected near your benefit threshold',
      confidence: 'high',
      cliff: {
        currentIncome: 28000,
        cutoffIncome: 30000,
        program: 'SNAP',
        annualLoss: 3480,
        margin: 2000,
      },
      urgency: 'high',
    });
  }

  if (domain === 'education' || workflowId.includes('student') || workflowId.includes('loan')) {
    insights.push({
      id: `mock-${nextId++}`,
      category: 'student-loans',
      headline: 'At this income, income-driven repayment could reduce your payment',
      confidence: 'medium',
      studentLoan: {
        currentPayment: 331,
        idrPayment: 85,
        monthlySavings: 246,
        note: 'SAVE plan payment based on discretionary income',
      },
      estimatedAnnualValue: 2952,
      urgency: 'medium',
    });
    insights.push({
      id: `mock-${nextId++}`,
      category: 'benefits',
      headline: 'Student loan payments affect your disposable income for benefit calculations',
      confidence: 'low',
      benefits: [
        { program: 'ACA Subsidies', estimatedMonthly: 400, eligible: 'possible', action: 'Check eligibility' },
      ],
      estimatedAnnualValue: 4800,
      urgency: 'low',
    });
  }

  const totalEstimatedUnclaimed = insights.reduce(
    (sum, i) => sum + (i.estimatedAnnualValue ?? 0),
    0
  );

  return {
    insights,
    totalEstimatedUnclaimed,
    connectionCount: insights.length,
    generatedAt: new Date().toISOString(),
  };
}

export default CrossDomainInsights;
