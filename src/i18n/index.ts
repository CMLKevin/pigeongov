import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export type Locale = "en" | "es" | "zh-CN";

const SUPPORTED_LOCALES: readonly Locale[] = ["en", "es", "zh-CN"] as const;

let activeLocale: Locale = "en";

const localeCache = new Map<Locale, Record<string, string>>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadLocaleData(locale: Locale): Record<string, string> {
  const cached = localeCache.get(locale);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const filePath = join(__dirname, "locales", `${locale}.json`);
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, string>;
    localeCache.set(locale, data);
    return data;
  } catch {
    const empty: Record<string, string> = {};
    localeCache.set(locale, empty);
    return empty;
  }
}

/**
 * Detect locale from environment variables.
 * Priority: PIGEONGOV_LOCALE > LANG env > default "en"
 */
export function detectLocale(): Locale {
  const pigeonLocale = process.env["PIGEONGOV_LOCALE"];
  if (pigeonLocale !== undefined && SUPPORTED_LOCALES.includes(pigeonLocale as Locale)) {
    return pigeonLocale as Locale;
  }

  const lang = process.env["LANG"];
  if (lang !== undefined) {
    const normalized = lang.split(".")[0];
    if (normalized !== undefined) {
      // Check exact match first (e.g., "zh_CN" -> "zh-CN")
      const hyphenated = normalized.replace("_", "-");
      if (SUPPORTED_LOCALES.includes(hyphenated as Locale)) {
        return hyphenated as Locale;
      }
      // Check language prefix (e.g., "es_MX" -> "es")
      const prefix = normalized.split("_")[0]!.split("-")[0]!;
      if (SUPPORTED_LOCALES.includes(prefix as Locale)) {
        return prefix as Locale;
      }
    }
  }

  return "en";
}

/**
 * Set the active locale.
 */
export function setLocale(locale: Locale): void {
  activeLocale = locale;
}

/**
 * Get the current active locale.
 */
export function getLocale(): Locale {
  return activeLocale;
}

/**
 * Translate a key with optional parameter interpolation.
 *
 * Fallback chain: requested locale -> "en" -> raw key.
 * Interpolation: replaces {{paramName}} with the provided value.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const localeData = loadLocaleData(activeLocale);
  let value = localeData[key];

  // Fallback to English
  if (value === undefined && activeLocale !== "en") {
    const enData = loadLocaleData("en");
    value = enData[key];
  }

  // Fallback to raw key
  if (value === undefined) {
    return key;
  }

  // Interpolate parameters
  if (params !== undefined) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replaceAll(`{{${paramKey}}}`, String(paramValue));
    }
  }

  return value;
}
