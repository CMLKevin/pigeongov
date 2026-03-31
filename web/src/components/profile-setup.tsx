"use client";

import { useState, useCallback } from "react";
import { TuiPanel } from "@/components/tui/tui-panel";
import { TuiProgressSteps } from "@/components/tui/tui-progress";
import { TuiInput, TuiSelect, TuiCheckbox } from "@/components/tui/tui-input";
import { TuiKbd } from "@/components/tui/tui-kbd";
import { TuiAsciiArt } from "@/components/tui/tui-ascii-art";
import { TuiDivider } from "@/components/tui/tui-ascii-art";
import { US_STATES } from "@/lib/constants";
import {
  saveHouseholdProfile,
  createEmptyProfile,
  type HouseholdProfile,
  type HouseholdMember,
  type MemberRelationship,
  type FilingStatus,
  type CurrentBenefit,
} from "@/lib/local-storage";

// ---------------------------------------------------------------------------
// Profile Setup Wizard
//
// A terminal-style interview. NOT a form — a conversation with a pigeon.
// 5 steps, 30 seconds, saves hours later.
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 5;

const FILING_OPTIONS = [
  { label: "Single", value: "single" },
  { label: "MFJ", value: "mfj" },
  { label: "MFS", value: "mfs" },
  { label: "HOH", value: "hoh" },
  { label: "Widow(er)", value: "widow" },
];

const RELATIONSHIP_OPTIONS: { label: string; value: MemberRelationship }[] = [
  { label: "Self", value: "self" },
  { label: "Spouse", value: "spouse" },
  { label: "Child", value: "child" },
  { label: "Parent", value: "parent" },
  { label: "Sibling", value: "sibling" },
  { label: "Other", value: "other" },
];

const BENEFIT_PROGRAMS = [
  { label: "SNAP (food stamps)", value: "SNAP" },
  { label: "Medicaid", value: "Medicaid" },
  { label: "SSI", value: "SSI" },
  { label: "SSDI", value: "SSDI" },
  { label: "TANF", value: "TANF" },
  { label: "Section 8 / HCV", value: "Section 8" },
  { label: "WIC", value: "WIC" },
  { label: "VA Benefits", value: "VA" },
  { label: "Medicare", value: "Medicare" },
  { label: "CHIP", value: "CHIP" },
];

interface ProfileSetupProps {
  /** Called when the user finishes the wizard */
  onComplete: (profile: HouseholdProfile) => void;
  /** Called if the user backs out */
  onCancel?: () => void;
  /** If editing an existing profile, pass it here */
  existingProfile?: HouseholdProfile | null;
}

