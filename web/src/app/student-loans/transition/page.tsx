import type { Metadata } from "next";
import Link from "next/link";
import TransitionForm from "./transition-form";

export const metadata: Metadata = {
  title: "SAVE Transition Advisor | PigeonGov",
  description:
    "Analyze your options after the SAVE plan ended. Compare RAP, IBR, ICR, and Standard repayment plans.",
};

export default function TransitionPage() {
  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* ----- Urgent header ----- */}
      <div className="border-b border-red-500/20 bg-gradient-to-r from-red-900/10 via-red-950/5 to-transparent">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <Link
            href="/student-loans"
            className="mb-4 inline-flex items-center gap-1 text-sm text-[#6b6b8a] hover:text-[#a0a0b8] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
            Student Loan Tools
          </Link>
          <h1 className="text-3xl font-bold text-white">
            SAVE Transition Advisor
          </h1>
          <p className="mt-2 text-[#a0a0b8]">
            Enter your loan details below. We&apos;ll show you every available
            repayment plan, flag urgent deadlines, and check PSLF eligibility.
          </p>
        </div>
      </div>

      {/* ----- Form ----- */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        <TransitionForm />
      </div>
    </div>
  );
}
