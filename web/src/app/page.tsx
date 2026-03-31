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
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          What&rsquo;s going on in your life?
        </h1>
        <p className="mt-3 text-muted text-lg max-w-2xl mx-auto">
          Pick whatever applies. We&rsquo;ll build you a prioritised action plan
          with deadlines, forms, and eligibility checks — no account needed.
        </p>
      </div>

      {/* Life event grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {LIFE_EVENT_CARDS.map((event) => {
          const Icon = getIcon(event.icon);
          return (
            <Link
              key={event.id}
              href={`/life-event/${event.id}`}
              className={cn(
                "group relative flex flex-col gap-3 rounded-xl border p-5 transition-all duration-150",
                "hover:border-pigeon-purple/60 hover:bg-surface-hover hover:shadow-lg hover:shadow-pigeon-purple/5",
                "focus-visible:ring-2 focus-visible:ring-pigeon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                event.urgent
                  ? "border-urgent/30 bg-urgent/5"
                  : "border-border bg-surface"
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
                    : "bg-pigeon-purple/10 text-pigeon-purple"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-foreground group-hover:text-pigeon-purple transition-colors">
                  {event.label}
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  {event.description}
                </p>
              </div>

              <ArrowRight className="mt-auto h-4 w-4 text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>

      {/* Alternate entry points */}
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <span className="text-muted text-sm">Or jump straight to:</span>

        <Link
          href="/workflows/tax/1040"
          className="inline-flex items-center gap-2 rounded-lg border border-pigeon-purple/40 bg-pigeon-purple/10 px-6 py-3 font-medium text-pigeon-purple hover:bg-pigeon-purple/20 transition-colors"
        >
          <Receipt className="h-4 w-4" />
          File my taxes
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/screen"
          className="inline-flex items-center gap-2 rounded-lg border border-pigeon-cyan/40 bg-pigeon-cyan/10 px-6 py-3 font-medium text-pigeon-cyan hover:bg-pigeon-cyan/20 transition-colors"
        >
          <BadgeDollarSign className="h-4 w-4" />
          Check benefits eligibility
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
