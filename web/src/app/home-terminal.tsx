"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getProfile,
  listDrafts,
  getUpcomingDeadlines,
  type ProfileData,
  type DraftData,
  type Deadline,
} from "@/lib/local-storage";
import { LIFE_EVENT_CARDS } from "@/lib/life-events";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuickItem {
  label: string;
  href: string;
  category: "urgent" | "life" | "tool";
}

// ---------------------------------------------------------------------------
// Data — grouped items for the terminal menu
// ---------------------------------------------------------------------------

const URGENT_ITEMS: QuickItem[] = LIFE_EVENT_CARDS.filter((e) => e.urgent).map(
  (e) => ({
    label: e.label,
    href: `/life-event/${e.id}`,
    category: "urgent" as const,
  })
);

const LIFE_ITEMS: QuickItem[] = LIFE_EVENT_CARDS.filter((e) => !e.urgent).map(
  (e) => ({
    label: e.label,
    href: `/life-event/${e.id}`,
    category: "life" as const,
  })
);

const TOOL_ITEMS: QuickItem[] = [
  { label: "File my taxes", href: "/workflows/tax/1040", category: "tool" },
  { label: "Check benefits", href: "/screen", category: "tool" },
  { label: "Student loan help", href: "/student-loans", category: "tool" },
  { label: "Benefits cliff calc", href: "/cliff", category: "tool" },
];

