import type { AppearanceSettings } from "@/types/models";

// A ready-made "whole design" a supervisor can pick when creating a cafe. Unlike
// the Look Presets (applied inside Menu Design), these seed a brand-new cafe's
// appearance up front — colors, cards, layout, backgrounds, fonts, and the
// welcome screen — so every client doesn't start on the same Stone Cafe look.
export type DesignTemplate = {
  id: string;
  name: string;
  blurb: string;
  swatch: [string, string, string];
  patch: Partial<AppearanceSettings>;
};

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "default",
    name: "Default",
    blurb: "Clean, friendly café — the Stone Cafe standard.",
    swatch: ["#3f8a49", "#f59e0b", "#f8fafc"],
    patch: {}
  },
  {
    id: "luxury",
    name: "Luxury",
    blurb: "Editorial luxury layout — champagne gold, serif display, generous space.",
    swatch: ["#9a7b4f", "#c6a46b", "#f7f1e8"],
    patch: {
      menuSkin: "luxury",
      primaryColor: "#9a7b4f",
      secondaryColor: "#c6a46b",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "elevated",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "overline",
      backgroundType: "solid",
      pageSurfaceColor: "#f7f1e8",
      cardSurfaceColor: "#fffcf7",
      fontPreset: "classic",
      pageDensity: "cozy",
      contentWidth: "narrow",
      priceStyle: "large",
      imageAspect: "wide",
      borderRadius: 14,
      navSurface: "muted",
      welcomeAccentColor: "#c6a46b",
      welcomeHeaderTextColor: "#9a7b4f",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#f7f1e8",
      welcomeBackgroundGradientTo: "#e8d9c0",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "rounded",
      welcomeCardWidth: "narrow"
    }
  },
  {
    id: "modern",
    name: "Modern",
    blurb: "Cool minimalist slate & indigo, compact cards.",
    swatch: ["#4f46e5", "#0ea5e9", "#f8fafc"],
    patch: {
      primaryColor: "#4f46e5",
      secondaryColor: "#0ea5e9",
      defaultTheme: "light",
      cardDesign: "compact",
      cardStyle: "flat",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "overline",
      backgroundType: "solid",
      pageSurfaceColor: "#f8fafc",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "compact",
      contentWidth: "normal",
      priceStyle: "plain",
      imageAspect: "square",
      borderRadius: 12,
      navSurface: "solid",
      welcomeAccentColor: "#4f46e5",
      welcomeHeaderTextColor: "#1e293b",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#eef2ff",
      welcomeBackgroundGradientTo: "#e0f2fe",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "rounded",
      welcomeCardWidth: "normal",
      welcomeLanguageStyle: "segmented"
    }
  },
  {
    id: "classic",
    name: "Classic",
    blurb: "Warm traditional café, cream & espresso.",
    swatch: ["#6f4e37", "#c8a165", "#faf4ea"],
    patch: {
      primaryColor: "#6f4e37",
      secondaryColor: "#c8a165",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "outlined",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "banner",
      backgroundType: "solid",
      pageSurfaceColor: "#faf4ea",
      cardSurfaceColor: "#fffdf9",
      fontPreset: "classic",
      pageDensity: "comfortable",
      priceStyle: "badge",
      imageAspect: "wide",
      borderRadius: 12,
      navSurface: "muted",
      welcomeAccentColor: "#6f4e37",
      welcomeHeaderTextColor: "#6f4e37",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#faf4ea",
      welcomeBackgroundGradientTo: "#efe1c9",
      welcomeCardStyle: "solid",
      welcomeEnterStyle: "pill",
      welcomeCardWidth: "normal"
    }
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "Gallery white, quiet type, lots of whitespace.",
    swatch: ["#2f2a26", "#8a8178", "#f8f6f2"],
    patch: {
      primaryColor: "#2f2a26",
      secondaryColor: "#8a8178",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "flat",
      categoryNavStyle: "minimal",
      sectionHeaderStyle: "divider",
      backgroundType: "solid",
      pageSurfaceColor: "#f8f6f2",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "cozy",
      contentWidth: "narrow",
      priceStyle: "plain",
      imageAspect: "square",
      borderRadius: 8,
      navSurface: "transparent",
      welcomeAccentColor: "#2f2a26",
      welcomeHeaderTextColor: "#2f2a26",
      welcomeBackgroundStyle: "solid",
      welcomeBackgroundColor: "#f8f6f2",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "square",
      welcomeCardWidth: "narrow",
      welcomeLanguageStyle: "minimal"
    }
  },
  {
    id: "bold",
    name: "Bold Night",
    blurb: "Dark, high-contrast, photo-forward menu.",
    swatch: ["#f59e0b", "#ef4444", "#0f172a"],
    patch: {
      primaryColor: "#f59e0b",
      secondaryColor: "#ef4444",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "accent",
      backgroundType: "solid",
      pageSurfaceColor: "#0f172a",
      cardSurfaceColor: "#1e293b",
      darkPageSurfaceColor: "#0f172a",
      darkCardSurfaceColor: "#1e293b",
      darkPrimaryColor: "#fbbf24",
      fontPreset: "display",
      pageDensity: "comfortable",
      priceStyle: "large",
      imageAspect: "tall",
      borderRadius: 18,
      navSurface: "tinted",
      welcomeAccentColor: "#f59e0b",
      welcomeHeaderTextColor: "#f8fafc",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#0f172a",
      welcomeBackgroundGradientTo: "#1e293b",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill",
      welcomeCardWidth: "wide"
    }
  }
];
