'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  decodeShareData,
  formatExpiration,
  type ShareableData,
} from '@/lib/share';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Share Page
//
// A read-only view of someone's shared action plan. Decoded entirely from
// the URL hash — no server involved, no database, no accounts.
// The government version of "I texted you a screenshot of my to-do list."
// ---------------------------------------------------------------------------

function SharedPlanView({ data }: { data: ShareableData }) {
  // Group items by phase
  const phases = new Map<string, typeof data.items>();
  for (const item of data.items) {
    const key = item.phaseLabel || `Phase ${item.phase}`;
    const existing = phases.get(key);
    if (existing) {
      existing.push(item);
    } else {
      phases.set(key, [item]);
    }
  }

  const phaseEntries = [...phases.entries()];

  return (
    <div className="border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono rounded-none">
      {/* Header */}
      <div className="border-b-2 border-[#3d2a7a] px-4 py-2 flex items-center justify-between bg-[#1a1040]/50">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#4ade80] font-bold text-sm truncate">
            pigeongov
          </span>
          <span className="text-[#9d8ec2] text-xs truncate hidden sm:inline">
            shared plan
          </span>
        </div>
        <span className="text-[#9d8ec2] text-xs shrink-0">
          read-only
        </span>
      </div>

      {/* Meta */}
      <div className="px-4 py-3 border-b-2 border-[#3d2a7a]">
        <h1 className="text-lg font-bold text-white">{data.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-[#9d8ec2]">
          <span>from: {data.source}</span>
          <span>shared by: {data.sharedBy}</span>
          <span>
            expires: {formatExpiration(data.expiresAt)}
          </span>
        </div>
      </div>

      {/* Flags */}
      {data.flags && data.flags.length > 0 && (
        <div className="px-4 py-2 border-b-2 border-[#3d2a7a]">
          <div className="flex flex-wrap gap-2">
            {data.flags.map((flag, i) => (
              <span
                key={i}
                className="text-xs text-[#fbbf24] border border-[#fbbf24]/30 px-2 py-0.5"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-4 py-3 text-sm">
        {phaseEntries.map(([phaseLabel, items], phaseIdx) => {
          const isLastPhase = phaseIdx === phaseEntries.length - 1;
          const phaseConnector = isLastPhase ? '\u2514' : '\u251C';
          const itemPrefix = isLastPhase ? ' ' : '\u2502';

          return (
            <div key={phaseLabel}>
              {/* Phase header */}
              <div className="flex items-center gap-0">
                <span className="text-[#3d2a7a]" aria-hidden="true">
                  {phaseConnector}{'\u2500\u2500 '}
                </span>
                <span className="text-[#4ade80] font-bold uppercase tracking-wider text-xs">
                  {phaseLabel}
                </span>
                <span className="text-[#3d2a7a] ml-1 flex-1 overflow-hidden whitespace-nowrap" aria-hidden="true">
                  {' '}{'\u2500'.repeat(30)}
                </span>
              </div>

              {/* Items */}
              {items.map((item, itemIdx) => {
                const isLastItem = itemIdx === items.length - 1 && isLastPhase;
                const itemConnector = isLastItem ? '\u2514' : '\u251C';
                const statusSymbol =
                  item.status === 'urgent'
                    ? '\u26A1'
                    : item.status === 'complete'
                      ? '\u2713'
                      : '\u25CB';
                const statusColor =
                  item.status === 'urgent'
                    ? 'text-[#ef4444]'
                    : item.status === 'complete'
                      ? 'text-[#4ade80]'
                      : 'text-[#9d8ec2]';

                return (
                  <div key={item.id}>
                    <div className="flex items-start gap-0">
                      <span className="text-[#3d2a7a] shrink-0" aria-hidden="true">
                        {itemPrefix}{'  '}{itemConnector}{'\u2500 '}
                      </span>
                      <span className={cn('shrink-0 mr-2', statusColor)}>
                        {statusSymbol}
                      </span>
                      <span
                        className={cn(
                          'flex-1',
                          item.status === 'urgent' ? 'text-[#ef4444] font-semibold' : 'text-white/90'
                        )}
                      >
                        {item.label}
                      </span>
                      {item.deadline && (
                        <span className="shrink-0 ml-2 text-xs text-[#9d8ec2] tabular-nums">
                          {item.deadline}
                        </span>
                      )}
                    </div>

                    {/* Spacer */}
                    {!isLastItem && (
                      <div className="text-[#3d2a7a]" aria-hidden="true">
                        {itemPrefix}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Gap between phases */}
              {!isLastPhase && (
                <div className="text-[#3d2a7a]" aria-hidden="true">
                  {'\u2502'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Programs */}
      {data.programs && data.programs.length > 0 && (
        <div className="border-t-2 border-[#3d2a7a] px-4 py-3">
          <div className="text-[#4ade80] font-bold text-xs uppercase tracking-wider mb-2">
            Eligible Programs
          </div>
          <div className="flex flex-wrap gap-2">
            {data.programs.map((program, i) => (
              <span
                key={i}
                className="text-xs text-[#c4b5fd] border border-[#3d2a7a] px-2 py-0.5"
              >
                {program}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-[#3d2a7a] px-4 py-2 text-xs text-[#9d8ec2]/60">
        This is a shared read-only view. No personal information is included.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SharePage() {
  const [data, setData] = useState<ShareableData | null | 'loading'>('loading');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setData(null);
      return;
    }
    const decoded = decodeShareData(hash);
    setData(decoded);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[#9d8ec2] hover:text-white font-mono transition-colors mb-6"
      >
        <span aria-hidden="true">&larr;</span>
        cd ..
      </Link>

      {data === 'loading' && (
        <div className="border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono p-8 text-center">
          <div className="text-[#4ade80] animate-pulse">Decoding shared plan...</div>
        </div>
      )}

      {data === null && (
        <div className="border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono p-8 text-center">
          <div className="text-[#ef4444] text-lg font-bold mb-2">
            Invalid or expired share link
          </div>
          <p className="text-[#9d8ec2] text-sm">
            The link may have expired, been corrupted, or the data may be invalid.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 text-[#4ade80] text-sm hover:underline"
          >
            {'> '}Go to PigeonGov
          </Link>
        </div>
      )}

      {data !== null && data !== 'loading' && <SharedPlanView data={data} />}
    </div>
  );
}
