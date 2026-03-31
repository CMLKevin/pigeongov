'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { computeAlerts, type Alert } from '@/lib/alerts';
import type { HouseholdProfile } from '@/lib/local-storage';

// ---------------------------------------------------------------------------
// Alerts Panel
//
// Government deadlines are the one domain where surprises are never pleasant.
// This panel surfaces them before they surface you — tax returns, benefit
// renewals, children aging out of programs, legislative cliffs. The kind of
// thing a good caseworker would pin to your fridge.
// ---------------------------------------------------------------------------

function urgencySymbol(urgency: Alert['urgency']): string {
  switch (urgency) {
    case 'critical':
      return '\u26A1';
    case 'warning':
      return '\u25CB';
    default:
      return '\u00B7';
  }
}

function urgencyColor(urgency: Alert['urgency']): string {
  switch (urgency) {
    case 'critical':
      return 'text-[#ef4444]';
    case 'warning':
      return 'text-[#fbbf24]';
    default:
      return 'text-[#9d8ec2]';
  }
}

function AlertRow({ alert, isLast }: { alert: Alert; isLast: boolean }) {
  const connector = isLast ? '\u2514' : '\u251C';
  const prefix = isLast ? ' ' : '\u2502';
  const symbol = urgencySymbol(alert.urgency);
  const color = urgencyColor(alert.urgency);

  return (
    <div>
      {/* Main line */}
      <div className="flex items-start gap-0">
        <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
          {connector}{'\u2500 '}
        </span>
        <span className={cn('shrink-0 mr-2', color)}>{symbol}</span>
        <span
          className={cn(
            'flex-1 text-sm',
            alert.urgency === 'critical' ? 'text-[#ef4444] font-semibold' : 'text-white/90'
          )}
        >
          {alert.headline}
        </span>
        <span
          className={cn(
            'shrink-0 ml-2 text-xs tabular-nums',
            alert.daysUntil <= 14
              ? 'text-[#ef4444] font-bold'
              : alert.daysUntil <= 30
                ? 'text-[#fbbf24]'
                : 'text-[#9d8ec2]'
          )}
        >
          {alert.daysUntil}d
        </span>
      </div>

      {/* Detail line */}
      {alert.detail && (
        <div className="flex items-start gap-0">
          <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
            {prefix}{'   '}
          </span>
          <span className="text-[#9d8ec2] text-xs leading-relaxed">
            {alert.detail}
          </span>
        </div>
      )}

      {/* Action link */}
      {alert.actionUrl && (
        <div className="flex items-start gap-0">
          <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
            {prefix}{'   '}
          </span>
          <a
            href={alert.actionUrl}
            className="text-[#22d3ee] text-xs hover:underline"
          >
            {'> '}{alert.actionLabel ?? 'Take action'}
          </a>
        </div>
      )}

      {/* Spacer between items */}
      {!isLast && (
        <div className="text-[#3d2a7a] text-xs" aria-hidden="true">
          {'\u2502'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AlertsPanelProps {
  profile: HouseholdProfile | null;
  className?: string;
}

export function AlertsPanel({ profile, className }: AlertsPanelProps) {
  const alerts = useMemo(() => {
    if (!profile) {
      // No profile — show static deadlines only with a minimal profile
      return computeAlerts({
        members: [],
        state: '',
        annualIncome: 0,
        monthlyRent: 0,
        filingStatus: 'single',
        currentBenefits: [],
        completedWorkflows: [],
        hasStudentLoans: false,
        householdSize: 1,
        hasChildrenUnder18: false,
        hasElderlyMember: false,
        isVeteranHousehold: false,
        hasDisabledMember: false,
        lastUpdated: new Date().toISOString(),
        setupComplete: false,
      });
    }
    return computeAlerts(profile);
  }, [profile]);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.urgency === 'critical').length;

  return (
    <div
      className={cn(
        'border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono rounded-none',
        className
      )}
    >
      {/* Header */}
      <div className="border-b-2 border-[#3d2a7a] px-4 py-2 flex items-center justify-between bg-[#1a1040]/50">
        <span className="text-[#fbbf24] font-bold text-sm">
          Upcoming Deadlines
        </span>
        {criticalCount > 0 && (
          <span className="text-[#ef4444] text-xs font-bold">
            {criticalCount} urgent
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 text-sm">
        {alerts.slice(0, 8).map((alert, i) => (
          <AlertRow
            key={alert.id}
            alert={alert}
            isLast={i === Math.min(alerts.length, 8) - 1}
          />
        ))}

        {alerts.length > 8 && (
          <div className="text-[#9d8ec2] text-xs mt-2 pl-4">
            +{alerts.length - 8} more deadline{alerts.length - 8 !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsPanel;
