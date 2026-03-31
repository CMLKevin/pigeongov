'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  type ShareableData,
  generateShareUrl,
  defaultExpiration,
} from '@/lib/share';

// ---------------------------------------------------------------------------
// Share Panel
//
// Appears on results pages. Two buttons: Copy Link and Print.
// Because the only thing worse than filling out government paperwork
// is having to explain to someone else what you filled out.
// ---------------------------------------------------------------------------

interface SharePanelProps {
  /** Data to share — will be encoded into the URL hash */
  data: Omit<ShareableData, 'createdAt' | 'expiresAt' | 'sharedBy'>;
  /** Display name for the sharer (defaults to "Anonymous") */
  sharedBy?: string;
  className?: string;
}

export function SharePanel({ data, sharedBy = 'Anonymous', className }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    const shareData: ShareableData = {
      ...data,
      sharedBy,
      createdAt: new Date().toISOString(),
      expiresAt: defaultExpiration(),
    };

    const url = generateShareUrl(shareData);

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: select a temporary input
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data, sharedBy]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div
      className={cn(
        'border-2 border-[#3d2a7a] bg-[#0f0a1f] font-mono rounded-none',
        className
      )}
    >
      {/* Header */}
      <div className="border-b-2 border-[#3d2a7a] px-4 py-2 bg-[#1a1040]/50">
        <span className="text-[#9d8ec2] font-bold text-xs uppercase tracking-wider">
          Share this plan
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopyLink}
          className={cn(
            'font-mono text-xs font-bold px-3 py-1.5 transition-all border',
            copied
              ? 'bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80]'
              : 'bg-transparent border-[#3d2a7a] text-[#c4b5fd] hover:border-[#4ade80] hover:text-[#4ade80]'
          )}
        >
          {copied ? '[\u2713 Copied]' : '[Copy Link]'}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="font-mono text-xs font-bold px-3 py-1.5 transition-all border bg-transparent border-[#3d2a7a] text-[#c4b5fd] hover:border-[#4ade80] hover:text-[#4ade80]"
        >
          [Print]
        </button>
        <span className="text-[#9d8ec2] text-xs ml-auto">
          link expires in 7 days
        </span>
      </div>
    </div>
  );
}

export default SharePanel;
