import type { CSSProperties } from "react";
import type { AppearanceSettings, MenuFontPreset } from "@/types/models";

// Theme colors are stored as hex (from the admin color pickers) but the design
// system drives everything through CSS custom properties in the
// `H S% L%` shape consumed by `hsl(var(--token))` (see tailwind config). This
// converts hex → that triple so configured colors can be injected into a theme.

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

const FONT_PRESETS: Record<MenuFontPreset, { body: string; heading: string }> = {
  brand: {
    body: '"StoneCafeCairo", ui-sans-serif, system-ui, sans-serif',
    heading: '"StoneCafeReadex", "StoneCafeCairo", ui-sans-serif, system-ui, sans-serif'
  },
  modern: {
    body: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  classic: {
    body: 'Georgia, "Times New Roman", "Noto Naskh Arabic", serif',
    heading: 'Georgia, "Times New Roman", "Noto Naskh Arabic", serif'
  },
  soft: {
    body: '"StoneCafeCairo", "Trebuchet MS", "Segoe UI", sans-serif',
    heading: '"StoneCafeReadex", "Trebuchet MS", "Segoe UI", sans-serif'
  },
  display: {
    body: 'ui-sans-serif, system-ui, sans-serif',
    heading: 'Georgia, "Palatino Linotype", "Book Antiqua", Palatino, "Noto Naskh Arabic", serif'
  },
  mono: {
    body: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    heading: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'
  },
  rounded: {
    body: '"Trebuchet MS", "Segoe UI", "StoneCafeCairo", ui-sans-serif, sans-serif',
    heading: '"Trebuchet MS", "Segoe UI", "StoneCafeReadex", ui-sans-serif, sans-serif'
  }
};

const FONT_SCALE: Record<string, string> = {
  sm: "15px",
  md: "16px",
  lg: "17.5px"
};

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
  if (typeof appearance?.borderRadius === "number" && Number.isFinite(appearance.borderRadius)) {
    style["--radius"] = `${Math.max(0, appearance.borderRadius) / 16}rem`;
  }
  if (appearance?.pageSurfaceColor) {
    const page = hexToHslVar(appearance.pageSurfaceColor);
    if (page) style["--background"] = page;
  }
  if (appearance?.cardSurfaceColor) {
    const card = hexToHslVar(appearance.cardSurfaceColor);
    if (card) {
      style["--card"] = card;
      const fg = readableForegroundHslVar(appearance.cardSurfaceColor);
      if (fg) style["--card-foreground"] = fg;
    }
  }
  const fontPreset = (appearance?.fontPreset || appearance?.font || "brand") as MenuFontPreset;
  const fonts = FONT_PRESETS[fontPreset] || FONT_PRESETS.brand;
  style.fontFamily = fonts.body;
  style["--menu-heading-font"] = fonts.heading;
  const scale = appearance?.fontScale ?? "md";
  style.fontSize = FONT_SCALE[scale] || FONT_SCALE.md;
  if (appearance?.headingWeight) {
    const weight =
      appearance.headingWeight === "normal"
        ? "400"
        : appearance.headingWeight === "semibold"
          ? "600"
          : appearance.headingWeight === "extrabold"
            ? "800"
            : "700";
    style["--menu-heading-weight"] = weight;
  }
  return style as CSSProperties;
}

/** Dark-mode surface overrides injected as a scoped style tag on the menu root. */
export function menuDarkThemeCss(appearance?: AppearanceSettings): string | null {
  if (!appearance) return null;
  const rules: string[] = [];
  if (appearance.darkPageSurfaceColor) {
    const page = hexToHslVar(appearance.darkPageSurfaceColor);
    if (page) rules.push(`--background: ${page}`);
  }
  if (appearance.darkCardSurfaceColor) {
    const card = hexToHslVar(appearance.darkCardSurfaceColor);
    if (card) {
      rules.push(`--card: ${card}`);
      const fg = readableForegroundHslVar(appearance.darkCardSurfaceColor);
      if (fg) rules.push(`--card-foreground: ${fg}`);
    }
  }
  if (appearance.darkPrimaryColor) {
    const primary = hexToHslVar(appearance.darkPrimaryColor);
    if (primary) {
      rules.push(`--primary: ${primary}`);
      const fg = readableForegroundHslVar(appearance.darkPrimaryColor);
      if (fg) rules.push(`--primary-foreground: ${fg}`);
      rules.push(`--ring: ${primary}`);
    }
  }
  if (!rules.length) return null;
  return `.dark { ${rules.join("; ")}; }`;
}

