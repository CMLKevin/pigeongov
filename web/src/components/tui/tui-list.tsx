"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI List — selectable list with keyboard navigation.
//
// > Item one          <- selected (green arrow, highlighted bg)
//   Item two
//   Item three
//
// Arrow keys to navigate, enter to select.
// The BubbleTea list component, reincarnated as a React component with
// slightly better error messages and slightly worse performance.
// ---------------------------------------------------------------------------

export interface TuiListItem<T = string> {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional description below the label */
  description?: string;
  /** Optional right-aligned detail text */
  detail?: string;
  /** Optional status indicator */
  status?: "active" | "complete" | "error" | "pending";
  /** The actual data payload */
  value: T;
}

interface TuiListProps<T = string> {
  items: TuiListItem<T>[];
  /** Called when enter is pressed on an item */
  onSelect?: (item: TuiListItem<T>) => void;
  /** Controlled selected index */
  selectedIndex?: number;
  /** Called when the selected index changes */
  onSelectedIndexChange?: (index: number) => void;
  /** Whether to auto-focus the list on mount */
  autoFocus?: boolean;
  /** Max height before scrolling (CSS value) */
  maxHeight?: string;
  className?: string;
}

const statusSymbol: Record<string, { sym: string; color: string }> = {
  active: { sym: "\u25CF", color: "text-[#4ade80]" },
  complete: { sym: "\u2713", color: "text-[#4ade80]" },
  error: { sym: "\u2717", color: "text-[#f472b6]" },
  pending: { sym: "\u25CB", color: "text-[#facc15]" },
};

export function TuiList<T = string>({
  items,
  onSelect,
  selectedIndex: controlledIndex,
  onSelectedIndexChange,
  autoFocus = false,
  maxHeight,
  className,
}: TuiListProps<T>) {
  const [internalIndex, setInternalIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedIndex = controlledIndex ?? internalIndex;
  const setSelectedIndex = useCallback(
    (idx: number) => {
      if (onSelectedIndexChange) onSelectedIndexChange(idx);
      else setInternalIndex(idx);
    },
    [onSelectedIndexChange]
  );

  // Auto-focus
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.focus();
    }
  }, [autoFocus]);

  // Scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, items.length - 1));
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (items[selectedIndex] && onSelect) {
            onSelect(items[selectedIndex]);
          }
          break;
        case "Home":
          e.preventDefault();
          setSelectedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setSelectedIndex(items.length - 1);
          break;
      }
    },
    [items, selectedIndex, setSelectedIndex, onSelect]
  );

  if (items.length === 0) {
    return (
      <div className={cn("font-mono text-sm text-[#9d8ec2] px-4 py-3", className)}>
        No items.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn("font-mono outline-none", className)}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      {items.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={item.id}
            ref={(el) => { itemRefs.current[idx] = el; }}
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              setSelectedIndex(idx);
              if (onSelect) onSelect(item);
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors",
              isSelected
                ? "bg-[#4ade80]/10 text-white"
                : "text-[#c4b5fd]/80 hover:bg-[#1a1040]"
            )}
          >
            {/* Selection arrow */}
            <span
              className={cn(
                "w-4 shrink-0 text-sm",
                isSelected ? "text-[#4ade80] font-bold" : "text-transparent"
              )}
              aria-hidden="true"
            >
              {">"}
            </span>

            {/* Status dot */}
            {item.status && (
              <span
                className={cn("text-xs shrink-0", statusSymbol[item.status]?.color)}
                aria-hidden="true"
              >
                {statusSymbol[item.status]?.sym}
              </span>
            )}

            {/* Label + description */}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "text-sm block truncate",
                  isSelected ? "text-white font-semibold" : ""
                )}
              >
                {item.label}
              </span>
              {item.description && (
                <span className="text-xs text-[#9d8ec2] block truncate">
                  {item.description}
                </span>
              )}
            </div>

            {/* Right-side detail */}
            {item.detail && (
              <span className="text-xs text-[#9d8ec2] shrink-0 tabular-nums">
                {item.detail}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
