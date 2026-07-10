"use client";

import { useEffect, useState } from "react";
import { getOpenState } from "@/lib/business-hours";
import { translate } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/types/models";

// Live Open / Closed pill driven by the café's hours. Ticks every minute so it
// flips on its own. Green pulsing dot = open ("until <close time>"); muted =
// closed ("opens <open time>").
export function OpenStatusBadge({
  locale,
  textDir,
  openHour,
  closeHour,
  className
}: {
  locale: Locale;
  textDir: "ltr" | "rtl";
  openHour?: number;
  closeHour?: number;
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Render nothing until mounted so server and client markup match (time is
  // client-only) and it appears as soon as the page is interactive.
  if (!now) return null;

  const { isOpen, changeAt } = getOpenState(now, openHour, closeHour);
  const timeLocale = locale === "ckb" ? "ar-IQ" : locale;
  const timeText = changeAt.toLocaleTimeString(timeLocale, { hour: "numeric", minute: "2-digit" });
  const statusLabel = translate(locale, isOpen ? "menu.openNow" : "menu.closedNow");
  const detail = `${translate(locale, isOpen ? "menu.closes" : "menu.opens")} ${timeText}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
        isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        className
      )}
    >
      <span
        className={cn("h-2 w-2 rounded-full", isOpen ? "bg-primary motion-safe:animate-pulse" : "bg-muted-foreground/50 status-closed-dot")}
        aria-hidden
      />
      <span dir={textDir} className="font-semibold">{statusLabel}</span>
      <span dir={textDir} className="text-xs opacity-80">· {detail}</span>
    </span>
  );
}
