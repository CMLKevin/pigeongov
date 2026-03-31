'use client';

import { cn } from '@/lib/utils';
import type { LifeEventPlanResult, PlannedWorkflow } from '@/app/actions';

interface ActionPlanProps {
  plan: LifeEventPlanResult;
  className?: string;
}

function deadlineStatusConfig(status: string) {
  switch (status) {
    case 'overdue':
      return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'OVERDUE' };
    case 'urgent':
      return { bg: 'bg-red-500/10', text: 'text-urgent', label: 'URGENT' };
    case 'upcoming':
      return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'UPCOMING' };
    case 'distant':
      return { bg: 'bg-green-500/10', text: 'text-green-400', label: 'ON TRACK' };
    default:
      return { bg: 'bg-surface', text: 'text-muted', label: status };
  }
}

function PriorityDots({ priority }: { priority: number }) {
  if (priority <= 1) {
    return (
      <span className="flex gap-0.5" title="High priority">
        <span className="w-2 h-2 rounded-full bg-urgent" />
        <span className="w-2 h-2 rounded-full bg-urgent" />
        <span className="w-2 h-2 rounded-full bg-urgent" />
      </span>
    );
  }
  if (priority <= 2) {
    return (
      <span className="flex gap-0.5" title="Medium priority">
        <span className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="w-2 h-2 rounded-full bg-border" />
      </span>
    );
  }
  return (
    <span className="flex gap-0.5" title="Low priority">
      <span className="w-2 h-2 rounded-full bg-muted/40" />
      <span className="w-2 h-2 rounded-full bg-border" />
      <span className="w-2 h-2 rounded-full bg-border" />
    </span>
  );
}

function workflowDisplayName(workflowId: string): string {
  const parts = workflowId.split('/');
  const name = parts[parts.length - 1] ?? workflowId;
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function WorkflowCard({ workflow }: { workflow: PlannedWorkflow }) {
  const deadline = workflow.computedDeadline;
  const deadlineConfig = deadline ? deadlineStatusConfig(deadline.status) : null;
  const isUrgent = deadline
    ? deadline.status === 'overdue' || deadline.status === 'urgent'
    : workflow.priority <= 1;

  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-4 transition-all hover:bg-surface-hover',
        isUrgent ? 'border-urgent/50' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <PriorityDots priority={workflow.priority} />
          <div>
            <h4 className="text-foreground font-semibold">
              {workflowDisplayName(workflow.workflowId)}
            </h4>
            <p className="text-xs text-muted font-mono">{workflow.workflowId}</p>
          </div>
        </div>

        {deadlineConfig && deadline && (
          <div className="shrink-0 text-right">
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                deadlineConfig.bg,
                deadlineConfig.text
              )}
            >
              {deadlineConfig.label}
            </span>
            <p className={cn('text-xs mt-1', deadlineConfig.text)}>
              {deadline.computedDate}
              {deadline.status !== 'overdue' && (
                <span className="text-muted ml-1">({deadline.daysRemaining}d)</span>
              )}
            </p>
          </div>
        )}

        {!deadline && workflow.deadline && (
          <span className="text-xs text-urgent shrink-0">{workflow.deadline}</span>
        )}
      </div>

      <p className="text-sm text-muted leading-relaxed">{workflow.notes}</p>

      {workflow.dependsOn.length > 0 && (
        <p className="text-xs text-muted mt-2">
          <span className="text-pigeon-cyan">&rarr;</span> after:{' '}
          {workflow.dependsOn.join(', ')}
        </p>
      )}

      {deadline && (deadline.status === 'overdue' || deadline.status === 'urgent') && (
        <p className="text-xs text-urgent mt-2 flex items-center gap-1">
          <span>&#9888;</span> {deadline.consequence}
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        <a
          href={`/workflows/${workflow.workflowId}`}
          className="text-pigeon-purple hover:text-pigeon-purple/80 text-sm font-medium transition-colors"
        >
          Start workflow &rarr;
        </a>
      </div>
    </div>
  );
}

export function ActionPlan({ plan, className }: ActionPlanProps) {
  // Group workflows by phase
  const phases = new Map<number, { label: string; workflows: PlannedWorkflow[] }>();
  for (const workflow of plan.orderedWorkflows) {
    const existing = phases.get(workflow.phase);
    if (existing) {
      existing.workflows.push(workflow);
    } else {
      phases.set(workflow.phase, {
        label: workflow.phaseLabel ?? `Phase ${workflow.phase}`,
        workflows: [workflow],
      });
    }
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Summary stats */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted">
          <span className="text-foreground font-semibold">{plan.totalWorkflows}</span>{' '}
          workflows
        </span>
        <span className="text-border">|</span>
        <span className="text-muted">
          <span className="text-foreground font-semibold">{phases.size}</span> phases
        </span>
        {plan.estimatedHours != null && (
          <>
            <span className="text-border">|</span>
            <span className="text-muted">
              ~<span className="text-foreground font-semibold">{plan.estimatedHours}</span>{' '}
              hours estimated
            </span>
          </>
        )}
      </div>

      {/* Deadline summary bar */}
      {plan.deadlineSummary && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="font-mono text-sm text-muted uppercase tracking-wider mb-3">
            Deadline Summary
          </h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {plan.deadlineSummary.overdue > 0 && (
              <span className="text-urgent font-semibold">
                {plan.deadlineSummary.overdue} overdue
              </span>
            )}
            {plan.deadlineSummary.urgent > 0 && (
              <span className="text-urgent">
                {plan.deadlineSummary.urgent} urgent
              </span>
            )}
            <span className="text-muted">
              {plan.deadlineSummary.totalDeadlines} total deadlines
            </span>
            {plan.deadlineSummary.nextDeadline && (
              <span className="text-yellow-400">
                Next: {plan.deadlineSummary.nextDeadline.label} on{' '}
                {plan.deadlineSummary.nextDeadline.date} (
                {plan.deadlineSummary.nextDeadline.daysRemaining}d)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Phased workflow cards */}
      {[...phases.entries()].map(([phaseNum, { label, workflows }]) => (
        <div key={phaseNum}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-pigeon-purple/20 text-pigeon-purple flex items-center justify-center text-sm font-mono font-bold">
              {phaseNum}
            </div>
            <h3 className="font-mono text-lg text-foreground font-semibold">
              {label}
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workflows.map((workflow) => (
              <WorkflowCard key={workflow.workflowId} workflow={workflow} />
            ))}
          </div>
        </div>
      ))}

      {/* Urgent warning banner */}
      {plan.hasUrgentDeadlines && (
        <div className="bg-urgent/10 border border-urgent/30 rounded-xl p-4 text-urgent text-sm">
          <span className="font-semibold">&#9888; Some workflows have urgent deadlines</span>{' '}
          &mdash; start immediately to avoid penalties or lost benefits.
        </div>
      )}
    </div>
  );
}
