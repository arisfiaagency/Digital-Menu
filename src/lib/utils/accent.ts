import type { CSSProperties } from "react";

// Each menu design ships a layout, but the platform admin sets one accent color
// per cafe. We turn that accent into a full, cohesive theme — background, card,
// muted, border and text tints, plus the primary color — for both light and dark,
// so changing the accent recolors the whole page (not just the text/buttons).
// Emitted as a scoped stylesheet (see menuAccentCss) because inline styles can't
// carry separate light/dark values.

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace(/^#/, "");
  const full = cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl | null {
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
  return { h, s: clamp(s, 0, 1) * 100, l: clamp(l, 0, 1) * 100 };
}

// Black or white text on top of a given lightness.
function readableFg(l: number): string {
  return l > 60 ? "222 47% 11%" : "0 0% 100%";
}

// Raw "H S% L%" triplet.
function triplet(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/**
 * Inline style that overrides just the primary/secondary tokens with the accent.
 * Kept for the admin preview swatch; the public menu uses menuAccentCss instead.
 */
export function accentStyle(accent?: string | null): CSSProperties | undefined {
  const hsl = accent ? hexToHsl(accent) : null;
  if (!hsl) return undefined;
  const t = triplet(hsl.h, hsl.s, hsl.l);
  const fg = readableFg(hsl.l);
  return {
    "--primary": t,
    "--primary-foreground": fg,
    "--secondary": t,
    "--secondary-foreground": fg,
    "--ring": t
  } as CSSProperties;
}

/**
 * A scoped stylesheet that recolors the entire theme from the accent, for light
 * and dark. Inject once (e.g. `<style dangerouslySetInnerHTML={{__html: menuAccentCss(accent)}} />`)
 * inside the menu/welcome; every element under `scope` (default `.menu-theme-root`)
 * that uses bg-background / bg-card / text-foreground / border etc. picks it up.
 */
export function menuAccentCss(accent?: string | null, scope = ".menu-theme-root"): string {
  const hsl = accent ? hexToHsl(accent) : null;
  if (!hsl) return "";
  const { h, s, l } = hsl;

  const light = {
    background: triplet(h, clamp(s * 0.5, 12, 42), 97),
    foreground: triplet(h, 25, 12),
    card: triplet(h, 24, 99),
    cardForeground: triplet(h, 25, 12),
    muted: triplet(h, clamp(s * 0.4, 10, 30), 93),
    mutedForeground: triplet(h, 12, 38),
    accent: triplet(h, clamp(s * 0.5, 14, 40), 90),
    accentForeground: triplet(h, 30, 20),
    border: triplet(h, clamp(s * 0.4, 10, 30), 87),
    primary: triplet(h, s, l),
    primaryForeground: readableFg(l),
    ring: triplet(h, s, l)
  };

  const lDark = clamp(l, 45, 68);
  const dark = {
    background: triplet(h, clamp(s * 0.6, 16, 48), 8),
    foreground: triplet(h, 14, 92),
    card: triplet(h, clamp(s * 0.5, 14, 42), 12),
    cardForeground: triplet(h, 14, 92),
    muted: triplet(h, clamp(s * 0.4, 10, 30), 18),
    mutedForeground: triplet(h, 12, 64),
    accent: triplet(h, clamp(s * 0.4, 10, 30), 20),
    accentForeground: triplet(h, 14, 88),
    border: triplet(h, clamp(s * 0.4, 10, 30), 24),
    primary: triplet(h, s, lDark),
    primaryForeground: readableFg(lDark),
    ring: triplet(h, s, lDark)
  };

  const block = (o: typeof light) =>
    `--background:${o.background};--foreground:${o.foreground};` +
    `--card:${o.card};--card-foreground:${o.cardForeground};` +
    `--popover:${o.card};--popover-foreground:${o.cardForeground};` +
    `--muted:${o.muted};--muted-foreground:${o.mutedForeground};` +
    `--accent:${o.accent};--accent-foreground:${o.accentForeground};` +
    `--border:${o.border};--input:${o.border};` +
    `--primary:${o.primary};--primary-foreground:${o.primaryForeground};` +
    `--secondary:${o.primary};--secondary-foreground:${o.primaryForeground};` +
    `--ring:${o.ring};`;

  return `${scope}{${block(light)}}.dark ${scope}{${block(dark)}}`;
}
