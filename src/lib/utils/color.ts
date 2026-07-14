import type { CSSProperties } from "react";
import type { AppearanceSettings } from "@/types/models";

// Theme colors are stored as hex (from the admin color pickers) but the design
// system drives everything through CSS custom properties in the
// `H S% L%` shape consumed by `hsl(var(--token))` (see tailwind config and the
// hard-coded values in welcome-screen.tsx). This converts hex → that triple so a
// cafe's chosen primary/secondary colors can be injected at the menu root.

/** Parse a #rgb or #rrggbb string into 0–255 channels. Returns null if invalid. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

export function hexToRgba(hex: string, alpha: number): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const opacity = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Convert a hex color to a `"H S% L%"` string for use as a CSS variable value,
 * e.g. `hexToHslVar("#0f766e")` → `"174 60% 26%"`. Returns null for invalid
 * input so callers can fall back to the theme default.
 */
export function hexToHslVar(hex: string): string | null {
  const rgb = hexToRgb(hex);
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

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * A readable `"H S% L%"` foreground (near-white or near-black) to pair with a
 * given background hex, chosen by relative luminance. Returns null for invalid
 * input. Used so a cafe's themed primary/secondary keep legible text on top.
 */
export function readableForegroundHslVar(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  // Perceived luminance (sRGB, simple coefficients) 0–255.
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 150 ? "222 47% 11%" : "0 0% 100%";
}

/**
 * Build inline CSS custom properties from a cafe's chosen primary/secondary
 * colors so the whole design system (buttons, pills, accents) picks them up via
 * hsl(var(--token)). Applied on the menu root (and the designer preview).
 * Invalid/blank values are skipped so the theme default stays in effect.
 */
export function menuThemeStyle(appearance?: AppearanceSettings): CSSProperties {
  const style: Record<string, string> = {};
  const primary = appearance?.primaryColor ? hexToHslVar(appearance.primaryColor) : null;
  const secondary = appearance?.secondaryColor ? hexToHslVar(appearance.secondaryColor) : null;
  if (primary && appearance?.primaryColor) {
    style["--primary"] = primary;
    const fg = readableForegroundHslVar(appearance.primaryColor);
    if (fg) style["--primary-foreground"] = fg;
    style["--ring"] = primary;
  }
  if (secondary && appearance?.secondaryColor) {
    style["--secondary"] = secondary;
    const fg = readableForegroundHslVar(appearance.secondaryColor);
    if (fg) style["--secondary-foreground"] = fg;
  }
  return style as CSSProperties;
}
