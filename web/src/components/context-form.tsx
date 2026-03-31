'use client';

import { useState, useEffect, useCallback } from 'react';
import { US_STATES, CITIZENSHIP_OPTIONS, EMPLOYMENT_OPTIONS } from '@/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HouseholdContext {
  householdSize: number;
  annualIncome: number;
  state: string;
  citizenshipStatus: string;
  ages: string;
  hasDisability: boolean;
  employmentStatus: string;
  isVeteran: boolean;
  hasHealthInsurance: boolean;
  monthlyRent: number;
  // Life-event compact checkboxes
  hasChildren?: boolean;
  onBenefits?: boolean;
  hasStudentLoans?: boolean;
}

interface ContextFormProps {
  /** Which fields to show */
  mode?: 'full' | 'compact' | 'cliff';
  /** localStorage key for persistence */
  storageKey?: string;
  /** Submit button label */
  submitLabel?: string;
  /** Whether the form is submitting */
  pending?: boolean;
  /** Called on submit */
  onSubmit: (data: HouseholdContext) => void;
  /** Extra content above the submit button */
  children?: React.ReactNode;
}

const DEFAULT_CONTEXT: HouseholdContext = {
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
};

// ── Shared primitives ────────────────────────────────────────────────────────

const inputBase =
  'w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted ' +
  'transition-all duration-200 ' +
  'focus:border-pigeon-purple focus:outline-none focus:ring-2 focus:ring-pigeon-purple/40';

const labelBase = 'block text-sm font-medium text-muted mb-1.5';

const checkboxBase =
  'h-5 w-5 rounded border-white/10 bg-[#1a1a2e] text-pigeon-purple focus:ring-2 focus:ring-pigeon-purple/40 cursor-pointer accent-pigeon-purple';

// ── Component ────────────────────────────────────────────────────────────────

