import { confirm, input, password, select } from "@inquirer/prompts";

export interface PromptClient {
  input(message: string, options?: { default?: string; validate?: (value: string) => true | string }): Promise<string>;
  password(message: string, options?: { validate?: (value: string) => true | string }): Promise<string>;
  confirm(message: string, options?: { default?: boolean }): Promise<boolean>;
  select<T extends string>(
    message: string,
    choices: Array<{ name: string; value: T }>,
  ): Promise<T>;
}

export const defaultPromptClient: PromptClient = {
  input(message, options) {
    return input({
      message,
      ...(options?.default !== undefined ? { default: options.default } : {}),
      ...(options?.validate ? { validate: options.validate } : {}),
    });
  },
  password(message, options) {
    return password({
      message,
      mask: "*",
      ...(options?.validate ? { validate: options.validate } : {}),
    });
  },
  confirm(message, options) {
    return confirm({
      message,
      ...(options?.default !== undefined ? { default: options.default } : {}),
    });
  },
  select(message, choices) {
    return select({
      message,
      choices,
    });
  },
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseCurrency(value: string): number {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validateSsn(value: string): true | string {
  return /^\d{3}-\d{2}-\d{4}$/.test(value)
    ? true
    : "Use ###-##-#### format.";
}

export function maskSsn(value: string): string {
  return value.replace(/^\d{3}-\d{2}/, "***-**");
}
