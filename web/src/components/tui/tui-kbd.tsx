import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI Kbd — keyboard shortcut hints rendered as a terminal status bar.
//
// tab navigate · enter select · esc back
//
// The kind of footer that makes you feel like you're in control,
// even when you're filling out government paperwork at 2 AM.
// ---------------------------------------------------------------------------

export interface TuiShortcut {
  /** The key label (e.g., "tab", "enter", "esc", "j/k") */
  key: string;
  /** What the key does (e.g., "navigate", "select", "back") */
  action: string;
}

interface TuiKbdProps {
  shortcuts: TuiShortcut[];
  className?: string;
}

export function TuiKbd({ shortcuts, className }: TuiKbdProps) {
  return (
    <div
      className={cn(
        "border-t-2 border-[#3d2a7a] px-4 py-2 text-xs text-[#9d8ec2] flex flex-wrap gap-x-4 gap-y-1 font-mono",
        className
      )}
    >
      {shortcuts.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <kbd className="text-[#4ade80] font-bold">{s.key}</kbd>
          <span>{s.action}</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TuiKbdInline — a single inline keyboard hint, not in a bar.
//
// Press <kbd>enter</kbd> to continue
// ---------------------------------------------------------------------------

export function TuiKbdInline({
  keyLabel,
  className,
}: {
  keyLabel: string;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-block px-1.5 py-0.5 text-xs font-mono font-bold text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-sm",
        className
      )}
    >
      {keyLabel}
    </kbd>
  );
}
