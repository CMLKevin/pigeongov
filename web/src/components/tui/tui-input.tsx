"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI Input — terminal-style text input.
//
// > Enter your household size: 4_
//
// Green prompt, monospace, the blinking cursor of implied authority.
// Looks like actual terminal input, behaves like a React controlled input.
// ---------------------------------------------------------------------------

type TuiInputType = "text" | "number" | "currency";

interface TuiInputProps {
  /** The prompt text shown before the input (e.g., "> Enter your name:") */
  prompt?: string;
  /** Input value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Enter key handler */
  onSubmit?: () => void;
  /** Escape key handler */
  onEscape?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Input type */
  type?: TuiInputType;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Disabled state */
  disabled?: boolean;
  className?: string;
}

export function TuiInput({
  prompt = ">",
  value,
  onChange,
  onSubmit,
  onEscape,
  placeholder,
  type = "text",
  autoFocus = false,
  disabled = false,
  className,
}: TuiInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === "Escape" && onEscape) {
      e.preventDefault();
      onEscape();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value;
    if (type === "number") {
      val = val.replace(/[^0-9.-]/g, "");
    }
    if (type === "currency") {
      val = val.replace(/[^0-9.]/g, "");
    }
    onChange(val);
  }

  return (
    <div className={cn("flex items-center gap-2 font-mono", className)}>
      {/* Prompt */}
      <span className="text-[#4ade80] font-bold shrink-0 text-sm">
        {prompt}
      </span>

      {/* Currency prefix */}
      {type === "currency" && (
        <span className="text-[#4ade80] font-bold shrink-0 text-sm">$</span>
      )}

      {/* The actual input, disguised as terminal text */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          inputMode={type === "number" || type === "currency" ? "numeric" : "text"}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full bg-transparent border-none outline-none text-white text-sm font-mono",
            "placeholder:text-[#3d2a7a] caret-[#4ade80]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={prompt}
        />
        {/* Blinking underscore cursor — only visible when input is empty and focused */}
        {!value && !placeholder && (
          <span className="absolute left-0 top-0 text-[#4ade80] cursor-blink pointer-events-none">
            _
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TuiSelect — terminal-style select with inline options.
//
// > Filing status: [MFJ] MFS  S  HOH
// ---------------------------------------------------------------------------

interface TuiSelectOption {
  label: string;
  value: string;
}

interface TuiSelectProps {
  prompt?: string;
  options: TuiSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TuiSelect({
  prompt = ">",
  options,
  value,
  onChange,
  className,
}: TuiSelectProps) {
  return (
    <div className={cn("flex items-center gap-2 font-mono flex-wrap", className)}>
      <span className="text-[#4ade80] font-bold shrink-0 text-sm">
        {prompt}
      </span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-2 py-0.5 text-xs font-mono transition-colors rounded-none border",
                isSelected
                  ? "bg-[#4ade80]/15 border-[#4ade80] text-[#4ade80] font-bold"
                  : "bg-transparent border-[#3d2a7a] text-[#9d8ec2] hover:border-[#4ade80]/50 hover:text-white"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TuiCheckbox — terminal-style checkbox.
//
// [x] Military veteran in household
// [ ] Disability in household
// ---------------------------------------------------------------------------

interface TuiCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function TuiCheckbox({
  checked,
  onChange,
  label,
  className,
}: TuiCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 font-mono text-sm text-left transition-colors group",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0",
          checked ? "text-[#4ade80]" : "text-[#3d2a7a] group-hover:text-[#9d8ec2]"
        )}
      >
        [{checked ? "x" : " "}]
      </span>
      <span
        className={cn(
          "transition-colors",
          checked ? "text-white" : "text-[#c4b5fd]/80 group-hover:text-white"
        )}
      >
        {label}
      </span>
    </button>
  );
}