/**
 * Full menu theme as a scoped stylesheet (light + dark) for the live menu root.
 * Colors/fonts are emitted as CSS rules — NOT inline styles — so the dark rule
 * `.dark <scope>` can actually override the light `<scope>` values. (Inline
 * custom properties on the menu root would otherwise win over any `.dark {}`
 * rule, which left dark mode only partially applied.) Dark surfaces fall back to
 * sensible defaults whenever the cafe uses custom light surfaces, so toggling
 * dark always darkens the whole menu.
 */
export function menuThemeCss(appearance?: AppearanceSettings, scope = ".menu-theme-root"): string {
  const light: string[] = [];
  const dark: string[] = [];

  if (appearance?.primaryColor) {
    const primary = hexToHslVar(appearance.primaryColor);
    if (primary) {
      light.push(`--primary: ${primary}`);
      const fg = readableForegroundHslVar(appearance.primaryColor);
      if (fg) light.push(`--primary-foreground: ${fg}`);
      light.push(`--ring: ${primary}`);
    }
  }
  if (appearance?.secondaryColor) {
    const secondary = hexToHslVar(appearance.secondaryColor);
    if (secondary) {
      light.push(`--secondary: ${secondary}`);
      const fg = readableForegroundHslVar(appearance.secondaryColor);
      if (fg) light.push(`--secondary-foreground: ${fg}`);
    }
  }
  if (typeof appearance?.borderRadius === "number" && Number.isFinite(appearance.borderRadius)) {
    light.push(`--radius: ${Math.max(0, appearance.borderRadius) / 16}rem`);
  }
  if (appearance?.pageSurfaceColor) {
    const page = hexToHslVar(appearance.pageSurfaceColor);
    if (page) light.push(`--background: ${page}`);
  }
  if (appearance?.cardSurfaceColor) {
    const card = hexToHslVar(appearance.cardSurfaceColor);
    if (card) {
      light.push(`--card: ${card}`);
      const fg = readableForegroundHslVar(appearance.cardSurfaceColor);
      if (fg) light.push(`--card-foreground: ${fg}`);
    }
  }
  const fontPreset = (appearance?.fontPreset || appearance?.font || "brand") as MenuFontPreset;
  const fonts = FONT_PRESETS[fontPreset] || FONT_PRESETS.brand;
  light.push(`font-family: ${fonts.body}`);
  light.push(`--menu-heading-font: ${fonts.heading}`);
  const scale = appearance?.fontScale ?? "md";
  light.push(`font-size: ${FONT_SCALE[scale] || FONT_SCALE.md}`);
  if (appearance?.headingWeight) {
    const weight =
      appearance.headingWeight === "normal"
        ? "400"
        : appearance.headingWeight === "semibold"
          ? "600"
          : appearance.headingWeight === "extrabold"
            ? "800"
            : "700";
    light.push(`--menu-heading-weight: ${weight}`);
  }

  const darkPageHex = appearance?.darkPageSurfaceColor || (appearance?.pageSurfaceColor ? "#0f172a" : undefined);
  if (darkPageHex) {
    const page = hexToHslVar(darkPageHex);
    if (page) dark.push(`--background: ${page}`);
  }
  const darkCardHex = appearance?.darkCardSurfaceColor || (appearance?.cardSurfaceColor ? "#1e293b" : undefined);
  if (darkCardHex) {
    const card = hexToHslVar(darkCardHex);
    if (card) {
      dark.push(`--card: ${card}`);
      const fg = readableForegroundHslVar(darkCardHex);
      if (fg) dark.push(`--card-foreground: ${fg}`);
    }
  }
  const darkPrimaryHex = appearance?.darkPrimaryColor || appearance?.primaryColor;
  if (darkPrimaryHex) {
    const primary = hexToHslVar(darkPrimaryHex);
    if (primary) {
      dark.push(`--primary: ${primary}`);
      const fg = readableForegroundHslVar(darkPrimaryHex);
      if (fg) dark.push(`--primary-foreground: ${fg}`);
      dark.push(`--ring: ${primary}`);
    }
  }

  const blocks: string[] = [];
  if (light.length) blocks.push(`${scope} { ${light.join("; ")}; }`);
  if (dark.length) blocks.push(`.dark ${scope} { ${dark.join("; ")}; }`);
  return blocks.join("\n");
}

export function menuHeadingFontStyle(appearance?: AppearanceSettings): CSSProperties {
  const fontPreset = (appearance?.fontPreset || appearance?.font || "brand") as MenuFontPreset;
  const fonts = FONT_PRESETS[fontPreset] || FONT_PRESETS.brand;
  return { fontFamily: fonts.heading };
}
