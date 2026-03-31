import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI Status — monospace status badges for every occasion.
//
// ● ACTIVE  ○ PENDING  ✓ COMPLETE  ✗ ERROR  ⚡ URGENT
//
// Small, monospace, color-coded. The kind of thing that makes a terminal
// feel like it has opinions about your life choices.
// ---------------------------------------------------------------------------

export type TuiStatusVariant =
  | "active"
  | "pending"
  | "complete"
  | "error"
  | "urgent"
  | "info"
  | "warn"
  | "muted";

interface TuiStatusProps {
  variant: TuiStatusVariant;
  /** Override the default label */
  label?: string;
  /** Larger size */
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  TuiStatusVariant,
  { symbol: string; color: string; defaultLabel: string }
> = {
  active: {
    symbol: "\u25CF", // ●
    color: "text-[#4ade80]",
    defaultLabel: "ACTIVE",
  },
  pending: {
    symbol: "\u25CB", // ○
    color: "text-[#facc15]",
    defaultLabel: "PENDING",
  },
  complete: {
    symbol: "\u2713", // ✓
    color: "text-[#4ade80]",
    defaultLabel: "COMPLETE",
  },
  error: {
    symbol: "\u2717", // ✗
    color: "text-[#f472b6]",
    defaultLabel: "ERROR",
  },
  urgent: {
    symbol: "\u26A1", // ⚡
    color: "text-[#ef4444]",
    defaultLabel: "URGENT",
  },
  info: {
    symbol: "\u25CF", // ●
    color: "text-[#22d3ee]",
    defaultLabel: "INFO",
  },
  warn: {
    symbol: "\u25CF", // ●
    color: "text-[#facc15]",
    defaultLabel: "WARN",
  },
  muted: {
    symbol: "\u25CB", // ○
    color: "text-[#9d8ec2]",
    defaultLabel: "INACTIVE",
  },
};

export function TuiStatus({
  variant,
  label,
  size = "sm",
  className,
}: TuiStatusProps) {
  const config = statusConfig[variant];
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider whitespace-nowrap",
        config.color,
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
    >
      <span aria-hidden="true">{config.symbol}</span>
      <span>{displayLabel}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// TuiStatusDot — just the dot, no label. For inline use.
// ---------------------------------------------------------------------------

export function TuiStatusDot({
  variant,
  className,
}: {
  variant: TuiStatusVariant;
  className?: string;
}) {
  const config = statusConfig[variant];
  return (
    <span className={cn(config.color, className)} aria-hidden="true">
      {config.symbol}
    </span>
  );
}