export function ProfileSetup({
  onComplete,
  onCancel,
  existingProfile,
}: ProfileSetupProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<HouseholdProfile>(
    existingProfile ?? createEmptyProfile()
  );

  // Temporary state for member being added
  const [memberName, setMemberName] = useState("");
  const [memberAge, setMemberAge] = useState("");
  const [memberRelationship, setMemberRelationship] =
    useState<MemberRelationship>("self");

  // Temporary state for benefit being added
  const [benefitProgram, setBenefitProgram] = useState("");
  const [benefitAmount, setBenefitAmount] = useState("");

  const updateProfile = useCallback(
    (patch: Partial<HouseholdProfile>) => {
      setProfile((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const addMember = useCallback(() => {
    if (!memberName.trim() || !memberAge.trim()) return;
    const newMember: HouseholdMember = {
      name: memberName.trim(),
      age: parseInt(memberAge, 10) || 0,
      relationship: memberRelationship,
    };
    setProfile((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
    setMemberName("");
    setMemberAge("");
    setMemberRelationship(
      profile.members.length === 0 ? "spouse" : "child"
    );
  }, [memberName, memberAge, memberRelationship, profile.members.length]);

  const removeMember = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  }, []);

  const addBenefit = useCallback(() => {
    if (!benefitProgram) return;
    const newBenefit: CurrentBenefit = {
      program: benefitProgram,
      monthlyValue: parseInt(benefitAmount, 10) || 0,
    };
    setProfile((prev) => ({
      ...prev,
      currentBenefits: [...prev.currentBenefits, newBenefit],
    }));
    setBenefitProgram("");
    setBenefitAmount("");
  }, [benefitProgram, benefitAmount]);

  const removeBenefit = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      currentBenefits: prev.currentBenefits.filter((_, i) => i !== index),
    }));
  }, []);

  const nextStep = useCallback(() => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }, [step]);

  const prevStep = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  const finish = useCallback(() => {
    const completed: HouseholdProfile = {
      ...profile,
      setupComplete: true,
      lastUpdated: new Date().toISOString(),
    };
    saveHouseholdProfile(completed);
    onComplete(completed);
  }, [profile, onComplete]);

  return (
    <TuiPanel
      title="PigeonGov Setup"
      subtitle="~30 seconds"
      status="info"
      footer={
        <TuiKbd
          shortcuts={[
            { key: "tab", action: "next field" },
            { key: "enter", action: "confirm" },
            { key: "esc", action: step === 1 ? "cancel" : "back" },
          ]}
        />
      }
      className="max-w-2xl mx-auto"
    >
      {/* Progress bar */}
      <div className="mb-6">
        <TuiProgressSteps current={step} total={TOTAL_STEPS} />
      </div>

      {/* Step 1: Household members */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <TuiAsciiArt variant="pigeon-small" color="green" />
            <div className="text-sm text-[#c4b5fd]/80">
              <p>Let&apos;s get to know your household.</p>
              <p className="text-[#9d8ec2] text-xs mt-1">
                This takes 30 seconds and saves hours later.
              </p>
            </div>
          </div>

          <TuiDivider label="household members" />

          {/* Existing members */}
          {profile.members.length > 0 && (
            <div className="space-y-1">
              {profile.members.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-2 py-1 text-sm"
                >
                  <span className="text-[#4ade80]">{"\u2713"}</span>
                  <span className="text-white">
                    {m.name}
                  </span>
                  <span className="text-[#9d8ec2]">
                    ({m.age}, {m.relationship})
                  </span>
                  <button
                    onClick={() => removeMember(i)}
                    className="text-[#f472b6] text-xs hover:text-[#f472b6]/80 ml-auto"
                  >
                    [remove]
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add member form */}
          <div className="space-y-3 bg-[#1a1040]/50 p-3 border border-[#3d2a7a]">
            <p className="text-xs text-[#9d8ec2] uppercase tracking-wider font-bold">
              Add member
            </p>
            <TuiInput
              prompt="> Name:"
              value={memberName}
              onChange={setMemberName}
              placeholder="Maria"
              autoFocus
            />
            <TuiInput
              prompt="> Age:"
              value={memberAge}
              onChange={setMemberAge}
              placeholder="34"
              type="number"
            />
            <TuiSelect
              prompt="> Relationship:"
              options={RELATIONSHIP_OPTIONS}
              value={memberRelationship}
              onChange={(v) => setMemberRelationship(v as MemberRelationship)}
            />
            <button
              onClick={addMember}
              disabled={!memberName.trim() || !memberAge.trim()}
              className="text-sm font-mono text-[#4ade80] hover:text-[#4ade80]/80 disabled:text-[#3d2a7a] disabled:cursor-not-allowed transition-colors"
            >
              [+ add member]
            </button>
          </div>

          <StepNavigation
            step={step}
            onNext={nextStep}
            onPrev={onCancel}
            nextDisabled={profile.members.length === 0}
            prevLabel="cancel"
          />
        </div>
      )}

      {/* Step 2: State + Income */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-[#c4b5fd]/80">
            Where do you live, and roughly how much does your household earn?
          </p>

          <TuiDivider label="location & income" />

          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#9d8ec2] uppercase tracking-wider font-bold mb-2">
                State
              </p>
              <select
                value={profile.state}
                onChange={(e) => updateProfile({ state: e.target.value })}
                className="w-full bg-[#0f0a1f] border-2 border-[#3d2a7a] text-white font-mono text-sm px-3 py-2 rounded-none focus:border-[#4ade80] focus:outline-none appearance-none"
              >
                <option value="">Select state...</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <TuiInput
              prompt="> Annual household income:"
              value={profile.annualIncome ? String(profile.annualIncome) : ""}
              onChange={(v) =>
                updateProfile({ annualIncome: parseInt(v, 10) || 0 })
              }
              placeholder="42000"
              type="currency"
            />

            <TuiInput
              prompt="> Monthly rent/mortgage:"
              value={profile.monthlyRent ? String(profile.monthlyRent) : ""}
              onChange={(v) =>
                updateProfile({ monthlyRent: parseInt(v, 10) || 0 })
              }
              placeholder="1200"
              type="currency"
            />
          </div>

          <StepNavigation
            step={step}
            onNext={nextStep}
            onPrev={prevStep}
            nextDisabled={!profile.state}
          />
        </div>
      )}

      {/* Step 3: Filing status */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-[#c4b5fd]/80">
            How do you file your taxes?
          </p>

          <TuiDivider label="filing status" />

          <TuiSelect
            prompt="> Filing status:"
            options={FILING_OPTIONS}
            value={profile.filingStatus}
            onChange={(v) =>
              updateProfile({ filingStatus: v as FilingStatus })
            }
          />

          <div className="text-xs text-[#9d8ec2] space-y-1 mt-2">
            <p>
              <span className="text-[#4ade80]">Single</span> — unmarried, no
              dependents
            </p>
            <p>
              <span className="text-[#4ade80]">MFJ</span> — married filing
              jointly
            </p>
            <p>
              <span className="text-[#4ade80]">MFS</span> — married filing
              separately
            </p>
            <p>
              <span className="text-[#4ade80]">HOH</span> — head of household
              (unmarried with dependents)
            </p>
            <p>
              <span className="text-[#4ade80]">Widow(er)</span> — qualifying
              surviving spouse
            </p>
          </div>

          <StepNavigation step={step} onNext={nextStep} onPrev={prevStep} />
        </div>
      )}

      {/* Step 4: Quick flags */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-[#c4b5fd]/80">
            Quick flags — check anything that applies.
          </p>

          <TuiDivider label="household flags" />

          <div className="space-y-3">
            <TuiCheckbox
              checked={profile.isVeteranHousehold}
              onChange={(v) => updateProfile({ isVeteranHousehold: v })}
              label="Military veteran in household"
            />
            <TuiCheckbox
              checked={profile.hasDisabledMember}
              onChange={(v) => updateProfile({ hasDisabledMember: v })}
              label="Disability in household"
            />
            <TuiCheckbox
              checked={profile.hasStudentLoans ?? false}
              onChange={(v) => updateProfile({ hasStudentLoans: v })}
              label="Student loans"
            />
          </div>

          <TuiDivider label="current benefits" />

          <p className="text-xs text-[#9d8ec2]">
            Already receiving any benefits? This helps us avoid recommending
            things you already have.
          </p>

          {/* Existing benefits */}
          {profile.currentBenefits.length > 0 && (
            <div className="space-y-1">
              {profile.currentBenefits.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-2 py-1 text-sm"
                >
                  <span className="text-[#4ade80]">{"\u2713"}</span>
                  <span className="text-white">{b.program}</span>
                  {b.monthlyValue > 0 && (
                    <span className="text-[#9d8ec2]">
                      ${b.monthlyValue}/mo
                    </span>
                  )}
                  <button
                    onClick={() => removeBenefit(i)}
                    className="text-[#f472b6] text-xs hover:text-[#f472b6]/80 ml-auto"
                  >
                    [remove]
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add benefit */}
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={benefitProgram}
              onChange={(e) => setBenefitProgram(e.target.value)}
              className="bg-[#0f0a1f] border-2 border-[#3d2a7a] text-white font-mono text-xs px-2 py-1.5 rounded-none focus:border-[#4ade80] focus:outline-none appearance-none"
            >
              <option value="">Select program...</option>
              {BENEFIT_PROGRAMS.filter(
                (p) =>
                  !profile.currentBenefits.some(
                    (b) => b.program === p.value
                  )
              ).map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <TuiInput
              prompt="$/mo:"
              value={benefitAmount}
              onChange={setBenefitAmount}
              placeholder="635"
              type="currency"
            />
            <button
              onClick={addBenefit}
              disabled={!benefitProgram}
              className="text-xs font-mono text-[#4ade80] hover:text-[#4ade80]/80 disabled:text-[#3d2a7a] disabled:cursor-not-allowed transition-colors"
            >
              [+ add]
            </button>
          </div>

          <StepNavigation step={step} onNext={nextStep} onPrev={prevStep} />
        </div>
      )}

      {/* Step 5: Summary + Save */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-sm text-[#c4b5fd]/80">
            Here&apos;s your household profile. Look right?
          </p>

          <TuiDivider label="summary" />

          <div className="space-y-2 text-sm">
            {/* Members */}
            <div className="flex gap-2">
              <span className="text-[#9d8ec2] w-24 shrink-0">Members:</span>
              <span className="text-white">
                {profile.members.length === 0
                  ? "None added"
                  : profile.members
                      .map((m) => `${m.name}(${m.age})`)
                      .join("  ")}
              </span>
            </div>

            {/* State */}
            <div className="flex gap-2">
              <span className="text-[#9d8ec2] w-24 shrink-0">State:</span>
              <span className="text-white">
                {profile.state || "Not set"}
              </span>
            </div>

            {/* Income */}
            <div className="flex gap-2">
              <span className="text-[#9d8ec2] w-24 shrink-0">Income:</span>
              <span className="text-white">
                ${profile.annualIncome.toLocaleString()}/yr
              </span>
            </div>

            {/* Rent */}
            <div className="flex gap-2">
              <span className="text-[#9d8ec2] w-24 shrink-0">Rent:</span>
              <span className="text-white">
                ${profile.monthlyRent.toLocaleString()}/mo
              </span>
            </div>

            {/* Filing */}
            <div className="flex gap-2">
              <span className="text-[#9d8ec2] w-24 shrink-0">Filing:</span>
              <span className="text-white uppercase">
                {profile.filingStatus}
              </span>
            </div>

            {/* Flags */}
            <div className="flex gap-2">
              <span className="text-[#9d8ec2] w-24 shrink-0">Flags:</span>
              <span className="text-white">
                {[
                  profile.isVeteranHousehold && "Veteran",
                  profile.hasDisabledMember && "Disability",
                  profile.hasStudentLoans && "Student loans",
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </span>
            </div>

            {/* Benefits */}
            {profile.currentBenefits.length > 0 && (
              <div className="flex gap-2">
                <span className="text-[#9d8ec2] w-24 shrink-0">Benefits:</span>
                <span className="text-white">
                  {profile.currentBenefits
                    .map(
                      (b) =>
                        `${b.program}${b.monthlyValue ? ` $${b.monthlyValue}/mo` : ""}`
                    )
                    .join("  ")}
                </span>
              </div>
            )}
          </div>

          <TuiDivider />

          <div className="flex items-center gap-4">
            <button
              onClick={prevStep}
              className="text-sm font-mono text-[#9d8ec2] hover:text-white transition-colors"
            >
              {"<"} back
            </button>
            <button
              onClick={finish}
              className="flex-1 bg-[#4ade80]/15 border-2 border-[#4ade80] text-[#4ade80] font-mono font-bold text-sm px-4 py-2 hover:bg-[#4ade80]/25 transition-colors rounded-none"
            >
              {">"} Save profile
            </button>
          </div>
        </div>
      )}
    </TuiPanel>
  );
}

// ---------------------------------------------------------------------------
// Step Navigation — shared across all steps
// ---------------------------------------------------------------------------

function StepNavigation({
  step,
  onNext,
  onPrev,
  nextDisabled = false,
  prevLabel,
}: {
  step: number;
  onNext: () => void;
  onPrev?: () => void;
  nextDisabled?: boolean;
  prevLabel?: string;
}) {
  return (
    <div className="flex items-center gap-4 pt-2">
      {onPrev && (
        <button
          onClick={onPrev}
          className="text-sm font-mono text-[#9d8ec2] hover:text-white transition-colors"
        >
          {"<"} {prevLabel ?? "back"}
        </button>
      )}
      {step < TOTAL_STEPS && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="ml-auto text-sm font-mono text-[#4ade80] hover:text-[#4ade80]/80 disabled:text-[#3d2a7a] disabled:cursor-not-allowed transition-colors"
        >
          next {">"}
        </button>
      )}
    </div>
  );
}
