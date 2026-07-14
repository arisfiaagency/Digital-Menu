"use client";

import { Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dirForLocale, localeLabels, locales } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import type { Locale, WelcomeLanguageStyle } from "@/types/models";

export function LanguageSelector({
  locale,
  onChange,
  variant = "buttons"
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  variant?: WelcomeLanguageStyle;
}) {
  if (variant === "segmented") {
    return (
      <div dir="ltr" className="inline-flex rounded-full border bg-background/70 p-1 shadow-sm" aria-label="Language selector">
        {locales.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            className={cn(
              "focus-ring rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
              entry === locale ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span lang={entry} dir={dirForLocale(entry)}>{localeLabels[entry]}</span>
          </button>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div dir="ltr" className="grid w-full grid-cols-3 gap-2" aria-label="Language selector">
        {locales.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            className={cn(
              "focus-ring rounded-lg border px-2 py-3 text-center text-sm font-semibold shadow-sm transition-colors",
              entry === locale ? "border-primary bg-primary text-primary-foreground" : "bg-background/75 text-muted-foreground hover:text-foreground"
            )}
          >
            <span lang={entry} dir={dirForLocale(entry)}>{localeLabels[entry]}</span>
          </button>
        ))}
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div dir="ltr" className="flex flex-wrap items-center justify-center gap-1 text-sm" aria-label="Language selector">
        {locales.map((entry, index) => (
          <span key={entry} className="inline-flex items-center gap-1">
            {index ? <span className="text-muted-foreground/45">/</span> : null}
            <button
              type="button"
              onClick={() => onChange(entry)}
              className={cn(
                "focus-ring rounded px-2 py-1 font-semibold underline-offset-4",
                entry === locale ? "text-primary underline" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span lang={entry} dir={dirForLocale(entry)}>{localeLabels[entry]}</span>
            </button>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div dir="ltr" className="flex flex-wrap items-center gap-2" aria-label="Language selector">
      <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden />
      {locales.map((entry) => (
        <Button
          key={entry}
          type="button"
          size="sm"
          variant={entry === locale ? "default" : "outline"}
          onClick={() => onChange(entry)}
        >
          <span lang={entry} dir={dirForLocale(entry)}>{localeLabels[entry]}</span>
        </Button>
      ))}
    </div>
  );
}
