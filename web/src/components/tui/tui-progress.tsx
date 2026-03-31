import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI Progress — block character progress bar.
//
// ████████░░░░░░░░ 52% — SNAP application
//
// Uses actual Unicode block characters, because CSS width tricks are the
// kind of lie we tell ourselves before we know better.
// ---------------------------------------------------------------------------

type TuiProgressColor = "green" | "pink" | "cyan" | "purple" | "yellow";

interface TuiProgressProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Optional label shown after the percentage */
  label?: string;
  /** Bar color */
  color?: TuiProgressColor;
  /** Total number of block characters — 20 is the platonic ideal */
  width?: number;
  /** Show percentage? */
  showPercent?: boolean;
  className?: string;
}

const colorMap: Record<TuiProgressColor, { filled: string; empty: string }> = {
  green: { filled: "text-[#4ade80]", empty: "text-[#3d2a7a]" },
  pink: { filled: "text-[#f472b6]", empty: "text-[#3d2a7a]" },
  cyan: { filled: "text-[#22d3ee]", empty: "text-[#3d2a7a]" },
  purple: { filled: "text-[#8b5cf6]", empty: "text-[#3d2a7a]" },
  yellow: { filled: "text-[#facc15]", empty: "text-[#3d2a7a]" },
};

export function TuiProgress({
  value,
  max,
  label,
  color = "green",
  width = 20,
  showPercent = true,
  className,
}: TuiProgressProps) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const percent = Math.round(ratio * 100);
  const colors = colorMap[color];

  return (
    <div className={cn("font-mono text-sm flex items-center gap-0", className)}>
      <span className={colors.filled} aria-hidden="true">
        {"\u2588".repeat(filled)}
      </span>
      <span className={colors.empty} aria-hidden="true">
        {"\u2591".repeat(empty)}
      </span>
      {showPercent && (
        <span className="text-[#9d8ec2] ml-2 tabular-nums">{percent}%</span>
      )}
      {label && (
        <span className="text-[#9d8ec2] ml-2 truncate">&mdash; {label}</span>
      )}
      {/* Screen reader gets the real number */}
      <span className="sr-only">
        {percent}% {label ?? ""}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TuiProgressSteps — step indicator for wizards
//
// ████░░░░░░░░░░░░░░░░ Step 1 of 5
// ---------------------------------------------------------------------------

interface TuiProgressStepsProps {
  current: number;
  total: number;
  color?: TuiProgressColor;
  className?: string;
}

export function TuiProgressSteps({
  current,
  total,
  color = "green",
  className,
}: TuiProgressStepsProps) {
  return (
    <TuiProgress
      value={current}
      max={total}
      label={`Step ${current} of ${total}`}
      color={color}
      className={className}
    />
  );
}
