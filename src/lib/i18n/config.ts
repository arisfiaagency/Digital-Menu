import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import ckb from "@/messages/ckb.json";
import type { Locale, OptionalLocalizedText } from "@/types/models";

export const locales: Locale[] = ["ckb", "ar", "en"];
export const rtlLocales: Locale[] = ["ar", "ckb"];
export const localeLabels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ckb: "کوردی"
};

export const messages = { en, ar, ckb } as const;
export type LocaleDirection = "ltr" | "rtl";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ar" || value === "ckb";
}

export function dirForLocale(locale: Locale): LocaleDirection {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}

export function translate(locale: Locale, path: string) {
  const parts = path.split(".");
  let current: unknown = messages[locale];
  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

export function localized(value: OptionalLocalizedText | undefined, locale: Locale, fallback = "") {
  if (!value) return fallback;
  return value[locale] || value.en || value.ar || value.ckb || fallback;
}
