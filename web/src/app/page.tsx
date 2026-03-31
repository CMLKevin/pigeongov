import Link from "next/link";
import { ArrowRight, Receipt, BadgeDollarSign } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { LIFE_EVENT_CARDS } from "@/lib/life-events";
import { cn } from "@/lib/utils";

type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Dynamically resolve a Lucide icon by name.
 * Falls back to a generic circle if the name doesn't match.
 */
function getIcon(name: string): IconComponent {
  const icons = LucideIcons as unknown as Record<string, IconComponent | undefined>;
  return icons[name] ?? LucideIcons.CircleDot;
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Heading */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight gradient-text">
          What&rsquo;s going on in your life?
        </h1>
        <p className="mt-4 text-[#c4b5fd] text-lg max-w-2xl mx-auto leading-relaxed">
          Pick whatever applies. We&rsquo;ll build you a prioritised action plan
          with deadlines, forms, and eligibility checks — no account needed.
        </p>
      </div>

      {/* Diagonal hatching divider */}
      <div className="mb-8 h-2 w-full rounded-full hatch-green opacity-60" />

      {/* Life event grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {LIFE_EVENT_CARDS.map((event) => {
          const Icon = getIcon(event.icon);
          return (
            <Link
              key={event.id}
              href={`/life-event/${event.id}`}
              className={cn(
                "group relative flex flex-col gap-3 rounded-xl border-2 p-5 transition-all duration-200",
                "hover:border-pigeon-green/60 hover:bg-surface-hover hover:box-glow-green",
                "focus-visible:ring-2 focus-visible:ring-pigeon-green focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                event.urgent
                  ? "border-urgent/40 bg-urgent/5 urgent-pulse"
                  : "border-[#3d2a7a] bg-[#1a1040]"
              )}
            >
              {event.urgent && (
                <span className="absolute top-3 right-3 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-urgent" />
                </span>
              )}

              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  event.urgent
                    ? "bg-urgent/10 text-urgent"
                    : "bg-pigeon-green/10 text-pigeon-green"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-foreground group-hover:text-pigeon-green transition-colors">
                  {event.label}
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  {event.description}
                </p>
              </div>

              <ArrowRight className="mt-auto h-4 w-4 text-muted opacity-0 group-hover:opacity-100 group-hover:text-pigeon-green group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>

      {/* Diagonal hatching divider */}
      <div className="mt-10 mb-8 h-2 w-full rounded-full hatch-pattern opacity-60" />

      {/* Alternate entry points */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <span className="text-[#c4b5fd] text-sm font-mono">Or jump straight to:</span>

        <Link
          href="/workflows/tax/1040"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-pigeon-green/40 bg-gradient-to-r from-[#4ade80]/15 to-[#22d3ee]/15 px-6 py-3 font-medium text-pigeon-green hover:from-[#4ade80]/25 hover:to-[#22d3ee]/25 hover:border-pigeon-green/60 hover:box-glow-green transition-all"
        >
          <Receipt className="h-4 w-4" />
          File my taxes
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/screen"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-pigeon-purple/40 bg-gradient-to-r from-[#8b5cf6]/15 to-[#f472b6]/15 px-6 py-3 font-medium text-pigeon-pink hover:from-[#8b5cf6]/25 hover:to-[#f472b6]/25 hover:border-pigeon-pink/60 hover:box-glow-pink transition-all"
        >
          <BadgeDollarSign className="h-4 w-4" />
          Check benefits eligibility
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