export function ContextForm({
  mode = 'full',
  storageKey = 'pigeongov-context',
  submitLabel = 'Submit',
  pending = false,
  onSubmit,
  children,
}: ContextFormProps) {
  const [form, setForm] = useState<HouseholdContext>(DEFAULT_CONTEXT);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<HouseholdContext>;
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [storageKey]);

  // Persist to localStorage on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form, hydrated, storageKey]);

  const update = useCallback(
    <K extends keyof HouseholdContext>(key: K, value: HouseholdContext[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Household Size -- always shown */}
      <div>
        <label className={labelBase}>Household size</label>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update('householdSize', n)}
              className={`w-10 h-10 rounded-lg border text-sm font-medium transition-all ${
                form.householdSize === n
                  ? 'bg-pigeon-purple border-pigeon-purple text-white'
                  : 'bg-background border-border text-muted hover:border-pigeon-purple/50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Annual Income -- always shown */}
      <div>
        <label htmlFor="annualIncome" className={labelBase}>
          {mode === 'cliff'
            ? 'Current annual income'
            : 'Approximate annual household income'}
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] text-sm font-medium select-none">
            $
          </span>
          <input
            id="annualIncome"
            type="number"
            min={0}
            step={1000}
            value={form.annualIncome || ''}
            onChange={(e) => update('annualIncome', Number(e.target.value))}
            placeholder="28000"
            className={`${inputBase} pl-8 tabular-nums`}
            required
          />
        </div>
      </div>

      {/* State -- always shown */}
      <div>
        <label htmlFor="state" className={labelBase}>
          State
        </label>
        <div className="relative">
          <select
            id="state"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            className={`${inputBase} appearance-none pr-10`}
            required
          >
            <option value="">Select state...</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b6b8a]"
          >
            <path
              fillRule="evenodd"
              d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Cliff mode stops here */}
      {mode === 'cliff' && (
        <>
          {children}
          <SubmitButton pending={pending} label={submitLabel} />
        </>
      )}

      {/* Full and compact modes continue */}
      {mode !== 'cliff' && (
        <>
          {/* Citizenship -- full mode only */}
          {mode === 'full' && (
            <div>
              <label htmlFor="citizenshipStatus" className={labelBase}>
                Citizenship or immigration status
              </label>
              <div className="relative">
                <select
                  id="citizenshipStatus"
                  value={form.citizenshipStatus}
                  onChange={(e) => update('citizenshipStatus', e.target.value)}
                  className={`${inputBase} appearance-none pr-10`}
                >
                  {CITIZENSHIP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
          )}

          {/* Ages -- full mode only */}
          {mode === 'full' && (
            <div>
              <label htmlFor="ages" className={labelBase}>
                Ages of household members (comma-separated)
              </label>
              <input
                id="ages"
                type="text"
                value={form.ages}
                onChange={(e) => update('ages', e.target.value)}
                placeholder="35, 33, 5, 2"
                className={inputBase}
              />
              <p className="mt-1 text-xs text-muted/70 leading-relaxed">
                e.g., 35, 33, 5, 2
              </p>
            </div>
          )}

          {/* Employment -- full mode only */}
          {mode === 'full' && (
            <div>
              <label htmlFor="employmentStatus" className={labelBase}>
                Employment status
              </label>
              <div className="relative">
                <select
                  id="employmentStatus"
                  value={form.employmentStatus}
                  onChange={(e) => update('employmentStatus', e.target.value)}
                  className={`${inputBase} appearance-none pr-10`}
                >
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
          )}

          {/* Monthly rent -- full mode only */}
          {mode === 'full' && (
            <div>
              <label htmlFor="monthlyRent" className={labelBase}>
                Monthly rent or mortgage
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] text-sm font-medium select-none">
                  $
                </span>
                <input
                  id="monthlyRent"
                  type="number"
                  min={0}
                  step={50}
                  value={form.monthlyRent || ''}
                  onChange={(e) => update('monthlyRent', Number(e.target.value))}
                  placeholder="1200"
                  className={`${inputBase} pl-8 tabular-nums`}
                />
              </div>
            </div>
          )}

          {/* Checkboxes -- vary by mode */}
          <div className="space-y-3">
            {mode === 'full' && (
              <>
                <Checkbox
                  checked={form.isVeteran}
                  onChange={(v) => update('isVeteran', v)}
                  label="Military veteran in household"
                />
                <Checkbox
                  checked={form.hasDisability}
                  onChange={(v) => update('hasDisability', v)}
                  label="Disability in household"
                />
                <Checkbox
                  checked={form.hasHealthInsurance}
                  onChange={(v) => update('hasHealthInsurance', v)}
                  label="Everyone has health insurance"
                />
              </>
            )}

            {mode === 'compact' && (
              <>
                <Checkbox
                  checked={form.isVeteran}
                  onChange={(v) => update('isVeteran', v)}
                  label="Veteran"
                />
                <Checkbox
                  checked={form.hasDisability}
                  onChange={(v) => update('hasDisability', v)}
                  label="Disability"
                />
                <Checkbox
                  checked={form.hasChildren ?? false}
                  onChange={(v) => update('hasChildren', v)}
                  label="Children under 18"
                />
                <Checkbox
                  checked={form.onBenefits ?? false}
                  onChange={(v) => update('onBenefits', v)}
                  label="Currently on benefits"
                />
                <Checkbox
                  checked={form.hasStudentLoans ?? false}
                  onChange={(v) => update('hasStudentLoans', v)}
                  label="Have student loans"
                />
              </>
            )}
          </div>

          {children}

          <SubmitButton pending={pending} label={submitLabel} />
        </>
      )}
    </form>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-gradient-to-r from-pigeon-purple to-pigeon-pink text-white rounded-lg px-6 py-3 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner /> Processing...
        </span>
      ) : (
        label
      )}
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={checkboxBase}
      />
      <span className="text-sm text-[#c4c4d4] select-none">{label}</span>
    </label>
  );
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b6b8a]"
    >
      <path
        fillRule="evenodd"
        d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
