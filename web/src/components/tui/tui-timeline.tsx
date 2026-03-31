import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI Timeline — vertical timeline with phase markers.
//
// │
// ├── Phase 1: This Week ─────────────────
// │   ⚡ File unemployment claim  [7 days]
// │   ⚡ Health insurance         [60 days]
// │
// ├── Phase 2: This Month ────────────────
// │   ○ Check SNAP eligibility
// │   ○ Check Medicaid
// │
// └── Phase 3: When Ready ────────────────
//     ○ Adjust tax withholding
//
// The visual language of "things happening in sequence," expressed
// entirely in box-drawing characters and wishful thinking.
// ---------------------------------------------------------------------------

export type TuiTimelineItemStatus = "urgent" | "active" | "pending" | "complete" | "error";

export interface TuiTimelineItem {
  id: string;
  label: string;
  /** Right-side annotation (e.g., "[7 days]") */
  detail?: string;
  status: TuiTimelineItemStatus;
  /** Optional sub-label */
  description?: string;
}

export interface TuiTimelinePhase {
  id: string;
  label: string;
  items: TuiTimelineItem[];
}

interface TuiTimelineProps {
  phases: TuiTimelinePhase[];
  className?: string;
}

const statusConfig: Record<
  TuiTimelineItemStatus,
  { symbol: string; color: string }
> = {
  urgent: { symbol: "\u26A1", color: "text-[#ef4444]" },
  active: { symbol: "\u25CF", color: "text-[#4ade80]" },
  pending: { symbol: "\u25CB", color: "text-[#9d8ec2]" },
  complete: { symbol: "\u2713", color: "text-[#4ade80]" },
  error: { symbol: "\u2717", color: "text-[#f472b6]" },
};

export function TuiTimeline({ phases, className }: TuiTimelineProps) {
  return (
    <div className={cn("font-mono text-sm", className)}>
      {phases.map((phase, phaseIdx) => {
        const isLast = phaseIdx === phases.length - 1;
        // Box-drawing connector: ├── for middle phases, └── for last
        const phaseConnector = isLast ? "\u2514" : "\u251C";
        // Vertical line for items: │ for middle phases, space for last
        const itemPrefix = isLast ? " " : "\u2502";

        return (
          <div key={phase.id}>
            {/* Leading vertical line */}
            {phaseIdx === 0 && (
              <div className="text-[#3d2a7a]" aria-hidden="true">
                {"\u2502"}
              </div>
            )}

            {/* Phase header */}
            <div className="flex items-center gap-0">
              <span className="text-[#3d2a7a]" aria-hidden="true">
                {phaseConnector}{"\u2500\u2500"}{" "}
              </span>
              <span className="text-[#4ade80] font-bold">
                {phase.label}
              </span>
              <span className="text-[#3d2a7a] ml-1" aria-hidden="true">
                {" "}{"\u2500".repeat(Math.max(0, 36 - phase.label.length))}
              </span>
            </div>

            {/* Items */}
            {phase.items.map((item) => {
              const sc = statusConfig[item.status];
              return (
                <div key={item.id} className="flex items-start gap-0">
                  <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                    {itemPrefix}{"   "}
                  </span>
                  <span className={cn("shrink-0 mr-2", sc.color)} aria-hidden="true">
                    {sc.symbol}
                  </span>
                  <span
                    className={cn(
                      "flex-1",
                      item.status === "urgent" ? "text-[#ef4444]" : "text-white/90"
                    )}
                  >
                    {item.label}
                  </span>
                  {item.detail && (
                    <span className="text-[#9d8ec2] ml-2 shrink-0 tabular-nums text-xs">
                      {item.detail}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Blank line between phases */}
            {!isLast && (
              <div className="text-[#3d2a7a]" aria-hidden="true">
                {"\u2502"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
