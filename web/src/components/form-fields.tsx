"use client";

import type { WorkflowQuestionField } from "@/lib/types";

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

interface FieldProps {
  field: WorkflowQuestionField;
  value: unknown;
  error?: string;
  onChange: (key: string, value: unknown) => void;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const inputBase =
  "w-full rounded-lg border-2 border-[#3d2a7a] bg-[#1a1040] px-4 py-3 text-white font-mono placeholder:text-[#6b5b8a] " +
  "transition-all duration-200 " +
  "focus:border-[#4ade80] focus:outline-none focus:ring-2 focus:ring-[#4ade80]/20";

const labelBase = "block text-sm font-semibold text-[#c4b5fd] font-mono uppercase tracking-wider mb-1.5";

function HelpText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-1 text-xs text-[#9d8ec2] font-mono leading-relaxed">{text}</p>
  );
}

function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="mt-1.5 text-xs text-[#f472b6] font-mono flex items-center gap-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3.5 w-3.5 flex-shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      {text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------

function TextField({ field, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={field.key} className={labelBase}>
        {field.label}
      </label>
      <input
        id={field.key}
        name={field.key}
        type="text"
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`${inputBase} ${error ? "border-[#f472b6] focus:border-[#f472b6] focus:ring-[#f472b6]/30" : ""}`}
        aria-describedby={
          field.helpText ? `${field.key}-help` : undefined
        }
        aria-invalid={!!error}
      />
      {field.helpText && (
        <p id={`${field.key}-help`}>
          <HelpText text={field.helpText} />
        </p>
      )}
      <ErrorText text={error} />
    </div>
  );
}

function TextareaField({ field, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={field.key} className={labelBase}>
        {field.label}
      </label>
      <textarea
        id={field.key}
        name={field.key}
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        rows={4}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`${inputBase} resize-y min-h-[100px] ${error ? "border-[#f472b6] focus:border-[#f472b6] focus:ring-[#f472b6]/30" : ""}`}
        aria-describedby={
          field.helpText ? `${field.key}-help` : undefined
        }
        aria-invalid={!!error}
      />
      {field.helpText && (
        <p id={`${field.key}-help`}>
          <HelpText text={field.helpText} />
        </p>
      )}
      <ErrorText text={error} />
    </div>
  );
}

function CurrencyField({ field, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={field.key} className={labelBase}>
        {field.label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4ade80] text-sm font-bold font-mono select-none">
          $
        </span>
        <input
          id={field.key}
          name={field.key}
          type="number"
          step="0.01"
          min="0"
          value={value === 0 ? "0" : (value as string | number) ?? ""}
          placeholder="0.00"
          onChange={(e) =>
            onChange(field.key, e.target.value === "" ? 0 : parseFloat(e.target.value))
          }
          className={`${inputBase} pl-8 tabular-nums ${error ? "border-[#f472b6] focus:border-[#f472b6] focus:ring-[#f472b6]/30" : ""}`}
          aria-describedby={
            field.helpText ? `${field.key}-help` : undefined
          }
          aria-invalid={!!error}
        />
      </div>
      {field.helpText && (
        <p id={`${field.key}-help`}>
          <HelpText text={field.helpText} />
        </p>
      )}
      <ErrorText text={error} />
    </div>
  );
}

function NumberField({ field, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={field.key} className={labelBase}>
        {field.label}
      </label>
      <input
        id={field.key}
        name={field.key}
        type="number"
        value={value === 0 ? "0" : (value as string | number) ?? ""}
        placeholder={field.placeholder ?? "0"}
        onChange={(e) =>
          onChange(field.key, e.target.value === "" ? 0 : parseFloat(e.target.value))
        }
        className={`${inputBase} tabular-nums ${error ? "border-[#f472b6] focus:border-[#f472b6] focus:ring-[#f472b6]/30" : ""}`}
        aria-describedby={
          field.helpText ? `${field.key}-help` : undefined
        }
        aria-invalid={!!error}
      />
      {field.helpText && (
        <p id={`${field.key}-help`}>
          <HelpText text={field.helpText} />
        </p>
      )}
      <ErrorText text={error} />
    </div>
  );
}

function DateField({ field, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={field.key} className={labelBase}>
        {field.label}
      </label>
      <input
        id={field.key}
        name={field.key}
        type="date"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`${inputBase} ${error ? "border-[#f472b6] focus:border-[#f472b6] focus:ring-[#f472b6]/30" : ""}`}
        aria-describedby={
          field.helpText ? `${field.key}-help` : undefined
        }
        aria-invalid={!!error}
      />
      {field.helpText && (
        <p id={`${field.key}-help`}>
          <HelpText text={field.helpText} />
        </p>
      )}
      <ErrorText text={error} />
    </div>
  );
}

function SelectField({ field, value, error, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={field.key} className={labelBase}>
        {field.label}
      </label>
      <div className="relative">
        <select
          id={field.key}
          name={field.key}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`${inputBase} appearance-none pr-10 ${error ? "border-[#f472b6] focus:border-[#f472b6] focus:ring-[#f472b6]/30" : ""}`}
          aria-describedby={
            field.helpText ? `${field.key}-help` : undefined
          }
          aria-invalid={!!error}
        >
          <option value="" disabled>
            Select...
          </option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4ade80]"
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {field.helpText && (
        <p id={`${field.key}-help`}>
          <HelpText text={field.helpText} />
        </p>
      )}
      <ErrorText text={error} />
    </div>
  );
}

function ConfirmField({ field, value, error, onChange }: FieldProps) {
  const checked = !!value;
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="relative flex h-6 items-center">
          <input
            id={field.key}
            name={field.key}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="h-5 w-5 rounded border-2 border-[#3d2a7a] bg-[#1a1040] text-[#4ade80] focus:ring-2 focus:ring-[#4ade80]/20 cursor-pointer accent-[#4ade80]"
            aria-describedby={
              field.helpText ? `${field.key}-help` : undefined
            }
            aria-invalid={!!error}
          />
        </div>
        <label
          htmlFor={field.key}
          className="text-sm text-[#c4b5fd] font-mono cursor-pointer select-none leading-relaxed"
        >
          {field.label}
        </label>
      </div>
      {field.helpText && (
        <p id={`${field.key}-help`} className="ml-8">
          <HelpText text={field.helpText} />
        </p>
      )}
      <ErrorText text={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function FormField(props: FieldProps) {
  switch (props.field.type) {
    case "text":
      return <TextField {...props} />;
    case "textarea":
      return <TextareaField {...props} />;
    case "currency":
      return <CurrencyField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "date":
      return <DateField {...props} />;
    case "select":
      return <SelectField {...props} />;
    case "confirm":
      return <ConfirmField {...props} />;
    default:
      return <TextField {...props} />;
  }
}

export default FormField;
