"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProfile,
  listDrafts,
  getActivity,
  getUpcomingDeadlines,
  type DraftData,
  type ActivityEntry,
  type Deadline,
  type ProfileData,
} from "@/lib/local-storage";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({});
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  useEffect(() => {
    setProfile(getProfile());
    setDrafts(listDrafts());
    setActivity(getActivity());
    setDeadlines(getUpcomingDeadlines());
    setMounted(true);
  }, []);

  const greeting = getGreeting();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6c3aed] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* ----- Header ----- */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-10">
          <h1 className="text-3xl font-bold text-white">{greeting}</h1>
          {(profile.householdSize || profile.state) && (
            <div className="flex items-center gap-3 text-sm text-[#6b6b8a]">
              {profile.householdSize && (
                <span>
                  Household:{" "}
                  <span className="text-[#c4c4d4] font-medium">
                    {profile.householdSize}{" "}
                    {profile.householdSize === 1 ? "person" : "people"}
                  </span>
                </span>
              )}
              {profile.state && (
                <>
                  <span className="text-white/10">|</span>
                  <span className="text-[#c4c4d4] font-medium uppercase">
                    {profile.state}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ----- Active Workflows ----- */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Your Active Workflows
            </h2>
            <Link
              href="/workflows"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#252538] px-3.5 py-2 text-sm font-medium text-[#c4c4d4] hover:border-[#6c3aed]/40 hover:text-white transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
              New workflow
            </Link>
          </div>

          {drafts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <WorkflowCard key={draft.workflowId} draft={draft} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#252538]/50 p-10 text-center">
              <p className="text-[#6b6b8a]">
                No workflows in progress.
              </p>
              <p className="mt-1 text-sm text-[#6b6b8a]">
                Start one from the{" "}
                <Link
                  href="/workflows"
                  className="text-[#6c3aed] hover:underline"
                >
                  workflows page
                </Link>{" "}
                or use a quick action below.
              </p>
            </div>
          )}
        </section>

        {/* ----- Middle row: Deadlines + Activity ----- */}
        <div className="grid gap-6 lg:grid-cols-2 mb-10">
          {/* Deadlines */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Upcoming Deadlines
            </h2>
            <div className="rounded-xl border border-white/10 bg-[#252538] divide-y divide-white/5">
              {deadlines.length > 0 ? (
                deadlines.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${
                        d.urgency === "critical"
                          ? "bg-red-500/10 text-red-400"
                          : d.urgency === "warning"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-[#6c3aed]/10 text-[#6c3aed]"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 7a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-7Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {d.label}
                      </p>
                      <p className="text-xs text-[#6b6b8a]">{d.date}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                        d.urgency === "critical"
                          ? "bg-red-500/10 text-red-400"
                          : d.urgency === "warning"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-white/5 text-[#6b6b8a]"
                      }`}
                    >
                      {d.daysRemaining === 0
                        ? "Today"
                        : d.daysRemaining === 1
                          ? "Tomorrow"
                          : `${d.daysRemaining} days`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-[#6b6b8a]">
                  No upcoming deadlines
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Recent Activity
            </h2>
            <div className="rounded-xl border border-white/10 bg-[#252538] divide-y divide-white/5">
              {activity.length > 0 ? (
                activity.slice(0, 8).map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <ActivityIcon type={entry.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#c4c4d4] truncate">
                        {entry.label}
                      </p>
                    </div>
                    <span className="text-xs text-[#6b6b8a] flex-shrink-0 tabular-nums">
                      {formatRelativeDate(entry.date)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-[#6b6b8a]">
                  No recent activity.
                  <br />
                  Use a tool to get started.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ----- Quick Actions ----- */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#252538] px-5 py-4 transition-all hover:border-[#6c3aed]/40 hover:shadow-[0_4px_16px_-4px_rgba(108,58,237,0.15)] hover:-translate-y-0.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6c3aed]/10 text-[#6c3aed] group-hover:bg-[#6c3aed]/20 transition-colors">
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-[#c4c4d4] group-hover:text-white transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow card
// ---------------------------------------------------------------------------

function WorkflowCard({ draft }: { draft: DraftData }) {
  const progress =
    draft.totalSections > 0
      ? Math.round((draft.currentSection / draft.totalSections) * 100)
      : 0;

  const flaggedCount = Object.keys(draft.answers).length;

  return (
    <div className="group rounded-xl border border-white/10 bg-[#252538] p-5 transition-all hover:border-[#6c3aed]/30 hover:shadow-[0_4px_24px_-8px_rgba(108,58,237,0.15)]">
      <h3 className="text-base font-semibold text-white truncate">
        {draft.title || draft.workflowId}
      </h3>

      {/* Progress bar */}
      <div className="mt-3 mb-2">
        <div className="h-2 w-full rounded-full bg-[#1a1a2e] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6c3aed] to-[#d946ef] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-[#6b6b8a] tabular-nums">{progress}%</span>
          <span className="text-[#6b6b8a]">
            Section {draft.currentSection} of {draft.totalSections}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-[#6b6b8a]">
          {flaggedCount > 0
            ? `${flaggedCount} fields answered`
            : "No answers yet"}
        </span>
        <Link
          href={`/workflows/${draft.workflowId}`}
          className="flex items-center gap-1 text-xs font-medium text-[#6c3aed] hover:text-[#8b5cf6] transition-colors"
        >
          Continue
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              fillRule="evenodd"
              d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>

      {/* Last saved */}
      <p className="mt-2 text-[10px] text-[#6b6b8a]">
        Last saved {formatRelativeDate(draft.lastSaved)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity icon
// ---------------------------------------------------------------------------

function ActivityIcon({
  type,
}: {
  type: ActivityEntry["type"];
}) {
  const colors: Record<string, string> = {
    screener: "bg-cyan-500/10 text-cyan-400",
    cliff: "bg-amber-500/10 text-amber-400",
    workflow: "bg-[#6c3aed]/10 text-[#6c3aed]",
    "life-event": "bg-green-500/10 text-green-400",
    "student-loans": "bg-red-500/10 text-red-400",
  };

  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded-md ${
        colors[type] ?? colors.workflow
      }`}
    >
      <div className="h-2 w-2 rounded-full bg-current" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const quickActions = [
  {
    label: "Check benefits eligibility",
    href: "/screen",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path
          fillRule="evenodd"
          d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    label: "Calculate benefit cliff",
    href: "/cliff",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M13.791 2.086a.75.75 0 0 1 .123 1.054l-3.25 4.011a.75.75 0 0 1-1.075.118L7.205 5.33 3.79 9.456a.75.75 0 1 1-1.18-.928l3.75-4.531a.75.75 0 0 1 1.08-.107l2.4 1.946 2.898-3.578a.75.75 0 0 1 1.054-.172Z" />
        <path d="M2 14a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 14Z" />
      </svg>
    ),
  },
  {
    label: "File taxes",
    href: "/workflows/tax/1040",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2Zm2 1.5a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5ZM5 6a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5Zm0 2.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5Z" />
      </svg>
    ),
  },
  {
    label: "Student loan tools",
    href: "/student-loans",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M7.702 1.368a.75.75 0 0 1 .597 0l7.5 3.25a.75.75 0 0 1 0 1.37L8.299 9.24a.75.75 0 0 1-.597 0l-7.5-3.25a.75.75 0 0 1 0-1.37l7.5-3.25Z" />
        <path d="M2 8.5c0-.37.267-.688.634-.753L8 6.628l5.366 1.12A.772.772 0 0 1 14 8.5v3.75a.75.75 0 0 1-1.5 0V9.097l-4.201.878a.75.75 0 0 1-.598 0L2.434 8.174A.772.772 0 0 1 2 8.5Z" />
        <path d="M14.75 12.75a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1 0-1.5h1a.75.75 0 0 1 .75.75Z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
