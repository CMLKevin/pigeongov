import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, TrendingDown } from 'lucide-react';
import { CliffClient } from './client';

export const metadata: Metadata = {
  title: 'Benefits Cliff Calculator',
  description:
    'See exactly when a raise costs you more in lost benefits than you gain in income.',
};

export default function CliffPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pigeon-pink/10 text-pigeon-pink">
          <TrendingDown className="h-5 w-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Benefits Cliff Calculator
        </h1>
      </div>
      <p className="text-muted text-lg mb-8 max-w-2xl">
        Model how your total household resources change as earnings rise. Find
        the exact dollar amounts where a raise actually costs you money &mdash;
        and how to plan around them.
      </p>

      <CliffClient />
    </div>
  );
}
