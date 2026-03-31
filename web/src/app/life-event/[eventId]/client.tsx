'use client';

import { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import { type HouseholdContext } from '@/components/context-form';
import {
  TuiPanel,
  TuiPanelDivider,
  TuiKbd,
  TuiInput,
  TuiCheckbox,
  TuiProgress,
  type TuiShortcut,
} from '@/components/tui';
import {
  getLifeEventPlan,
  screenEligibility,
  type LifeEventPlanResult,
  type PlannedWorkflow,
  type EligibilityResult,
} from '@/app/actions';
import { SharePanel } from '@/components/share-panel';
import { AlertsPanel } from '@/components/alerts-panel';
import { US_STATES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ShareableActionItem } from '@/lib/share';

// ── Event Tone Map ──────────────────────────────────────────────────────────
// Because "your spouse died" and "you're having a baby" should not share
// the same emotional register. This is the least the government can do.

const EVENT_TONES: Record<string, { message: string }> = {
  'death-of-spouse': { message: "We're sorry for your loss. It doesn't all need to happen today." },
  'job-loss': { message: "Some of these have tight deadlines \u2014 let's not miss anything." },
  'new-baby': { message: "Congratulations! Here's what the government needs to know." },
  'marriage': { message: "Congratulations! Marriage triggers a cascade of paperwork." },
  'divorce': { message: "Here's what needs to happen, step by step." },
  'becoming-disabled': { message: "We'll walk through every program you may qualify for." },
  'natural-disaster': { message: "We hope you're safe. Here's immediate assistance available." },
  'turning-18': { message: "Welcome to adulthood. Here's every government thing to know." },
  'received-inheritance': { message: "Inheriting assets affects benefits and taxes." },
  'turning-26': { message: "You're aging off your parent's insurance. The 60-day window is ticking." },
  'retirement': { message: "You've earned this. Let's claim everything you're owed." },
  'moving-states': { message: "Moving states means updating more than your address." },
  'buying-home': { message: "Congratulations! Here's the government side of homeownership." },
  'starting-business': { message: "Here's every license, permit, and tax obligation to know about." },
  'aging-into-medicare': { message: "Your enrollment window is open. Late penalties are permanent." },
  'lost-health-insurance': { message: "Losing coverage is stressful, but you have options. Clock is ticking." },
  'immigration-status-change': { message: "Status changes affect benefit eligibility and tax filing." },
  'had-income-change': { message: "Some programs require you to report changes within 10 days." },
  'arrested-or-convicted': { message: "Here's what changes and what you may still be eligible for." },
  'child-turning-18': { message: "Your child is becoming an adult in the eyes of the government." },
};

const DEFAULT_TONE = { message: "Here's your personalized action plan, organized by urgency." };

function getEventTone(eventId: string): { message: string } {
  return EVENT_TONES[eventId] ?? DEFAULT_TONE;
}

// ── Timeline Rendering ──────────────────────────────────────────────────────
// ASCII pipe characters, because cards are for greeting companies
// and we are a government paperwork engine.

type TimelineItemStatus = 'urgent' | 'pending' | 'complete';

interface TimelineItem {
  workflowId: string;
  label: string;
  description: string;
  status: TimelineItemStatus;
  deadline?: string;
  daysRemaining?: number;
  dependsOn: string[];
  actionLabel?: string;
  actionHref?: string;
}

interface TimelinePhase {
  id: string;
  label: string;
  urgentCount?: number;
  items: TimelineItem[];
}

function workflowDisplayName(workflowId: string): string {
  const parts = workflowId.split('/');
  const name = parts[parts.length - 1] ?? workflowId;
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildTimeline(plan: LifeEventPlanResult): TimelinePhase[] {
  const phaseMap = new Map<number, { label: string; workflows: PlannedWorkflow[] }>();
  for (const wf of plan.orderedWorkflows) {
    const existing = phaseMap.get(wf.phase);
    if (existing) {
      existing.workflows.push(wf);
    } else {
      phaseMap.set(wf.phase, {
        label: wf.phaseLabel ?? `Phase ${wf.phase}`,
        workflows: [wf],
      });
    }
  }

  return [...phaseMap.entries()].map(([phaseNum, { label, workflows }]) => {
    const urgentCount = workflows.filter(
      (w) =>
        w.priority <= 1 ||
        w.computedDeadline?.status === 'urgent' ||
        w.computedDeadline?.status === 'overdue'
    ).length;

    const items: TimelineItem[] = workflows.map((wf) => {
      const isUrgent =
        wf.priority <= 1 ||
        wf.computedDeadline?.status === 'urgent' ||
        wf.computedDeadline?.status === 'overdue';

      return {
        workflowId: wf.workflowId,
        label: workflowDisplayName(wf.workflowId),
        description: wf.notes,
        status: isUrgent ? ('urgent' as const) : ('pending' as const),
        deadline: wf.computedDeadline?.computedDate ?? wf.deadline,
        daysRemaining: wf.computedDeadline?.daysRemaining,
        dependsOn: wf.dependsOn,
        actionLabel: 'Start workflow',
        actionHref: `/workflows/${wf.workflowId}`,
      };
    });

    return {
      id: `phase-${phaseNum}`,
      label,
      urgentCount: urgentCount > 0 ? urgentCount : undefined,
      items,
    };
  });
}

// ── The Timeline Component ──────────────────────────────────────────────────

function Timeline({
  phases,
  selectedIndex,
  onSelect,
}: {
  phases: TimelinePhase[];
  selectedIndex: number;
  onSelect: (globalIndex: number) => void;
}) {
  let globalIdx = 0;

  return (
    <div className="font-mono text-sm">
      {phases.map((phase, phaseIdx) => {
        const isLastPhase = phaseIdx === phases.length - 1;
        const itemPrefix = isLastPhase ? ' ' : '\u2502';

        return (
          <div key={phase.id}>
            {/* Phase header */}
            <div className="flex items-center gap-0">
              <span className="text-[#4ade80] font-bold uppercase tracking-wider text-xs">
                {phase.label}
              </span>
              {phase.urgentCount != null && phase.urgentCount > 0 && (
                <span className="text-[#ef4444] ml-3 text-xs font-bold tabular-nums">
                  {phase.urgentCount} urgent
                </span>
              )}
              <span className="text-[#3d2a7a] ml-2 flex-1 overflow-hidden whitespace-nowrap" aria-hidden="true">
                {'\u2500'.repeat(40)}
              </span>
            </div>

            {/* Vertical connector */}
            <div className="text-[#3d2a7a]" aria-hidden="true">
              {'\u2502'}
            </div>

            {/* Items */}
            {phase.items.map((item, itemIdx) => {
              const currentGlobalIdx = globalIdx++;
              const isSelected = currentGlobalIdx === selectedIndex;
              const isLastItem = itemIdx === phase.items.length - 1;
              const itemConnector = isLastItem ? '\u2514' : '\u251C';
              const childPrefix = isLastItem ? ' ' : '\u2502';
              const statusSymbol =
                item.status === 'urgent'
                  ? '\u26A1'
                  : item.status === 'complete'
                    ? '\u2713'
                    : '\u25CB';
              const statusColor =
                item.status === 'urgent'
                  ? 'text-[#ef4444]'
                  : item.status === 'complete'
                    ? 'text-[#4ade80]'
                    : 'text-[#9d8ec2]';

              return (
                <div
                  key={item.workflowId}
                  className={cn(
                    'group cursor-pointer transition-colors',
                    isSelected && 'bg-[#1a1040]/80'
                  )}
                  onClick={() => onSelect(currentGlobalIdx)}
                >
                  {/* Main item line */}
                  <div className="flex items-start gap-0">
                    <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                      {itemConnector}{'\u2500 '}
                    </span>
                    <span className={cn('shrink-0 mr-2', statusColor)} aria-hidden="true">
                      {statusSymbol}
                    </span>
                    <span
                      className={cn(
                        'flex-1',
                        item.status === 'urgent' ? 'text-[#ef4444] font-semibold' : 'text-white/90',
                        isSelected && 'text-white font-semibold'
                      )}
                    >
                      {item.label}
                    </span>
                    {item.daysRemaining != null && (
                      <span
                        className={cn(
                          'shrink-0 ml-2 text-xs tabular-nums',
                          item.daysRemaining <= 7
                            ? 'text-[#ef4444] font-bold'
                            : item.daysRemaining <= 30
                              ? 'text-[#fbbf24]'
                              : 'text-[#9d8ec2]'
                        )}
                      >
                        DEADLINE: {item.daysRemaining}d
                      </span>
                    )}
                    {!item.daysRemaining && item.deadline && (
                      <span className="shrink-0 ml-2 text-xs text-[#9d8ec2] tabular-nums">
                        {item.deadline}
                      </span>
                    )}
                  </div>

                  {/* Description line */}
                  <div className="flex items-start gap-0">
                    <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                      {childPrefix}{'   '}
                    </span>
                    <span className="text-[#9d8ec2] text-xs leading-relaxed">
                      {item.description}
                    </span>
                  </div>

                  {/* Dependencies */}
                  {item.dependsOn.length > 0 && (
                    <div className="flex items-start gap-0">
                      <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                        {childPrefix}{'   '}
                      </span>
                      <span className="text-[#8b5cf6]/60 text-xs">
                        depends on: {item.dependsOn.map((d) => workflowDisplayName(d)).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Action link */}
                  {item.actionHref && (
                    <div className="flex items-start gap-0">
                      <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                        {childPrefix}{'   '}
                      </span>
                      <a
                        href={item.actionHref}
                        className={cn(
                          'text-[#22d3ee] text-xs hover:underline transition-colors',
                          isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                        )}
                      >
                        {'> '}{item.actionLabel ?? 'Start workflow'}
                      </a>
                    </div>
                  )}

                  {/* Blank separator */}
                  {!isLastItem && (
                    <div className="text-[#3d2a7a]" aria-hidden="true">
                      {childPrefix}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Gap between phases */}
            {!isLastPhase && (
              <div className="text-[#3d2a7a] py-1" aria-hidden="true">
                {''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Eligibility Section ─────────────────────────────────────────────────────

function EligibilitySection({ results }: { results: EligibilityResult[] }) {
  const likely = results.filter((r) => r.eligible === 'likely');
  const possible = results.filter((r) => r.eligible === 'possible');
  const all = [...likely, ...possible];

  if (all.length === 0) return null;

  return (
    <div className="font-mono text-sm space-y-1">
      {all.map((r) => {
        const symbol = r.eligible === 'likely' ? '\u2713' : '?';
        const color = r.eligible === 'likely' ? 'text-[#4ade80]' : 'text-[#fbbf24]';
        const name = workflowDisplayName(r.workflowId);
        const confidence = Math.round(r.confidence * 100);

        return (
          <div key={r.workflowId} className="flex items-center gap-2">
            <span className={cn('shrink-0 w-4 text-center', color)}>{symbol}</span>
            <span className="text-white/90 flex-1">{name}</span>
            <span className="text-[#9d8ec2] text-xs shrink-0 tabular-nums">
              {r.eligible === 'likely' ? `~${confidence}% match` : 'check eligibility'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Compact Context Gather ──────────────────────────────────────────────────
// Inline within the panel. No separate form page. Because grief doesn't
// need a wizard.

interface CompactContextProps {
  context: HouseholdContext;
  onChange: (ctx: HouseholdContext) => void;
}

function CompactContextGather({ context, onChange }: CompactContextProps) {
  const update = <K extends keyof HouseholdContext>(key: K, value: HouseholdContext[K]) => {
    onChange({ ...context, [key]: value });
  };

  return (
    <div className="font-mono text-sm space-y-2">
      <div className="text-[#9d8ec2] text-xs mb-2">
        Quick context (optional \u2014 helps us personalize):
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
        <TuiInput
          prompt="Household:"
          value={String(context.householdSize)}
          onChange={(v) => update('householdSize', parseInt(v) || 1)}
          type="number"
          className="w-40"
        />
        <div className="flex items-center gap-2">
          <span className="text-[#4ade80] font-bold shrink-0 text-sm">State:</span>
          <select
            value={context.state}
            onChange={(e) => update('state', e.target.value)}
            className="bg-transparent border-none outline-none text-white text-sm font-mono caret-[#4ade80] cursor-pointer"
          >
            <option value="" className="bg-[#0f0a1f]">
              --
            </option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code} className="bg-[#0f0a1f]">
                {s.code}
              </option>
            ))}
          </select>
        </div>
        <TuiInput
          prompt="Income:"
          value={context.annualIncome ? String(context.annualIncome) : ''}
          onChange={(v) => update('annualIncome', parseInt(v) || 0)}
          type="currency"
          placeholder="42000"
          className="w-44"
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        <TuiCheckbox
          checked={context.isVeteran}
          onChange={(v) => update('isVeteran', v)}
          label="Veteran"
        />
        <TuiCheckbox
          checked={context.hasChildren ?? false}
          onChange={(v) => update('hasChildren', v)}
          label="Children under 18"
        />
        <TuiCheckbox
          checked={context.onBenefits ?? false}
          onChange={(v) => update('onBenefits', v)}
          label="On benefits"
        />
      </div>
    </div>
  );
}

// ── Loading Skeleton (TUI-styled) ───────────────────────────────────────────

function TuiLoadingSkeleton() {
  return (
    <div className="font-mono text-sm px-4 py-6 space-y-2 animate-pulse">
      <div className="text-[#3d2a7a]">{'\u2502'}</div>
      <div className="text-[#3d2a7a]">
        {'\u251C\u2500\u2500'}{' '}
        <span className="bg-[#1a1040] text-transparent rounded-none">Loading workflows...</span>
        {' \u2500'.repeat(20)}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="text-[#3d2a7a]">
          {'\u2502   \u251C\u2500'}{' '}
          <span className="bg-[#1a1040] text-transparent rounded-none inline-block w-48">
            &nbsp;
          </span>
        </div>
      ))}
      <div className="text-[#3d2a7a]">
        {'\u2514\u2500\u2500'}{' '}
        <span className="bg-[#1a1040] text-transparent rounded-none inline-block w-32">
          &nbsp;
        </span>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface LifeEventClientProps {
  eventId: string;
}

export function LifeEventClient({ eventId }: LifeEventClientProps) {
  const eventTone = getEventTone(eventId);

  // State
  const [plan, setPlan] = useState<LifeEventPlanResult | null>(null);
  const [screenerResults, setScreenerResults] = useState<EligibilityResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [eventDate, setEventDate] = useState('');
  const [planning, setPlanning] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [showContext, setShowContext] = useState(false);
  const [householdContext, setHouseholdContext] = useState<HouseholdContext>({
    householdSize: 1,
    annualIncome: 0,
    state: '',
    citizenshipStatus: 'us_citizen',
    ages: '',
    hasDisability: false,
    employmentStatus: 'employed',
    isVeteran: false,
    hasHealthInsurance: true,
    monthlyRent: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Hydrate household context from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pigeongov-life-event-${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<HouseholdContext>;
        setHouseholdContext((prev) => ({ ...prev, ...parsed }));
        if (parsed.state && parsed.annualIncome && parsed.annualIncome > 0) {
          setShowContext(false);
        }
      } else {
        setShowContext(true);
      }
    } catch {
      setShowContext(true);
    }
  }, [eventId]);

  // Persist household context
  useEffect(() => {
    try {
      localStorage.setItem(
        `pigeongov-life-event-${eventId}`,
        JSON.stringify(householdContext)
      );
    } catch {
      // ignore
    }
  }, [householdContext, eventId]);

  // Build the plan
  const buildPlan = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const date = planning ? undefined : eventDate || undefined;
        const planResult = await getLifeEventPlan(eventId, date);
        setPlan(planResult);

        const ctx = householdContext;
        if (ctx.state && ctx.annualIncome > 0) {
          const ages = ctx.ages
            ? ctx.ages
                .split(',')
                .map((a) => parseInt(a.trim(), 10))
                .filter((a) => !isNaN(a))
            : Array.from({ length: ctx.householdSize }, () => 30);

          const screenerInput = {
            householdSize: ctx.householdSize,
            annualHouseholdIncome: ctx.annualIncome,
            state: ctx.state,
            citizenshipStatus: ctx.citizenshipStatus || 'us_citizen',
            ages,
            hasDisability: ctx.hasDisability,
            employmentStatus: ctx.employmentStatus || 'employed',
            isVeteran: ctx.isVeteran,
            hasHealthInsurance: ctx.hasHealthInsurance ?? true,
            monthlyRent: ctx.monthlyRent || 0,
          };

          const screenerResult = await screenEligibility(screenerInput);
          setScreenerResults(screenerResult.results);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
      }
    });
  }, [eventId, eventDate, planning, householdContext]);

  // Keyboard navigation
  const totalItems = plan ? plan.orderedWorkflows.length : 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!plan) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedItemIndex((i) => Math.min(i + 1, totalItems - 1));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedItemIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter': {
          e.preventDefault();
          const wf = plan.orderedWorkflows[selectedItemIndex];
          if (wf) {
            window.location.href = `/workflows/${wf.workflowId}`;
          }
          break;
        }
        case 's': {
          // Share handled by the SharePanel component
          break;
        }
        case 'p': {
          e.preventDefault();
          window.print();
          break;
        }
        case 'r': {
          e.preventDefault();
          setPlan(null);
          setScreenerResults(null);
          setSelectedItemIndex(0);
          break;
        }
      }
    },
    [plan, selectedItemIndex, totalItems]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Keyboard shortcuts for the footer
  const shortcuts: TuiShortcut[] = plan
    ? [
        { key: '\u2191\u2193', action: 'navigate' },
        { key: 'enter', action: 'start' },
        { key: 's', action: 'share' },
        { key: 'p', action: 'print' },
        { key: 'r', action: 'reset' },
      ]
    : [
        { key: 'enter', action: 'build plan' },
      ];

  // Build timeline phases
  const timelinePhases = plan ? buildTimeline(plan) : [];

  // Build shareable data from plan
  const shareData = plan
    ? {
        title: `${plan.event.label} Action Plan`,
        source: `life-event/${eventId}`,
        items: plan.orderedWorkflows.map((wf): ShareableActionItem => ({
          id: wf.workflowId,
          label: workflowDisplayName(wf.workflowId),
          deadline: wf.computedDeadline?.computedDate ?? wf.deadline,
          status:
            wf.priority <= 1 ||
            wf.computedDeadline?.status === 'urgent' ||
            wf.computedDeadline?.status === 'overdue'
              ? ('urgent' as const)
              : ('pending' as const),
          phase: wf.phase,
          phaseLabel: wf.phaseLabel ?? `Phase ${wf.phase}`,
        })),
        programs: screenerResults
          ?.filter((r) => r.eligible === 'likely' || r.eligible === 'possible')
          .map((r) => workflowDisplayName(r.workflowId)),
        flags: plan.hasUrgentDeadlines ? ['urgent deadlines'] : undefined,
      }
    : undefined;

  // ── The Render ──────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="outline-none space-y-4" tabIndex={0}>
      <TuiPanel
        title="pigeongov"
        subtitle={eventId}
        footer={<TuiKbd shortcuts={shortcuts} />}
        flush
      >
        {/* ── Opening Message ──────────────────────────────────────────── */}
        <div className="px-4 py-4">
          <p className="text-[#c4b5fd] text-sm leading-relaxed">
            {eventTone.message}
          </p>
        </div>

        {/* ── Date Picker + Context (pre-plan) ─────────────────────────── */}
        {!plan && (
          <>
            <div className="px-4 pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[#4ade80] font-mono font-bold text-sm shrink-0">
                  When?
                </span>
                <span className="text-[#4ade80] font-mono text-sm">{'>'}</span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    setPlanning(false);
                  }}
                  disabled={planning}
                  className={cn(
                    'bg-transparent border-b border-[#3d2a7a] text-white font-mono text-sm outline-none',
                    'focus:border-[#4ade80] transition-colors caret-[#4ade80]',
                    planning && 'opacity-40'
                  )}
                />
                <TuiCheckbox
                  checked={planning}
                  onChange={(v) => {
                    setPlanning(v);
                    if (v) setEventDate('');
                  }}
                  label="Planning ahead"
                />
              </div>
            </div>

            {/* Compact context gather */}
            {showContext && (
              <>
                <TuiPanelDivider />
                <div className="px-4 py-3">
                  <CompactContextGather context={householdContext} onChange={setHouseholdContext} />
                </div>
              </>
            )}

            {/* Build plan button */}
            <div className="px-4 py-3">
              {!showContext && (
                <button
                  type="button"
                  onClick={() => setShowContext(true)}
                  className="text-xs text-[#9d8ec2] hover:text-white font-mono transition-colors mr-4"
                >
                  + add household context
                </button>
              )}
              <button
                type="button"
                onClick={buildPlan}
                disabled={isPending}
                className={cn(
                  'font-mono text-sm font-bold px-4 py-2 transition-all',
                  'bg-[#4ade80]/10 border border-[#4ade80] text-[#4ade80]',
                  'hover:bg-[#4ade80]/20 hover:shadow-[0_0_16px_-4px_rgba(74,222,128,0.3)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isPending ? '[ processing... ]' : '[ build my action plan ]'}
              </button>
            </div>
          </>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="px-4 py-2 text-[#f472b6] font-mono text-sm">
            {'\u2717'} {error}
          </div>
        )}

        {/* ── Loading State ────────────────────────────────────────────── */}
        {isPending && <TuiLoadingSkeleton />}

        {/* ── The Plan ─────────────────────────────────────────────────── */}
        {plan && (
          <>
            {/* ── Action Plan Header ───────────────────────────────────── */}
            <div className="border-t-2 border-[#3d2a7a]" />
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[#4ade80] font-mono font-bold text-xs uppercase tracking-wider">
                Action Plan
              </span>
              <span className="text-[#9d8ec2] font-mono text-xs">
                {plan.totalWorkflows} workflows
                {plan.estimatedHours != null && ` \u00B7 ~${plan.estimatedHours}h`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-2">
              <TuiProgress
                value={0}
                max={plan.totalWorkflows}
                label="completed"
                color="green"
                width={30}
              />
            </div>

            {/* Timeline */}
            <div className="px-4 py-2">
              <Timeline
                phases={timelinePhases}
                selectedIndex={selectedItemIndex}
                onSelect={setSelectedItemIndex}
              />
            </div>

            {/* ── You May Qualify For ──────────────────────────────────── */}
            {screenerResults && screenerResults.length > 0 && (
              <>
                <div className="border-t-2 border-[#3d2a7a]" />
                <div className="px-4 py-2">
                  <span className="text-[#4ade80] font-mono font-bold text-xs uppercase tracking-wider">
                    You May Qualify For
                  </span>
                </div>
                <div className="px-4 pb-3">
                  <EligibilitySection results={screenerResults} />
                </div>
              </>
            )}

            {/* ── Urgent Warning ─────────────────────────────────────── */}
            {plan.hasUrgentDeadlines && (
              <>
                <div className="border-t-2 border-[#3d2a7a]" />
                <div className="px-4 py-2 text-[#ef4444] font-mono text-xs">
                  {'\u26A1'} Some workflows have urgent deadlines \u2014 start immediately to avoid
                  penalties or lost benefits.
                </div>
              </>
            )}
          </>
        )}
      </TuiPanel>

      {/* ── Share Panel (below the main panel, after plan is built) ─── */}
      {plan && shareData && (
        <SharePanel data={shareData} />
      )}

      {/* ── Alerts Panel ──────────────────────────────────────────────── */}
      {plan && (
        <AlertsPanel profile={null} />
      )}
    </div>
  );
}
