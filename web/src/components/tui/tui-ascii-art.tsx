import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI ASCII Art — the pigeon, rendered in the ancient tradition of
// expressing complex emotions through monospaced character placement.
// ---------------------------------------------------------------------------

interface TuiAsciiArtProps {
  variant?: "pigeon" | "pigeon-small" | "pigeon-welcome" | "divider";
  color?: "green" | "pink" | "purple" | "cyan" | "muted";
  className?: string;
}

const colorClass = {
  green: "text-[#4ade80]",
  pink: "text-[#f472b6]",
  purple: "text-[#8b5cf6]",
  cyan: "text-[#22d3ee]",
  muted: "text-[#3d2a7a]",
};

const ART = {
  pigeon: `   ___
  (o o)
  ( V )
 /|   |\\
/ |   | \\`,

  "pigeon-small": `  (o o)
  ( V )`,

  "pigeon-welcome": `   ___
  (o o)  Welcome to PigeonGov.
  ( V )  Let's sort out your paperwork.
 /|   |\\
/ |   | \\`,

  divider: `─────────────────────────────────────────`,
};

export function TuiAsciiArt({
  variant = "pigeon",
  color = "green",
  className,
}: TuiAsciiArtProps) {
  return (
    <pre
      className={cn(
        "font-mono text-sm leading-tight select-none whitespace-pre",
        colorClass[color],
        className
      )}
      aria-hidden="true"
    >
      {ART[variant]}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// TuiDivider — a simple ASCII horizontal rule.
//
// ────────────────────────────────────
// ---------------------------------------------------------------------------

export function TuiDivider({
  char = "\u2500",
  length = 40,
  label,
  className,
}: {
  char?: string;
  length?: number;
  label?: string;
  className?: string;
}) {
  if (label) {
    const sideLength = Math.max(2, Math.floor((length - label.length - 2) / 2));
    return (
      <div className={cn("font-mono text-sm text-[#3d2a7a]", className)} aria-hidden="true">
        {char.repeat(sideLength)} <span className="text-[#9d8ec2]">{label}</span>{" "}
        {char.repeat(sideLength)}
      </div>
    );
  }

  return (
    <div className={cn("font-mono text-sm text-[#3d2a7a]", className)} aria-hidden="true">
      {char.repeat(length)}
    </div>
  );
}
