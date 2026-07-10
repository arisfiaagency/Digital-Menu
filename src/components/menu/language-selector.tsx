"use client";

import { Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dirForLocale, localeLabels, locales } from "@/lib/i18n/config";
import type { Locale } from "@/types/models";

export function LanguageSelector({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
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
