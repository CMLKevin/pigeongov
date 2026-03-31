import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BadgeDollarSign, ArrowRight } from 'lucide-react';
import { ScreenerClient } from './client';

export const metadata: Metadata = {
  title: 'Benefits Eligibility Screener',
  description:
    'Answer a few questions to see which federal and state benefits you may qualify for.',
};

export default function ScreenPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pigeon-cyan/10 text-pigeon-cyan">
          <BadgeDollarSign className="h-5 w-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Benefits Eligibility Screener
        </h1>
      </div>
      <p className="text-muted text-lg mb-8 max-w-2xl">
        Answer a few questions about your household. We&rsquo;ll check
        eligibility across 13 federal programs and tell you exactly how to
        apply.
      </p>

      <ScreenerClient />
    </div>
  );
}
