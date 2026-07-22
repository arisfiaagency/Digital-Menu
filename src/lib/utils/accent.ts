import type { CSSProperties } from "react";

// Each menu design ships a fixed look, but the platform admin sets one accent
// color per cafe at creation. We map that hex color onto the theme's `--primary`
// / `--secondary` CSS custom properties (raw "H S% L%" triplets, matching
// globals.css) so a design's `text-primary` / `bg-primary` classes pick it up.
// This is the small slice of the old color.ts we still need — just accent
// tinting, not a full per-cafe theme engine.

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace(/^#/, "");
  const full = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

// Returns a raw HSL triplet string like "138 46% 34%" (no hsl()/commas) so it
// can be dropped straight into `--primary`.
function hexToHslTriplet(hex: string): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return `${h} ${Math.round(clamp01(s) * 100)}% ${Math.round(clamp01(l) * 100)}%`;
}

// Relative luminance of the accent → pick black or white text on top of it.
function readableForeground(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "0 0% 100%";
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
  return luminance > 0.45 ? "222 47% 11%" : "0 0% 100%";
}

/**
 * Inline style that overrides the theme's primary/secondary tokens with the
 * cafe's accent. Apply it to the design's root element; every `primary`-based
 * Tailwind class below it then uses the accent. Returns undefined when the
 * accent is missing/invalid so the site's default theme is used.
 */
export function accentStyle(accent?: string | null): CSSProperties | undefined {
  if (!accent) return undefined;
  const triplet = hexToHslTriplet(accent);
  if (!triplet) return undefined;
  const foreground = readableForeground(accent);
  return {
    "--primary": triplet,
    "--primary-foreground": foreground,
    "--secondary": triplet,
    "--secondary-foreground": foreground,
    "--ring": triplet
  } as CSSProperties;
}
