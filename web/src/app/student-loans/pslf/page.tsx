import type { Metadata } from "next";
import Link from "next/link";
import PSLFForm from "./pslf-form";

export const metadata: Metadata = {
  title: "PSLF Tracker | PigeonGov",
  description:
    "Track your progress toward Public Service Loan Forgiveness. See qualifying payments, employer risk, and buyback opportunities.",
};

export default function PSLFPage() {
  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* ----- Header ----- */}
      <div className="border-b border-white/10">
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
          <h1 className="text-3xl font-bold text-white">PSLF Tracker</h1>
          <p className="mt-2 text-[#a0a0b8]">
            Track your progress toward the 120 qualifying payments required for
            Public Service Loan Forgiveness. Includes employer risk assessment
            under 2026 rules and buyback opportunity analysis.
          </p>
        </div>
      </div>

      {/* ----- Form ----- */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        <PSLFForm />
      </div>
    </div>
  );
}
