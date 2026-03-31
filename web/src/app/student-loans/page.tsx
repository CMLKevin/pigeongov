import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Loan Crisis Tools | PigeonGov",
  description:
    "The SAVE plan ended March 10, 2026. Tools for 7.5 million borrowers who need to transition before September 30, 2026.",
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const tools = [
  {
    title: "SAVE Transition Advisor",
    description: "Compare RAP, IBR, and Standard plans",
    detail:
      "Get a personalised analysis of every available repayment plan, urgent action items with deadlines, and PSLF eligibility assessment.",
    href: "/student-loans/transition",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
    ),
    urgent: true,
  },
  {
    title: "PSLF Tracker",
    description: "Track your progress toward Public Service Loan Forgiveness",
    detail:
      "See qualifying payments, employer risk assessment under 2026 rules, buyback opportunities for forbearance months, and time-to-forgiveness.",
    href: "/student-loans/pslf",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
    urgent: false,
  },
  {
    title: "Plan Comparison",
    description: "Side-by-side payment comparison",
    detail:
      "A large-format comparison table showing monthly payment, total cost, forgiveness amount, and time to payoff across all available plans.",
    href: "/student-loans/compare",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
        />
      </svg>
    ),
    urgent: false,
  },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudentLoansPage() {
  const daysUntilDeadline = Math.ceil(
    (new Date("2026-09-30").getTime() - new Date("2026-03-31").getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* ----- Hero banner ----- */}
      <section className="relative overflow-hidden border-b border-red-500/30">
        {/* Pulsing red glow behind the banner */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-red-950/10 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[600px] rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Crisis Response
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Student Loan Crisis Tools
          </h1>

          <p className="mt-4 text-lg text-red-300/90">
            The SAVE plan ended{" "}
            <span className="font-semibold text-red-400">March 10, 2026</span>.
          </p>
          <p className="mt-1 text-[#a0a0b8]">
            7.5 million borrowers need to transition before{" "}
            <span className="font-semibold text-amber-400">
              September 30, 2026
            </span>
            .
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-2.5 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-amber-400 flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-amber-300 font-medium tabular-nums">
              {daysUntilDeadline} days remaining
            </span>
            <span className="text-[#6b6b8a]">to select a new plan</span>
          </div>
        </div>
      </section>

      {/* ----- Tool cards ----- */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group relative flex flex-col rounded-xl border p-6 transition-all duration-200 hover:-translate-y-1 ${
                tool.urgent
                  ? "border-red-500/40 bg-[#252538] hover:border-red-500/60 hover:shadow-[0_8px_32px_-8px_rgba(239,68,68,0.2)]"
                  : "border-white/10 bg-[#252538] hover:border-[#6c3aed]/50 hover:shadow-[0_8px_32px_-8px_rgba(108,58,237,0.2)]"
              }`}
            >
              {tool.urgent && (
                <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  !
                </div>
              )}
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${
                  tool.urgent
                    ? "bg-red-500/10 text-red-400"
                    : "bg-[#6c3aed]/10 text-[#6c3aed]"
                }`}
              >
                {tool.icon}
              </div>
              <h2 className="text-lg font-semibold text-white">{tool.title}</h2>
              <p className="mt-1 text-sm text-[#a0a0b8]">{tool.description}</p>
              <p className="mt-3 text-xs text-[#6b6b8a] leading-relaxed flex-1">
                {tool.detail}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#6c3aed] group-hover:text-[#8b5cf6]">
                Open tool
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* ----- Context box ----- */}
        <div className="mt-10 rounded-xl border border-white/5 bg-[#252538]/60 p-6 text-sm leading-relaxed text-[#a0a0b8]">
          <h3 className="mb-2 text-base font-semibold text-white">
            What happened to SAVE?
          </h3>
          <p>
            The Saving on a Valuable Education (SAVE) plan — and its predecessor
            REPAYE — was permanently struck down by the Eighth Circuit on March 10,
            2026. All enrolled borrowers were placed in administrative forbearance,
            which{" "}
            <span className="text-amber-400 font-medium">
              does not count toward IDR or PSLF forgiveness
            </span>
            . The Department of Education introduced the Repayment Assistance Plan
            (RAP) as a replacement, but it has a $10/month minimum and uses 225% of
            the federal poverty level rather than SAVE&apos;s 150%.
          </p>
          <p className="mt-3">
            Borrowers with Parent PLUS loans face an additional{" "}
            <span className="text-red-400 font-medium">July 1, 2026</span> deadline:
            after that date, consolidated Parent PLUS loans can only access ICR, the
            most expensive income-driven plan. Consolidating before July 1 preserves
            access to IBR.
          </p>
        </div>
      </section>

      {/* ----- Back link ----- */}
      <div className="mx-auto max-w-4xl px-6 pb-12">
        <Link
          href="/"
          className="text-sm text-[#6b6b8a] hover:text-[#a0a0b8] transition-colors"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
