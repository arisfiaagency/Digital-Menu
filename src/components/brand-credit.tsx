"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

// The agency that builds & maintains this app. Centralized here so the credit
// reads the same everywhere (menu footer, welcome screen, admin login, receipt)
// and can be renamed in one place later.
export const BRAND_AGENCY = "Arisfia Agency";
export const BRAND_AGENCY_URL = "https://arisfia-agency.vercel.app";

// Subtle "Powered by <agency>" credit with a small logomark. Color is inherited,
// so pass a text-* class via `className` to recolor it on tinted backgrounds
// (e.g. the welcome screen). Hovering shows a hint; a single click opens the site.
export function BrandCredit({ className }: { className?: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <p dir="ltr" className={cn("text-center text-xs text-muted-foreground", className)}>
      <span className="relative inline-flex items-center gap-1">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-md transition-all duration-200",
            hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          )}
        >
          Click to visit our agency site
        </span>

        <span>Powered by</span>
        <a
          href={BRAND_AGENCY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${BRAND_AGENCY} website`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          className="focus-ring inline-flex items-center gap-1 rounded font-semibold underline-offset-4 opacity-90 transition-[opacity,text-decoration-color] duration-200 hover:underline hover:opacity-100"
        >
          <AgencyMark />
          {BRAND_AGENCY}
        </a>
      </span>
    </p>
  );
}

// Placeholder monogram mark — uses currentColor so it recolors with the text on
// any background. Swap for a real <Image> logo when one is available.
function AgencyMark() {
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] border border-current text-[10px] font-bold leading-none"
    >
      A
    </span>
  );
}