const ALL_ITEMS: QuickItem[] = [...URGENT_ITEMS, ...LIFE_ITEMS, ...TOOL_ITEMS];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const STATS = {
  workflows: LIFE_EVENT_CARDS.length + TOOL_ITEMS.length,
  lifeEvents: LIFE_EVENT_CARDS.length,
  domains: 13,
  cloud: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function progressBar(pct: number, width: number = 20): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

function daysUntilStr(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

// ---------------------------------------------------------------------------
// Component: Terminal panel primitives
// ---------------------------------------------------------------------------

function BoxTop({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-center border-t-2 border-x-2 border-border rounded-t-lg px-4 py-2 bg-surface/50">
      <span className="text-pigeon-green glow-green font-bold text-sm">
        {left}
      </span>
      {right && (
        <span className="ml-auto text-pigeon-purple text-sm">{right}</span>
      )}
    </div>
  );
}

function BoxSection({ label, right }: { label: string; right?: string }) {
  return (
    <div className="flex items-center border-t-2 border-x-2 border-border px-4 py-1.5 bg-surface/30">
      <span className="text-muted text-xs uppercase tracking-wider">
        {label}
      </span>
      {right && (
        <span className="ml-auto text-pigeon-cyan text-xs">{right}</span>
      )}
    </div>
  );
}

function BoxBottom({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border-2 border-t-2 border-border rounded-b-lg px-4 py-2 bg-surface/20 text-xs text-muted">
      {children}
    </div>
  );
}

function BoxBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-x-2 border-border px-4 py-3 bg-background/80">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Menu item
// ---------------------------------------------------------------------------

function MenuItem({
  item,
  isSelected,
  onSelect,
  onHover,
}: {
  item: QuickItem;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`
        text-left px-2 py-0.5 rounded transition-colors text-sm w-full
        ${
          isSelected
            ? "bg-pigeon-green/15 text-pigeon-green"
            : "text-foreground/80 hover:text-pigeon-green/80 hover:bg-pigeon-green/5"
        }
      `}
    >
      <span className={isSelected ? "text-pigeon-green" : "text-muted"}>
        {">"}{" "}
      </span>
      {item.label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component: Benefit row (for profile-aware view)
// ---------------------------------------------------------------------------

function BenefitRow({
  name,
  amount,
  pct,
  status,
}: {
  name: string;
  amount: string;
  pct: number;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm py-0.5">
      <span className="w-20 text-foreground/70">{name}</span>
      <span className="w-20 text-pigeon-green tabular-nums">{amount}</span>
      <span className="text-pigeon-cyan font-mono text-xs flex-1 hidden sm:inline">
        {progressBar(pct)}
      </span>
      <span className="text-muted text-xs">{status}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: Draft progress row
// ---------------------------------------------------------------------------

function DraftRow({ draft }: { draft: DraftData }) {
  const pct =
    draft.totalSections > 0
      ? Math.round((draft.currentSection / draft.totalSections) * 100)
      : 0;
  return (
    <div className="flex items-center gap-3 text-sm py-0.5">
      <span className="flex-1 text-foreground/80 truncate">
        {draft.title || draft.workflowId}
      </span>
      <span className="text-pigeon-cyan font-mono text-xs hidden sm:inline">
        {progressBar(pct, 12)}
      </span>
      <span className="text-muted text-xs tabular-nums w-10 text-right">
        {pct}%
      </span>
      <span className="text-muted text-xs hidden sm:inline">
        section {draft.currentSection}/{draft.totalSections}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: Renders grouped menu items with category headers
// ---------------------------------------------------------------------------

function GroupedMenuItems({
  urgentFiltered,
  lifeFiltered,
  toolFiltered,
  selectedIndex,
  onSelect,
  onHover,
}: {
  urgentFiltered: QuickItem[];
  lifeFiltered: QuickItem[];
  toolFiltered: QuickItem[];
  selectedIndex: number;
  onSelect: (href: string) => void;
  onHover: (idx: number) => void;
}) {
  // Offsets: urgent starts at 0, life at urgentFiltered.length, tool at urgent+life
  const lifeOffset = urgentFiltered.length;
  const toolOffset = lifeOffset + lifeFiltered.length;

  return (
    <>
      {urgentFiltered.length > 0 && (
        <div className="mb-3">
          <div className="text-urgent text-xs font-bold mb-1 uppercase tracking-wider">
            {"\u26A1"} Urgent
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {urgentFiltered.map((item, i) => (
              <MenuItem
                key={item.href}
                item={item}
                isSelected={selectedIndex === i}
                onSelect={() => onSelect(item.href)}
                onHover={() => onHover(i)}
              />
            ))}
          </div>
        </div>
      )}

      {lifeFiltered.length > 0 && (
        <div className="mb-3">
          <div className="text-pigeon-purple text-xs font-bold mb-1 uppercase tracking-wider">
            {"\uD83D\uDCCB"} Life Changes
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {lifeFiltered.map((item, i) => (
              <MenuItem
                key={item.href}
                item={item}
                isSelected={selectedIndex === lifeOffset + i}
                onSelect={() => onSelect(item.href)}
                onHover={() => onHover(lifeOffset + i)}
              />
            ))}
          </div>
        </div>
      )}

      {toolFiltered.length > 0 && (
        <div>
          <div className="text-pigeon-cyan text-xs font-bold mb-1 uppercase tracking-wider">
            {"\uD83D\uDD27"} Tools
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {toolFiltered.map((item, i) => (
              <MenuItem
                key={item.href}
                item={item}
                isSelected={selectedIndex === toolOffset + i}
                onSelect={() => onSelect(item.href)}
                onHover={() => onHover(toolOffset + i)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main: HomeTerminal
// ---------------------------------------------------------------------------

export default function HomeTerminal() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [profile, setProfile] = useState<ProfileData>({});
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  const hasProfile = !!(
    profile.householdSize ||
    profile.state ||
    profile.income
  );

  // Load localStorage data
  useEffect(() => {
    setProfile(getProfile());
    setDrafts(listDrafts());
    setDeadlines(getUpcomingDeadlines());
    setMounted(true);
  }, []);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return ALL_ITEMS;
    const q = query.toLowerCase();
    return ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  // Grouped filtered items
  const urgentFiltered = useMemo(
    () => filteredItems.filter((i) => i.category === "urgent"),
    [filteredItems]
  );
  const lifeFiltered = useMemo(
    () => filteredItems.filter((i) => i.category === "life"),
    [filteredItems]
  );
  const toolFiltered = useMemo(
    () => filteredItems.filter((i) => i.category === "tool"),
    [filteredItems]
  );

  // Flat list for keyboard nav (same order: urgent, life, tool)
  const flatFiltered = useMemo(
    () => [...urgentFiltered, ...lifeFiltered, ...toolFiltered],
    [urgentFiltered, lifeFiltered, toolFiltered]
  );

  // Clamp selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Navigate to selected item
  const navigateToSelected = useCallback(() => {
    if (flatFiltered.length > 0 && selectedIndex < flatFiltered.length) {
      router.push(flatFiltered[selectedIndex].href);
    }
  }, [flatFiltered, selectedIndex, router]);

  const handleSelect = useCallback(
    (href: string) => router.push(href),
    [router]
  );

  const handleHover = useCallback(
    (idx: number) => setSelectedIndex(idx),
    []
  );

  // Global keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInputFocused = document.activeElement === inputRef.current;

      // "/" focuses search (when not already in input)
      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // "n" for new workflow (profile view, when not in input)
      if (e.key === "n" && !isInputFocused && hasProfile) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Arrow keys navigate the list
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatFiltered.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatFiltered.length - 1
        );
        return;
      }

      // Enter selects the current item
      if (e.key === "Enter") {
        e.preventDefault();
        navigateToSelected();
        return;
      }

      // Escape clears search and blurs
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery("");
        inputRef.current?.blur();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flatFiltered, navigateToSelected, hasProfile]);

  // ── SSR guard ─────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="border-2 border-border rounded-lg bg-surface/20 p-8 text-center">
          <span className="text-pigeon-green glow-green">loading</span>
          <span className="cursor-blink text-pigeon-green">_</span>
        </div>
      </div>
    );
  }

  // ── Profile-aware view ──────────────────────────────────────────────
  if (hasProfile) {
    const profileName = profile.state
      ? `${profile.state.toUpperCase()} household`
      : "your household";

    const urgentDeadlines = deadlines.filter((d) => d.daysRemaining <= 30);

    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <BoxTop left="pigeongov" right={profileName} />

        {/* Urgent alerts */}
        {urgentDeadlines.length > 0 && (
          <BoxBody>
            <div className="text-urgent text-sm font-bold mb-1">
              {"\u26A1"} {urgentDeadlines.length} item
              {urgentDeadlines.length !== 1 ? "s" : ""} need attention
            </div>
            {urgentDeadlines.map((d, i) => (
              <div key={i} className="text-sm text-foreground/80 pl-2">
                <span className="text-muted">
                  {i === urgentDeadlines.length - 1
                    ? "\u2514\u2500"
                    : "\u251C\u2500"}
                </span>{" "}
                {d.label} due {daysUntilStr(d.daysRemaining)}
              </div>
            ))}
          </BoxBody>
        )}

        {/* Search */}
        <BoxBody>
          <div className="flex items-center gap-2">
            <span className="text-pigeon-green">{">"}</span>
            <span className="text-muted text-sm shrink-0">
              What do you need?
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-foreground text-sm caret-pigeon-green min-w-0"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="cursor-blink text-pigeon-green">{"\u2588"}</span>
          </div>
        </BoxBody>

        {/* Benefits summary */}
        {profile.income && (
          <>
            <BoxSection
              label="Your Benefits"
              right={`~$${Math.round((profile.income || 0) * 0.15).toLocaleString()}/mo est.`}
            />
            <BoxBody>
              <BenefitRow
                name="SNAP"
                amount="$635/mo"
                pct={80}
                status="renews Jul"
              />
              <BenefitRow
                name="Medicaid"
                amount="$1,200"
                pct={100}
                status="active"
              />
              {profile.hasChildren && (
                <BenefitRow
                  name="WIC"
                  amount="$150/mo"
                  pct={30}
                  status="ages out 2y"
                />
              )}
              <div className="mt-2 text-xs text-pigeon-cyan">
                {"\uD83D\uDCA1"} You may also qualify for Section 8 (~$800/mo)
              </div>
            </BoxBody>
          </>
        )}

        {/* In-progress drafts */}
        {drafts.length > 0 && (
          <>
            <BoxSection label="In Progress" />
            <BoxBody>
              {drafts.slice(0, 5).map((draft) => (
                <DraftRow key={draft.workflowId} draft={draft} />
              ))}
            </BoxBody>
          </>
        )}

        {/* Quick actions */}
        {flatFiltered.length > 0 && (
          <>
            <BoxSection label="Quick Actions" />
            <BoxBody>
              <GroupedMenuItems
                urgentFiltered={urgentFiltered}
                lifeFiltered={lifeFiltered}
                toolFiltered={toolFiltered}
                selectedIndex={selectedIndex}
                onSelect={handleSelect}
                onHover={handleHover}
              />
            </BoxBody>
          </>
        )}

        {/* No results */}
        {flatFiltered.length === 0 && query.trim() && (
          <BoxBody>
            <div className="text-muted text-sm py-1">
              No matches for &ldquo;{query}&rdquo;. Try &ldquo;taxes&rdquo;,
              &ldquo;baby&rdquo;, or &ldquo;insurance&rdquo;.
            </div>
          </BoxBody>
        )}

        {/* Footer */}
        <BoxBottom>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="tabular-nums">
              {STATS.workflows} workflows · {STATS.lifeEvents} life events ·{" "}
              {STATS.domains} domains · {STATS.cloud} cloud
            </span>
            <span>
              <Kbd>tab</Kbd> navigate · <Kbd>enter</Kbd> continue ·{" "}
              <Kbd>n</Kbd> new workflow · <Kbd>?</Kbd> help
            </span>
          </div>
        </BoxBottom>
      </div>
    );
  }

  // ── Default (no profile) view ───────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <BoxTop left="pigeongov" />

      {/* Tagline + search */}
      <BoxBody>
        <p className="text-muted text-sm mb-4">
          Government paperwork, without the paperwork.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-pigeon-green">{">"}</span>
          <span className="text-muted text-sm shrink-0">
            What&apos;s going on?
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-foreground text-sm caret-pigeon-green min-w-0"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="cursor-blink text-pigeon-green">{"\u2588"}</span>
        </div>
        <p className="text-muted/60 text-xs mt-1 pl-4">
          (type freely, or pick from below)
        </p>
      </BoxBody>

      {/* Quick Actions */}
      <BoxSection label="Quick Actions" />
      <BoxBody>
        <GroupedMenuItems
          urgentFiltered={urgentFiltered}
          lifeFiltered={lifeFiltered}
          toolFiltered={toolFiltered}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          onHover={handleHover}
        />

        {/* No results */}
        {flatFiltered.length === 0 && query.trim() && (
          <div className="text-muted text-sm py-2">
            No matches for &ldquo;{query}&rdquo;. Try &ldquo;taxes&rdquo;,
            &ldquo;baby&rdquo;, or &ldquo;insurance&rdquo;.
          </div>
        )}
      </BoxBody>

      {/* Footer */}
      <BoxBottom>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="tabular-nums">
            {STATS.workflows} workflows · {STATS.lifeEvents} life events ·{" "}
            {STATS.domains} domains · {STATS.cloud} cloud
          </span>
          <span>
            <Kbd>tab</Kbd> navigate · <Kbd>enter</Kbd> select · <Kbd>/</Kbd>{" "}
            search
          </span>
        </div>
      </BoxBottom>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny kbd badge
// ---------------------------------------------------------------------------

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1 py-0.5 rounded bg-surface text-pigeon-green text-[10px]">
      {children}
    </kbd>
  );
}
