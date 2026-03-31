import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI Panel — the core container for everything terminal-flavored.
//
// Think of it as a <div> that grew up watching ncurses apps and decided
// box-drawing characters were a personality trait.
// ---------------------------------------------------------------------------

export type TuiPanelStatus = "ok" | "warn" | "error" | "info";

interface TuiPanelProps {
  title?: string;
  subtitle?: string;
  status?: TuiPanelStatus;
  /** Optional footer content (e.g., TuiKbd shortcuts) */
  footer?: React.ReactNode;
  /** Remove inner padding — useful when children handle their own */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}

function StatusBadge({ status }: { status: TuiPanelStatus }) {
  const config: Record<TuiPanelStatus, { symbol: string; color: string; label: string }> = {
    ok: { symbol: "●", color: "text-[#4ade80]", label: "OK" },
    warn: { symbol: "●", color: "text-[#facc15]", label: "WARN" },
    error: { symbol: "●", color: "text-[#f472b6]", label: "ERR" },
    info: { symbol: "●", color: "text-[#22d3ee]", label: "INFO" },
  };

  const c = config[status];
  return (
    <span className={cn("text-xs font-mono flex items-center gap-1.5", c.color)}>
      <span>{c.symbol}</span>
      <span className="uppercase tracking-wider font-bold">{c.label}</span>
    </span>
  );
}

export function TuiPanel({
  title,
  subtitle,
  status,
  footer,
  flush = false,
  className,
  children,
}: TuiPanelProps) {
  return (
    <div
      className={cn(
        "border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono rounded-none",
        className
      )}
    >
      {/* Header bar */}
      {(title || status) && (
        <div className="border-b-2 border-[#3d2a7a] px-4 py-2 flex items-center justify-between gap-4 bg-[#1a1040]/50">
          <div className="flex items-center gap-3 min-w-0">
            {title && (
              <span className="text-[#4ade80] font-bold text-sm truncate">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="text-[#9d8ec2] text-xs truncate hidden sm:inline">
                {subtitle}
              </span>
            )}
          </div>
          {status && <StatusBadge status={status} />}
        </div>
      )}

      {/* Body */}
      <div className={flush ? "" : "p-4"}>{children}</div>

      {/* Footer */}
      {footer}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TuiPanelDivider — horizontal rule inside a panel
// ---------------------------------------------------------------------------
export function TuiPanelDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("border-t-2 border-[#3d2a7a] my-3", className)}
      role="separator"
    />
  );
}
