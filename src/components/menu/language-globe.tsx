"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Globe2 } from "lucide-react";
import { dirForLocale, localeLabels, locales } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/types/models";

type GlobeGlyph = {
  character: string;
  locale: Locale;
};

const globeGlyphChoices: Record<Locale, string[]> = {
  en: ["A", "B", "C", "M", "S", "T"],
  ar: ["ا", "ع", "ق", "م", "ن", "س"],
  ckb: ["ک", "گ", "ڕ", "چ", "پ", "ژ"]
};

const defaultGlobeGlyph: GlobeGlyph = {
  character: "A",
  locale: "en"
};

function randomGlobeGlyph(): GlobeGlyph {
  const locale = locales[Math.floor(Math.random() * locales.length)];
  const choices = globeGlyphChoices[locale];
  return {
    character: choices[Math.floor(Math.random() * choices.length)],
    locale
  };
}

export function LanguageGlobe({
  locale,
  onChange,
  menuAlign = "right"
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 160 });
  const [globeGlyph, setGlobeGlyph] = useState(defaultGlobeGlyph);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const viewportPadding = 12;
    const menuWidth = Math.min(176, window.innerWidth - viewportPadding * 2);
    const menuHeight = locales.length * 42 + 12;
    const rect = trigger.getBoundingClientRect();
    const preferredLeft = menuAlign === "left" ? rect.left : rect.right - menuWidth;
    const left = Math.min(Math.max(preferredLeft, viewportPadding), window.innerWidth - menuWidth - viewportPadding);
    const opensAbove = rect.bottom + 8 + menuHeight > window.innerHeight && rect.top > menuHeight + 8;
    const top = opensAbove ? rect.top - menuHeight - 8 : rect.bottom + 8;

    setMenuPosition({ top, left, width: menuWidth });
  }, [menuAlign]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const interval = window.setInterval(() => setGlobeGlyph(randomGlobeGlyph()), 1400);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div ref={ref} dir="ltr" className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen((value) => !value);
        }}
        aria-label="Select language"
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-full border bg-card text-primary shadow-sm transition-colors hover:bg-muted"
      >
        <Globe2 className="globe-spin h-5 w-5" aria-hidden />
        <span className="globe-orbit pointer-events-none absolute inset-0" aria-hidden>
          <span className="globe-glyph" lang={globeGlyph.locale} dir={dirForLocale(globeGlyph.locale)}>
            <span className="globe-glyph-character">{globeGlyph.character}</span>
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
          className={cn("pop-in fixed z-50 overflow-hidden rounded-2xl border bg-card p-1.5 shadow-xl")}
        >
          {locales.map((entry) => {
            const active = entry === locale;
            return (
              <button
                key={entry}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(entry);
                  setOpen(false);
                }}
                className={cn(
                  "focus-ring flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <span lang={entry} dir={dirForLocale(entry)}>{localeLabels[entry]}</span>
                {active ? <Check className="h-4 w-4" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
