'use server';

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

const CLI_PATH = join(process.cwd(), '..', 'dist', 'bin', 'pigeongov.js');

function runCli(args: string): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    encoding: 'utf-8',
    timeout: 15_000,
    cwd: join(process.cwd(), '..'),
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

function callEngine(args: string): unknown {
  try {
    const raw = runCli(args);
    return JSON.parse(raw);
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // fall through
      }
    }
    throw new Error(
      `Engine error: ${error.stderr || error.message || 'Unknown error'}`
    );
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComputedDeadline {
  computedDate: string;
  status: 'overdue' | 'urgent' | 'upcoming' | 'distant';
  daysRemaining: number;
  label: string;
  consequence: string;
  isHardDeadline: boolean;
  workflowId: string;
}

export interface PlannedWorkflow {
  workflowId: string;
  priority: number;
  deadline: string | undefined;
  notes: string;
  dependsOn: string[];
  phase: number;
  phaseLabel?: string;
  computedDeadline?: ComputedDeadline;
}

export interface LifeEventPlanResult {
  event: {
    id: string;
    label: string;
    description: string;
  };
  orderedWorkflows: PlannedWorkflow[];
  totalWorkflows: number;
  hasUrgentDeadlines: boolean;
  computedDeadlines?: ComputedDeadline[];
  estimatedHours?: number;
  deadlineSummary?: {
    totalDeadlines: number;
    overdue: number;
    urgent: number;
    nextDeadline: {
      label: string;
      date: string;
      daysRemaining: number;
    } | null;
  };
}

export interface LifeEventListItem {
  id: string;
  label: string;
  description: string;
  workflowCount: number;
}

export interface ScreenerInput {
  householdSize: number;
  annualHouseholdIncome: number;
  state: string;
  citizenshipStatus: string;
  ages: number[];
  hasDisability: boolean;
  employmentStatus: string;
  isVeteran: boolean;
  hasHealthInsurance: boolean;
  monthlyRent: number;
}

export interface EligibilityResult {
  workflowId: string;
  eligible: 'likely' | 'possible' | 'unlikely' | 'ineligible';
  confidence: number;
  reason: string;
  nextSteps: string[];
}

export interface ScreenerResult {
  input: ScreenerInput;
  results: EligibilityResult[];
}

export interface CliffBenefit {
  program: string;
  monthlyValue: number;
}

export interface CliffPoint {
  income: number;
  programLost: string;
  monthlyLoss: number;
  annualLoss: number;
}

export interface CliffAnalysis {
  currentIncome: number;
  householdSize: number;
  state: string;
  currentBenefits: CliffBenefit[];
  cliffPoints: CliffPoint[];
  safeRaiseThreshold: number;
  recommendation: string;
}

// ── Server Actions ───────────────────────────────────────────────────────────

export async function listLifeEvents(): Promise<LifeEventListItem[]> {
  const result = callEngine('life-event --json');
  return result as LifeEventListItem[];
}

export async function getLifeEventPlan(
  eventId: string,
  date?: string
): Promise<LifeEventPlanResult> {
  const dateArg = date ? ` --date ${date}` : '';
  const result = callEngine(`life-event ${eventId}${dateArg} --json`);
  return result as LifeEventPlanResult;
}

export async function screenEligibility(
  input: ScreenerInput
): Promise<ScreenerResult> {
  const tmpFile = join(tmpdir(), `pigeongov-screen-${randomUUID()}.json`);
  try {
    writeFileSync(tmpFile, JSON.stringify(input), 'utf-8');
    const result = callEngine(`screen --input ${tmpFile} --json`);
    return result as ScreenerResult;
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // best-effort cleanup
    }
  }
}

export async function calculateCliff(
  income: number,
  household: number,
  state: string
): Promise<CliffAnalysis> {
  const result = callEngine(
    `cliff --income ${income} --household ${household} --state ${state} --json`
  );
  return result as CliffAnalysis;
}
