"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getHouseholdProfile,
  type HouseholdProfile,
} from "@/lib/local-storage";

// ---------------------------------------------------------------------------
// Profile Banner — shown at the top of pages when a profile exists.
//
// ┌ Your Household ───────────────────────────────────────────┐
// │ 4 people · California · $42,000/yr · Filing: MFJ         │
// │ Maria(34) Carlos(36) Sofia(8) Leo(3)                     │
// │ Currently: SNAP $635/mo · Medicaid                       │
// │                                                [edit] [x] │
// └───────────────────────────────────────────────────────────┘
// ---------------------------------------------------------------------------

interface ProfileBannerProps {
  /** Called when user clicks "edit" */
  onEdit?: () => void;
  /** Called when user dismisses the banner */
  onDismiss?: () => void;
  className?: string;
}

const FILING_LABELS: Record<string, string> = {
  single: "Single",
  mfj: "MFJ",
  mfs: "MFS",
  hoh: "HOH",
  widow: "Widow(er)",
};

export function ProfileBanner({
  onEdit,
  onDismiss,
  className,
}: ProfileBannerProps) {
  const [profile, setProfile] = useState<HouseholdProfile | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const p = getHouseholdProfile();
    if (p && p.setupComplete) {
      setProfile(p);
    }
  }, []);

  if (!profile || dismissed) return null;

  const stateLabel = profile.state || "??";
  const incomeLabel = `$${profile.annualIncome.toLocaleString()}/yr`;
  const filingLabel = FILING_LABELS[profile.filingStatus] ?? profile.filingStatus;
  const membersList = profile.members
    .map((m) => `${m.name}(${m.age})`)
    .join("  ");
  const benefitsList = profile.currentBenefits
    .map(
      (b) =>
        `${b.program}${b.monthlyValue ? ` $${b.monthlyValue}/mo` : ""}`
    )
    .join(" \u00B7 ");

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      className={cn(
        "border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono text-sm rounded-none",
        className
      )}
    >
      {/* Header line */}
      <div className="border-b border-[#3d2a7a]/50 px-4 py-1.5 flex items-center justify-between">
        <span className="text-[#4ade80] font-bold text-xs uppercase tracking-wider">
          Your Household
        </span>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-[#22d3ee] text-xs hover:text-[#22d3ee]/80 transition-colors"
            >
              [edit]
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-[#9d8ec2] text-xs hover:text-[#f472b6] transition-colors"
          >
            [x]
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-2 space-y-0.5">
        {/* Summary line */}
        <div className="text-white/90">
          <span className="text-[#4ade80] font-bold">
            {profile.householdSize || profile.members.length}
          </span>{" "}
          people{" "}
          <span className="text-[#3d2a7a]">{"\u00B7"}</span>{" "}
          {stateLabel}{" "}
          <span className="text-[#3d2a7a]">{"\u00B7"}</span>{" "}
          {incomeLabel}{" "}
          <span className="text-[#3d2a7a]">{"\u00B7"}</span>{" "}
          Filing: {filingLabel}
        </div>

        {/* Members line */}
        {membersList && (
          <div className="text-[#c4b5fd]/70 text-xs">{membersList}</div>
        )}

        {/* Benefits line */}
        {benefitsList && (
          <div className="text-[#c4b5fd]/70 text-xs">
            Currently: {benefitsList}
          </div>
        )}

        {/* Flags */}
        {(profile.isVeteranHousehold || profile.hasDisabledMember) && (
          <div className="text-[#9d8ec2] text-xs flex gap-3">
            {profile.isVeteranHousehold && (
              <span>{"\u2605"} Veteran</span>
            )}
            {profile.hasDisabledMember && (
              <span>{"\u2605"} Disability</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileBannerCompact — even smaller version for tight spaces.
//
// 4 people · CA · $42k/yr · MFJ  [edit]
// ---------------------------------------------------------------------------

export function ProfileBannerCompact({
  onEdit,
  className,
}: {
  onEdit?: () => void;
  className?: string;
}) {
  const [profile, setProfile] = useState<HouseholdProfile | null>(null);

  useEffect(() => {
    const p = getHouseholdProfile();
    if (p && p.setupComplete) {
      setProfile(p);
    }
  }, []);

  if (!profile) return null;

  const size = profile.householdSize || profile.members.length;
  const incomeK = Math.round(profile.annualIncome / 1000);
  const filingLabel =
    FILING_LABELS[profile.filingStatus] ?? profile.filingStatus;

  return (
    <div
      className={cn(
        "font-mono text-xs text-[#9d8ec2] flex items-center gap-2 flex-wrap",
        className
      )}
    >
      <span>
        <span className="text-[#4ade80]">{size}</span> people
      </span>
      <span className="text-[#3d2a7a]">{"\u00B7"}</span>
      <span>{profile.state}</span>
      <span className="text-[#3d2a7a]">{"\u00B7"}</span>
      <span>${incomeK}k/yr</span>
      <span className="text-[#3d2a7a]">{"\u00B7"}</span>
      <span>{filingLabel}</span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-[#22d3ee] hover:text-[#22d3ee]/80 transition-colors ml-1"
        >
          [edit]
        </button>
      )}
    </div>
  );
}
