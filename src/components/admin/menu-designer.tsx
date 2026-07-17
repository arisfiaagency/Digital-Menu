"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/forms/image-upload-field";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { cn } from "@/lib/utils/cn";
import { hexToRgba, menuThemeStyle, readableForegroundHslVar } from "@/lib/utils/color";
import { getAdminAppData, listClients, saveSettings } from "@/lib/firebase/firestore";
import { setActiveClientSlug } from "@/lib/tenant";
import { defaultAppearanceSettings, defaultGeneralSettings, defaultMenuItems, defaultMenuSettings } from "@/data/default-data";
import { localeLabels } from "@/lib/i18n/config";
import {
  CARD_PATTERN_SELECT_OPTIONS,
  cssPatternStyle,
  isFloatingIconPattern,
  PATTERN_SELECT_OPTIONS
} from "@/lib/menu-patterns";
import type { AppearanceSettings, ClientAccount, GeneralSettings, Locale, MenuSettings } from "@/types/models";

const MENU_SETTING_LABELS: Record<string, string> = {
  showImages: "Show item photos",
  showPrices: "Show prices & cart",
  showCalories: "Show calories",
  showIngredients: "Show ingredients",
  showAllergens: "Show allergens",
  showSoldOutItems: "Show sold-out items",
  enableSearch: "Enable search bar",
  enableDarkMode: "Enable dark mode"
};

const ALL_LOCALES: Locale[] = ["ckb", "ar", "en"];
const CURRENCIES = ["IQD", "USD", "EUR", "TRY"] as const;

type LookPreset = {
  id: string;
  name: string;
  blurb: string;
  swatch: [string, string, string];
  patch: Partial<AppearanceSettings>;
};

const LOOK_PRESETS: LookPreset[] = [
  {
    id: "champagne-gold",
    name: "Champagne Gold",
    blurb: "Warm cream & brushed gold",
    swatch: ["#9a7b4f", "#c6a46b", "#f7f1e8"],
    patch: {
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
    id: "noir-velvet",
    name: "Noir Velvet",
    blurb: "Black-tie evening menu",
    swatch: ["#d4af37", "#f5e6c8", "#0b0b0d"],
    patch: {
      primaryColor: "#d4af37",
      secondaryColor: "#f5e6c8",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "accent",
      backgroundType: "solid",
      pageSurfaceColor: "#0b0b0d",
      cardSurfaceColor: "#161618",
      fontPreset: "classic",
      pageDensity: "cozy",
      contentWidth: "narrow",
      priceStyle: "large",
      imageAspect: "tall",
      borderRadius: 10,
      navSurface: "solid",
      sectionTitleCase: "uppercase",
      welcomeAccentColor: "#d4af37",
      welcomeHeaderTextColor: "#d4af37",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#0b0b0d",
      welcomeBackgroundGradientTo: "#1a1612",
      welcomeCardStyle: "outlined",
      welcomeFormBorderColor: "#d4af37",
      welcomeEnterStyle: "outline",
      welcomeCardWidth: "narrow"
    }
  },
  {
    id: "emerald-atelier",
    name: "Emerald Atelier",
    blurb: "Deep jewel green, quiet luxury",
    swatch: ["#0f5c4c", "#c2a878", "#f3f7f5"],
    patch: {
      primaryColor: "#0f5c4c",
      secondaryColor: "#c2a878",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "outlined",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "boxed",
      backgroundType: "gradient",
      backgroundGradientFrom: "#f3f7f5",
      backgroundGradientTo: "#e7efeb",
      pageSurfaceColor: "#f3f7f5",
      cardSurfaceColor: "#ffffff",
      fontPreset: "brand",
      pageDensity: "comfortable",
      priceStyle: "badge",
      borderRadius: 16,
      navSurface: "tinted",
      welcomeAccentColor: "#0f5c4c",
      welcomeHeaderTextColor: "#0f5c4c",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#e7efeb",
      welcomeBackgroundGradientTo: "#cfe0d8",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill",
      welcomeCardWidth: "normal"
    }
  },
  {
    id: "ivory-marble",
    name: "Ivory Marble",
    blurb: "Gallery-white with soft charcoal",
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
    id: "rose-quartz",
    name: "Rose Quartz",
    blurb: "Blush silk & soft gold",
    swatch: ["#b76e79", "#d4af87", "#fbf4f5"],
    patch: {
      primaryColor: "#b76e79",
      secondaryColor: "#d4af87",
      defaultTheme: "light",
      cardDesign: "poster",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "centered",
      backgroundType: "gradient",
      backgroundGradientFrom: "#fbf4f5",
      backgroundGradientTo: "#f3e7e0",
      pageSurfaceColor: "#fbf4f5",
      cardSurfaceColor: "#fffafb",
      fontPreset: "soft",
      pageDensity: "comfortable",
      itemColumns: "2",
      priceStyle: "badge",
      imageAspect: "tall",
      borderRadius: 22,
      welcomeAccentColor: "#b76e79",
      welcomeHeaderTextColor: "#b76e79",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#fbf4f5",
      welcomeBackgroundGradientTo: "#ead5cf",
      welcomeCardStyle: "floating",
      welcomeLanguageStyle: "cards",
      welcomeEnterStyle: "pill",
      welcomeCardWidth: "normal"
    }
  },
  {
    id: "sapphire-lounge",
    name: "Sapphire Lounge",
    blurb: "Deep navy with champagne light",
    swatch: ["#1e3a5f", "#c9a227", "#0f172a"],
    patch: {
      primaryColor: "#c9a227",
      secondaryColor: "#7dd3fc",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "banner",
      backgroundType: "gradient",
      backgroundGradientFrom: "#0f172a",
      backgroundGradientTo: "#1e3a5f",
      pageSurfaceColor: "#0f172a",
      cardSurfaceColor: "#152238",
      fontPreset: "classic",
      pageDensity: "cozy",
      priceStyle: "large",
      imageAspect: "wide",
      borderRadius: 12,
      navSurface: "tinted",
      welcomeAccentColor: "#c9a227",
      welcomeHeaderTextColor: "#c9a227",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#0f172a",
      welcomeBackgroundGradientTo: "#1e3a5f",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "outline",
      welcomeCardWidth: "normal"
    }
  },
  {
    id: "obsidian-copper",
    name: "Obsidian Copper",
    blurb: "Dark stone & molten copper",
    swatch: ["#b87333", "#e8c4a0", "#141210"],
    patch: {
      primaryColor: "#b87333",
      secondaryColor: "#e8c4a0",
      defaultTheme: "dark",
      cardDesign: "compact",
      cardStyle: "outlined",
      categoryNavStyle: "cards",
      sectionHeaderStyle: "accent",
      backgroundType: "solid",
      pageSurfaceColor: "#141210",
      cardSurfaceColor: "#1f1b17",
      fontPreset: "classic",
      pageDensity: "comfortable",
      priceStyle: "badge",
      borderRadius: 12,
      navSurface: "muted",
      welcomeAccentColor: "#b87333",
      welcomeHeaderTextColor: "#e8c4a0",
      welcomeBackgroundStyle: "solid",
      welcomeBackgroundColor: "#141210",
      welcomeCardStyle: "solid",
      welcomeEnterStyle: "rounded",
      welcomeCardAlign: "bottom"
    }
  },
  {
    id: "olive-estate",
    name: "Olive Estate",
    blurb: "Mediterranean villa calm",
    swatch: ["#5c6b4a", "#c4a882", "#f4f0e6"],
    patch: {
      primaryColor: "#5c6b4a",
      secondaryColor: "#c4a882",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "outlined",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "plain",
      backgroundType: "solid",
      pageSurfaceColor: "#f4f0e6",
      cardSurfaceColor: "#fffcf5",
      fontPreset: "classic",
      pageDensity: "cozy",
      contentWidth: "normal",
      priceStyle: "plain",
      imageAspect: "square",
      borderRadius: 10,
      navSurface: "muted",
      welcomeAccentColor: "#5c6b4a",
      welcomeHeaderTextColor: "#5c6b4a",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f4f0e6",
      welcomeBackgroundPattern: "dots",
      welcomeBackgroundPatternColor: "#5c6b4a",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "square",
      welcomeCardWidth: "narrow"
    }
  },
  {
    id: "plum-opera",
    name: "Plum Opera",
    blurb: "Velvet plum & antique gold",
    swatch: ["#5b2c6f", "#d4af37", "#1a1020"],
    patch: {
      primaryColor: "#5b2c6f",
      secondaryColor: "#d4af37",
      defaultTheme: "dark",
      cardDesign: "poster",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "numbered",
      backgroundType: "gradient",
      backgroundGradientFrom: "#1a1020",
      backgroundGradientTo: "#2d1b3d",
      pageSurfaceColor: "#1a1020",
      cardSurfaceColor: "#241530",
      fontPreset: "soft",
      pageDensity: "comfortable",
      itemColumns: "2",
      priceStyle: "large",
      imageAspect: "tall",
      borderRadius: 18,
      sectionTitleCase: "uppercase",
      welcomeAccentColor: "#d4af37",
      welcomeHeaderTextColor: "#d4af37",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#1a1020",
      welcomeBackgroundGradientTo: "#5b2c6f",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "rounded",
      welcomeCardWidth: "wide"
    }
  },
  {
    id: "arctic-porcelain",
    name: "Arctic Porcelain",
    blurb: "Cool white, silver & ice blue",
    swatch: ["#3d5a80", "#98c1d9", "#f7f9fb"],
    patch: {
      primaryColor: "#3d5a80",
      secondaryColor: "#98c1d9",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "outlined",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "boxed",
      backgroundType: "solid",
      pageSurfaceColor: "#f7f9fb",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "compact",
      contentWidth: "wide",
      priceStyle: "badge",
      borderRadius: 14,
      navSurface: "solid",
      welcomeAccentColor: "#3d5a80",
      welcomeHeaderTextColor: "#3d5a80",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#f7f9fb",
      welcomeBackgroundGradientTo: "#d6e6f0",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "outline",
      welcomeLanguageStyle: "segmented"
    }
  },
  {
    id: "matcha-maison",
    name: "Matcha Maison",
    blurb: "Quiet green tea & linen",
    swatch: ["#6b8f71", "#c9b79c", "#f5f3ea"],
    patch: {
      primaryColor: "#6b8f71",
      secondaryColor: "#c9b79c",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "flat",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "overline",
      backgroundType: "gradient",
      backgroundGradientFrom: "#f5f3ea",
      backgroundGradientTo: "#e8efe6",
      pageSurfaceColor: "#f5f3ea",
      cardSurfaceColor: "#fffcf7",
      fontPreset: "soft",
      pageDensity: "cozy",
      priceStyle: "plain",
      imageAspect: "wide",
      borderRadius: 16,
      navSurface: "muted",
      welcomeAccentColor: "#6b8f71",
      welcomeHeaderTextColor: "#6b8f71",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#f5f3ea",
      welcomeBackgroundGradientTo: "#d7e4d6",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill",
      welcomeCardWidth: "normal"
    }
  },
  {
    id: "terracotta-villa",
    name: "Terracotta Villa",
    blurb: "Sun-washed clay & stone",
    swatch: ["#9c5a3c", "#d8b48a", "#f6efe6"],
    patch: {
      primaryColor: "#9c5a3c",
      secondaryColor: "#d8b48a",
      defaultTheme: "light",
      cardDesign: "compact",
      cardStyle: "elevated",
      categoryNavStyle: "cards",
      sectionHeaderStyle: "accent",
      backgroundType: "solid",
      pageSurfaceColor: "#f6efe6",
      cardSurfaceColor: "#fffaf3",
      fontPreset: "classic",
      pageDensity: "comfortable",
      priceStyle: "badge",
      imageAspect: "square",
      borderRadius: 12,
      navSurface: "muted",
      welcomeAccentColor: "#9c5a3c",
      welcomeHeaderTextColor: "#9c5a3c",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f6efe6",
      welcomeBackgroundPattern: "waves",
      welcomeBackgroundPatternColor: "#9c5a3c",
      welcomeCardStyle: "solid",
      welcomeEnterStyle: "rounded",
      welcomeCardWidth: "narrow"
    }
  },
  {
    id: "onyx-pearl",
    name: "Onyx & Pearl",
    blurb: "High-contrast monochrome luxury",
    swatch: ["#111111", "#ececec", "#fafafa"],
    patch: {
      primaryColor: "#111111",
      secondaryColor: "#6b7280",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "outlined",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "divider",
      backgroundType: "solid",
      pageSurfaceColor: "#fafafa",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "cozy",
      contentWidth: "narrow",
      priceStyle: "large",
      borderRadius: 6,
      navSurface: "transparent",
      sectionTitleCase: "uppercase",
      showCategoryIcons: false,
      welcomeAccentColor: "#111111",
      welcomeHeaderTextColor: "#111111",
      welcomeBackgroundStyle: "solid",
      welcomeBackgroundColor: "#fafafa",
      welcomeCardStyle: "outlined",
      welcomeFormBorderColor: "#111111",
      welcomeEnterStyle: "square",
      welcomeLanguageStyle: "minimal",
      welcomeCardWidth: "narrow"
    }
  },
  {
    id: "bordeaux-silk",
    name: "Bordeaux Silk",
    blurb: "Wine red & candlelight cream",
    swatch: ["#722f37", "#e8d5b7", "#1a0f10"],
    patch: {
      primaryColor: "#722f37",
      secondaryColor: "#e8d5b7",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "iconOnly",
      sectionHeaderStyle: "banner",
      backgroundType: "solid",
      pageSurfaceColor: "#1a0f10",
      cardSurfaceColor: "#251618",
      fontPreset: "classic",
      pageDensity: "cozy",
      priceStyle: "large",
      imageAspect: "tall",
      borderRadius: 14,
      navSurface: "solid",
      welcomeAccentColor: "#e8d5b7",
      welcomeHeaderTextColor: "#e8d5b7",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#1a0f10",
      welcomeBackgroundGradientTo: "#722f37",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "outline",
      welcomeCardAlign: "center",
      welcomeCardWidth: "normal"
    }
  },
  {
    id: "lavender-atelier",
    name: "Lavender Atelier",
    blurb: "Soft lilac & silver mist",
    swatch: ["#7c6a9a", "#c4b5d4", "#f6f3f9"],
    patch: {
      primaryColor: "#7c6a9a",
      secondaryColor: "#c4b5d4",
      defaultTheme: "light",
      cardDesign: "poster",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "centered",
      backgroundType: "pattern",
      backgroundColor: "#f6f3f9",
      backgroundPattern: "sparkles",
      backgroundPatternColor: "#7c6a9a",
      pageSurfaceColor: "#f6f3f9",
      cardSurfaceColor: "#fffcfe",
      fontPreset: "soft",
      pageDensity: "comfortable",
      priceStyle: "badge",
      borderRadius: 20,
      welcomeAccentColor: "#7c6a9a",
      welcomeHeaderTextColor: "#7c6a9a",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f6f3f9",
      welcomeBackgroundPattern: "hearts",
      welcomeBackgroundPatternColor: "#7c6a9a",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "amber-hearth",
    name: "Amber Hearth",
    blurb: "Firelight amber & walnut",
    swatch: ["#b45309", "#f59e0b", "#1c1410"],
    patch: {
      primaryColor: "#b45309",
      secondaryColor: "#f59e0b",
      defaultTheme: "dark",
      cardDesign: "classic",
      cardStyle: "elevated",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "accent",
      backgroundType: "pattern",
      backgroundColor: "#1c1410",
      backgroundPattern: "beans",
      backgroundPatternColor: "#f59e0b",
      pageSurfaceColor: "#1c1410",
      cardSurfaceColor: "#271c16",
      fontPreset: "classic",
      pageDensity: "cozy",
      priceStyle: "large",
      borderRadius: 12,
      welcomeAccentColor: "#f59e0b",
      welcomeHeaderTextColor: "#f59e0b",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#1c1410",
      welcomeBackgroundGradientTo: "#3b2415",
      welcomeBackgroundPattern: "cafe",
      welcomeBackgroundPatternColor: "#f59e0b",
      welcomeCardStyle: "solid",
      welcomeEnterStyle: "rounded"
    }
  },
  {
    id: "seafoam-coast",
    name: "Seafoam Coast",
    blurb: "Ocean mist & driftwood",
    swatch: ["#0d9488", "#99f6e4", "#f0fdfa"],
    patch: {
      primaryColor: "#0d9488",
      secondaryColor: "#5eead4",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "outlined",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "overline",
      backgroundType: "pattern",
      backgroundColor: "#f0fdfa",
      backgroundPattern: "waves",
      backgroundPatternColor: "#0d9488",
      pageSurfaceColor: "#f0fdfa",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "comfortable",
      priceStyle: "plain",
      borderRadius: 16,
      welcomeAccentColor: "#0d9488",
      welcomeHeaderTextColor: "#0d9488",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f0fdfa",
      welcomeBackgroundPattern: "bubbles",
      welcomeBackgroundPatternColor: "#0d9488",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "ink-indigo",
    name: "Ink Indigo",
    blurb: "Deep indigo & moon silver",
    swatch: ["#312e81", "#a5b4fc", "#0b1026"],
    patch: {
      primaryColor: "#a5b4fc",
      secondaryColor: "#818cf8",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "banner",
      backgroundType: "pattern",
      backgroundColor: "#0b1026",
      backgroundPattern: "stars",
      backgroundPatternColor: "#a5b4fc",
      pageSurfaceColor: "#0b1026",
      cardSurfaceColor: "#151a33",
      fontPreset: "modern",
      pageDensity: "cozy",
      priceStyle: "badge",
      imageAspect: "wide",
      borderRadius: 10,
      welcomeAccentColor: "#a5b4fc",
      welcomeHeaderTextColor: "#a5b4fc",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#0b1026",
      welcomeBackgroundGradientTo: "#312e81",
      welcomeBackgroundPattern: "sparkles",
      welcomeBackgroundPatternColor: "#a5b4fc",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "outline"
    }
  },
  {
    id: "citrus-grove",
    name: "Citrus Grove",
    blurb: "Sunlit lemon & orchard green",
    swatch: ["#65a30d", "#facc15", "#fefce8"],
    patch: {
      primaryColor: "#65a30d",
      secondaryColor: "#facc15",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "elevated",
      categoryNavStyle: "cards",
      sectionHeaderStyle: "boxed",
      backgroundType: "pattern",
      backgroundColor: "#fefce8",
      backgroundPattern: "leaves",
      backgroundPatternColor: "#65a30d",
      pageSurfaceColor: "#fefce8",
      cardSurfaceColor: "#fffef5",
      fontPreset: "brand",
      pageDensity: "comfortable",
      priceStyle: "badge",
      borderRadius: 18,
      welcomeAccentColor: "#65a30d",
      welcomeHeaderTextColor: "#65a30d",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#fefce8",
      welcomeBackgroundPattern: "mixed",
      welcomeBackgroundPatternColor: "#65a30d",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "rounded"
    }
  },
  {
    id: "graphite-studio",
    name: "Graphite Studio",
    blurb: "Architect gray & concrete",
    swatch: ["#52525b", "#a1a1aa", "#f4f4f5"],
    patch: {
      primaryColor: "#52525b",
      secondaryColor: "#a1a1aa",
      defaultTheme: "light",
      cardDesign: "compact",
      cardStyle: "flat",
      categoryNavStyle: "minimal",
      sectionHeaderStyle: "divider",
      backgroundType: "pattern",
      backgroundColor: "#f4f4f5",
      backgroundPattern: "grid",
      backgroundPatternColor: "#52525b",
      pageSurfaceColor: "#f4f4f5",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "compact",
      contentWidth: "wide",
      priceStyle: "plain",
      borderRadius: 4,
      showCategoryIcons: false,
      welcomeAccentColor: "#52525b",
      welcomeHeaderTextColor: "#52525b",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f4f4f5",
      welcomeBackgroundPattern: "crosshatch",
      welcomeBackgroundPatternColor: "#52525b",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "square",
      welcomeLanguageStyle: "minimal"
    }
  },
  {
    id: "mocha-silk",
    name: "Mocha Silk",
    blurb: "Espresso brown & latte foam",
    swatch: ["#78350f", "#d6a77a", "#faf6f1"],
    patch: {
      primaryColor: "#78350f",
      secondaryColor: "#d6a77a",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "outlined",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "plain",
      backgroundType: "pattern",
      backgroundColor: "#faf6f1",
      backgroundPattern: "cafe",
      backgroundPatternColor: "#78350f",
      pageSurfaceColor: "#faf6f1",
      cardSurfaceColor: "#fffdf9",
      fontPreset: "classic",
      pageDensity: "cozy",
      priceStyle: "large",
      borderRadius: 14,
      welcomeAccentColor: "#78350f",
      welcomeHeaderTextColor: "#78350f",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#faf6f1",
      welcomeBackgroundPattern: "beans",
      welcomeBackgroundPatternColor: "#78350f",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "midnight-jade",
    name: "Midnight Jade",
    blurb: "Forest night & jade glow",
    swatch: ["#064e3b", "#34d399", "#022c22"],
    patch: {
      primaryColor: "#34d399",
      secondaryColor: "#6ee7b7",
      defaultTheme: "dark",
      cardDesign: "poster",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "numbered",
      backgroundType: "pattern",
      backgroundColor: "#022c22",
      backgroundPattern: "leaves",
      backgroundPatternColor: "#34d399",
      pageSurfaceColor: "#022c22",
      cardSurfaceColor: "#0a3d32",
      fontPreset: "soft",
      pageDensity: "comfortable",
      priceStyle: "badge",
      imageAspect: "tall",
      borderRadius: 16,
      welcomeAccentColor: "#34d399",
      welcomeHeaderTextColor: "#34d399",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#022c22",
      welcomeBackgroundGradientTo: "#064e3b",
      welcomeBackgroundPattern: "dessert",
      welcomeBackgroundPatternColor: "#34d399",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "outline"
    }
  },
  {
    id: "blush-linen",
    name: "Blush Linen",
    blurb: "Powder peach & warm linen",
    swatch: ["#e11d48", "#fda4af", "#fff1f2"],
    patch: {
      primaryColor: "#e11d48",
      secondaryColor: "#fda4af",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "elevated",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "centered",
      backgroundType: "pattern",
      backgroundColor: "#fff1f2",
      backgroundPattern: "hearts",
      backgroundPatternColor: "#e11d48",
      pageSurfaceColor: "#fff1f2",
      cardSurfaceColor: "#fffafa",
      fontPreset: "soft",
      pageDensity: "comfortable",
      itemColumns: "2",
      priceStyle: "badge",
      borderRadius: 22,
      welcomeAccentColor: "#e11d48",
      welcomeHeaderTextColor: "#e11d48",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#fff1f2",
      welcomeBackgroundPattern: "polka",
      welcomeBackgroundPatternColor: "#e11d48",
      welcomeCardStyle: "floating",
      welcomeLanguageStyle: "cards",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    blurb: "Sunset honey & warm dusk",
    swatch: ["#c2410c", "#fbbf24", "#fff7ed"],
    patch: {
      primaryColor: "#c2410c",
      secondaryColor: "#fbbf24",
      defaultTheme: "light",
      cardDesign: "poster",
      cardStyle: "elevated",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "banner",
      backgroundType: "gradient",
      backgroundGradientFrom: "#fff7ed",
      backgroundGradientTo: "#ffedd5",
      pageSurfaceColor: "#fff7ed",
      cardSurfaceColor: "#fffbeb",
      fontPreset: "display",
      pageDensity: "cozy",
      priceStyle: "large",
      imageAspect: "tall",
      borderRadius: 16,
      cardHover: "glow",
      welcomeAccentColor: "#c2410c",
      welcomeHeaderTextColor: "#c2410c",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#fff7ed",
      welcomeBackgroundGradientTo: "#fdba74",
      welcomeBackgroundPattern: "sparkles",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "slate-atelier",
    name: "Slate Atelier",
    blurb: "Cool stone & steel blue",
    swatch: ["#334155", "#94a3b8", "#f1f5f9"],
    patch: {
      primaryColor: "#334155",
      secondaryColor: "#94a3b8",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "outlined",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "divider",
      backgroundType: "pattern",
      backgroundColor: "#f1f5f9",
      backgroundPattern: "grid",
      backgroundPatternColor: "#64748b",
      pageSurfaceColor: "#f1f5f9",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "compact",
      contentWidth: "wide",
      priceStyle: "tag",
      borderRadius: 6,
      cardHover: "border",
      showCategoryIcons: false,
      welcomeAccentColor: "#334155",
      welcomeHeaderTextColor: "#334155",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f1f5f9",
      welcomeBackgroundPattern: "crosshatch",
      welcomeBackgroundPatternColor: "#64748b",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "square",
      welcomeLanguageStyle: "minimal"
    }
  },
  {
    id: "orchid-night",
    name: "Orchid Night",
    blurb: "Deep violet & orchid glow",
    swatch: ["#7e22ce", "#e9d5ff", "#1e1033"],
    patch: {
      primaryColor: "#c084fc",
      secondaryColor: "#e9d5ff",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "numbered",
      backgroundType: "pattern",
      backgroundColor: "#1e1033",
      backgroundPattern: "sparkles",
      backgroundPatternColor: "#c084fc",
      pageSurfaceColor: "#1e1033",
      cardSurfaceColor: "#2a1748",
      darkPageSurfaceColor: "#1e1033",
      darkCardSurfaceColor: "#2a1748",
      darkPrimaryColor: "#c084fc",
      fontPreset: "soft",
      pageDensity: "comfortable",
      priceStyle: "badge",
      imageAspect: "tall",
      borderRadius: 20,
      cardHover: "glow",
      welcomeAccentColor: "#c084fc",
      welcomeHeaderTextColor: "#e9d5ff",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#1e1033",
      welcomeBackgroundGradientTo: "#7e22ce",
      welcomeBackgroundPattern: "stars",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "outline"
    }
  },
  {
    id: "coastal-linen",
    name: "Coastal Linen",
    blurb: "Sea breeze & sand linen",
    swatch: ["#0284c7", "#bae6fd", "#f0f9ff"],
    patch: {
      primaryColor: "#0284c7",
      secondaryColor: "#38bdf8",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "outlined",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "overline",
      backgroundType: "pattern",
      backgroundColor: "#f0f9ff",
      backgroundPattern: "waves",
      backgroundPatternColor: "#0284c7",
      pageSurfaceColor: "#f0f9ff",
      cardSurfaceColor: "#ffffff",
      fontPreset: "rounded",
      pageDensity: "comfortable",
      priceStyle: "plain",
      borderRadius: 14,
      welcomeAccentColor: "#0284c7",
      welcomeHeaderTextColor: "#0284c7",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f0f9ff",
      welcomeBackgroundPattern: "bubbles",
      welcomeBackgroundPatternColor: "#0284c7",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill",
      welcomeLanguageStyle: "segmented"
    }
  },
  {
    id: "espresso-noir",
    name: "Espresso Noir",
    blurb: "Roasted black & cream foam",
    swatch: ["#a16207", "#fef3c7", "#0c0a09"],
    patch: {
      primaryColor: "#a16207",
      secondaryColor: "#fef3c7",
      defaultTheme: "dark",
      cardDesign: "compact",
      cardStyle: "outlined",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "accent",
      backgroundType: "pattern",
      backgroundColor: "#0c0a09",
      backgroundPattern: "beans",
      backgroundPatternColor: "#a16207",
      pageSurfaceColor: "#0c0a09",
      cardSurfaceColor: "#1c1917",
      darkPageSurfaceColor: "#0c0a09",
      darkCardSurfaceColor: "#1c1917",
      darkPrimaryColor: "#eab308",
      fontPreset: "classic",
      pageDensity: "cozy",
      priceStyle: "large",
      borderRadius: 10,
      menuLanguageStyle: "globe",
      welcomeAccentColor: "#eab308",
      welcomeHeaderTextColor: "#fef3c7",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#0c0a09",
      welcomeBackgroundPattern: "cafe",
      welcomeBackgroundPatternColor: "#a16207",
      welcomeCardStyle: "solid",
      welcomeEnterStyle: "rounded"
    }
  },
  {
    id: "sakura-mist",
    name: "Sakura Mist",
    blurb: "Cherry blossom & soft mist",
    swatch: ["#db2777", "#fbcfe8", "#fdf2f8"],
    patch: {
      primaryColor: "#db2777",
      secondaryColor: "#f9a8d4",
      defaultTheme: "light",
      cardDesign: "poster",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "centered",
      backgroundType: "pattern",
      backgroundColor: "#fdf2f8",
      backgroundPattern: "leaves",
      backgroundPatternColor: "#db2777",
      pageSurfaceColor: "#fdf2f8",
      cardSurfaceColor: "#fff7fb",
      fontPreset: "soft",
      pageDensity: "comfortable",
      itemColumns: "2",
      priceStyle: "badge",
      imageAspect: "square",
      borderRadius: 24,
      cardHover: "lift",
      welcomeAccentColor: "#db2777",
      welcomeHeaderTextColor: "#db2777",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#fdf2f8",
      welcomeBackgroundGradientTo: "#fbcfe8",
      welcomeBackgroundPattern: "hearts",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "pill",
      welcomeLanguageStyle: "cards"
    }
  },
  {
    id: "forest-lodge",
    name: "Forest Lodge",
    blurb: "Pine cabin & moss green",
    swatch: ["#166534", "#86efac", "#f0fdf4"],
    patch: {
      primaryColor: "#166534",
      secondaryColor: "#4ade80",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "elevated",
      categoryNavStyle: "cards",
      sectionHeaderStyle: "boxed",
      backgroundType: "pattern",
      backgroundColor: "#f0fdf4",
      backgroundPattern: "leaves",
      backgroundPatternColor: "#166534",
      pageSurfaceColor: "#f0fdf4",
      cardSurfaceColor: "#ffffff",
      fontPreset: "brand",
      pageDensity: "cozy",
      priceStyle: "badge",
      borderRadius: 12,
      navSurface: "muted",
      welcomeAccentColor: "#166534",
      welcomeHeaderTextColor: "#166534",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f0fdf4",
      welcomeBackgroundPattern: "mixed",
      welcomeBackgroundPatternColor: "#166534",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "rounded"
    }
  },
  {
    id: "neon-bistro",
    name: "Neon Bistro",
    blurb: "Night market neon pink",
    swatch: ["#f43f5e", "#22d3ee", "#0a0a0a"],
    patch: {
      primaryColor: "#f43f5e",
      secondaryColor: "#22d3ee",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "iconOnly",
      sectionHeaderStyle: "banner",
      backgroundType: "pattern",
      backgroundColor: "#0a0a0a",
      backgroundPattern: "circuit",
      backgroundPatternColor: "#f43f5e",
      pageSurfaceColor: "#0a0a0a",
      cardSurfaceColor: "#171717",
      darkPageSurfaceColor: "#0a0a0a",
      darkCardSurfaceColor: "#171717",
      darkPrimaryColor: "#fb7185",
      fontPreset: "mono",
      pageDensity: "compact",
      priceStyle: "tag",
      imageAspect: "wide",
      borderRadius: 4,
      cardHover: "glow",
      sectionTitleCase: "uppercase",
      welcomeAccentColor: "#22d3ee",
      welcomeHeaderTextColor: "#f43f5e",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#0a0a0a",
      welcomeBackgroundGradientTo: "#3f0a14",
      welcomeBackgroundPattern: "confetti",
      welcomeCardStyle: "outlined",
      welcomeFormBorderColor: "#22d3ee",
      welcomeEnterStyle: "outline"
    }
  },
  {
    id: "vanilla-bean",
    name: "Vanilla Bean",
    blurb: "Cream vanilla & soft cocoa",
    swatch: ["#92400e", "#fde68a", "#fffbeb"],
    patch: {
      primaryColor: "#92400e",
      secondaryColor: "#f59e0b",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "flat",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "plain",
      backgroundType: "pattern",
      backgroundColor: "#fffbeb",
      backgroundPattern: "cafe",
      backgroundPatternColor: "#92400e",
      pageSurfaceColor: "#fffbeb",
      cardSurfaceColor: "#fffef7",
      fontPreset: "classic",
      pageDensity: "cozy",
      priceStyle: "plain",
      borderRadius: 16,
      welcomeAccentColor: "#92400e",
      welcomeHeaderTextColor: "#92400e",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#fffbeb",
      welcomeBackgroundPattern: "bakery",
      welcomeBackgroundPatternColor: "#92400e",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "azure-palace",
    name: "Azure Palace",
    blurb: "Royal blue & pearl white",
    swatch: ["#1d4ed8", "#93c5fd", "#eff6ff"],
    patch: {
      primaryColor: "#1d4ed8",
      secondaryColor: "#60a5fa",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "elevated",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "boxed",
      backgroundType: "solid",
      pageSurfaceColor: "#eff6ff",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "comfortable",
      contentWidth: "narrow",
      priceStyle: "large",
      borderRadius: 12,
      navSurface: "tinted",
      welcomeAccentColor: "#1d4ed8",
      welcomeHeaderTextColor: "#1d4ed8",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#eff6ff",
      welcomeBackgroundGradientTo: "#bfdbfe",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "outline",
      welcomeLanguageStyle: "segmented"
    }
  },
  {
    id: "charcoal-ember",
    name: "Charcoal Ember",
    blurb: "Ash charcoal & hot ember",
    swatch: ["#ea580c", "#fdba74", "#18181b"],
    patch: {
      primaryColor: "#ea580c",
      secondaryColor: "#fdba74",
      defaultTheme: "dark",
      cardDesign: "poster",
      cardStyle: "elevated",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "accent",
      backgroundType: "gradient",
      backgroundGradientFrom: "#18181b",
      backgroundGradientTo: "#27272a",
      pageSurfaceColor: "#18181b",
      cardSurfaceColor: "#27272a",
      darkPageSurfaceColor: "#18181b",
      darkCardSurfaceColor: "#27272a",
      darkPrimaryColor: "#fb923c",
      fontPreset: "display",
      pageDensity: "cozy",
      priceStyle: "badge",
      imageAspect: "tall",
      borderRadius: 8,
      headerShowGlow: true,
      welcomeAccentColor: "#fb923c",
      welcomeHeaderTextColor: "#fdba74",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#18181b",
      welcomeBackgroundGradientTo: "#7c2d12",
      welcomeBackgroundPattern: "utensils",
      welcomeCardStyle: "solid",
      welcomeEnterStyle: "rounded",
      welcomeCardAlign: "bottom"
    }
  },
  {
    id: "mint-gelato",
    name: "Mint Gelato",
    blurb: "Cool mint & ice cream pink",
    swatch: ["#0d9488", "#f9a8d4", "#ecfdf5"],
    patch: {
      primaryColor: "#0d9488",
      secondaryColor: "#f472b6",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "elevated",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "centered",
      backgroundType: "pattern",
      backgroundColor: "#ecfdf5",
      backgroundPattern: "dessert",
      backgroundPatternColor: "#0d9488",
      pageSurfaceColor: "#ecfdf5",
      cardSurfaceColor: "#ffffff",
      fontPreset: "rounded",
      pageDensity: "comfortable",
      itemColumns: "2",
      priceStyle: "badge",
      borderRadius: 20,
      cardHover: "lift",
      welcomeAccentColor: "#0d9488",
      welcomeHeaderTextColor: "#0d9488",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#ecfdf5",
      welcomeBackgroundGradientTo: "#fce7f3",
      welcomeBackgroundPattern: "dessert",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "sandstone-souk",
    name: "Sandstone Souk",
    blurb: "Desert stone & spice gold",
    swatch: ["#b45309", "#fcd34d", "#fef3c7"],
    patch: {
      primaryColor: "#b45309",
      secondaryColor: "#fcd34d",
      defaultTheme: "light",
      cardDesign: "compact",
      cardStyle: "outlined",
      categoryNavStyle: "cards",
      sectionHeaderStyle: "numbered",
      backgroundType: "pattern",
      backgroundColor: "#fef3c7",
      backgroundPattern: "diamonds",
      backgroundPatternColor: "#b45309",
      pageSurfaceColor: "#fef3c7",
      cardSurfaceColor: "#fffbeb",
      fontPreset: "classic",
      pageDensity: "comfortable",
      priceStyle: "tag",
      imageAspect: "square",
      borderRadius: 10,
      sectionTitleCase: "uppercase",
      welcomeAccentColor: "#b45309",
      welcomeHeaderTextColor: "#b45309",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#fef3c7",
      welcomeBackgroundPattern: "mosaic",
      welcomeBackgroundPatternColor: "#b45309",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "square"
    }
  },
  {
    id: "iceberg-white",
    name: "Iceberg White",
    blurb: "Glacier white & frost cyan",
    swatch: ["#0891b2", "#a5f3fc", "#ecfeff"],
    patch: {
      primaryColor: "#0891b2",
      secondaryColor: "#67e8f9",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "flat",
      categoryNavStyle: "minimal",
      sectionHeaderStyle: "divider",
      backgroundType: "solid",
      pageSurfaceColor: "#ecfeff",
      cardSurfaceColor: "#ffffff",
      fontPreset: "modern",
      pageDensity: "compact",
      contentWidth: "wide",
      priceStyle: "plain",
      borderRadius: 2,
      cardHover: "none",
      showCategoryIcons: false,
      headerShowGlow: false,
      welcomeAccentColor: "#0891b2",
      welcomeHeaderTextColor: "#0891b2",
      welcomeBackgroundStyle: "solid",
      welcomeBackgroundColor: "#ecfeff",
      welcomeBackgroundPattern: "rings",
      welcomeCardStyle: "outlined",
      welcomeEnterStyle: "square",
      welcomeLanguageStyle: "minimal"
    }
  },
  {
    id: "velvet-rouge",
    name: "Velvet Rouge",
    blurb: "Theater red & stage gold",
    swatch: ["#be123c", "#fde68a", "#1c0a0e"],
    patch: {
      primaryColor: "#be123c",
      secondaryColor: "#fde68a",
      defaultTheme: "dark",
      cardDesign: "overlay",
      cardStyle: "elevated",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "banner",
      backgroundType: "pattern",
      backgroundColor: "#1c0a0e",
      backgroundPattern: "stars",
      backgroundPatternColor: "#be123c",
      pageSurfaceColor: "#1c0a0e",
      cardSurfaceColor: "#2a1018",
      darkPageSurfaceColor: "#1c0a0e",
      darkCardSurfaceColor: "#2a1018",
      darkPrimaryColor: "#fb7185",
      fontPreset: "display",
      pageDensity: "cozy",
      priceStyle: "large",
      imageAspect: "tall",
      borderRadius: 14,
      sectionTitleCase: "uppercase",
      welcomeAccentColor: "#fde68a",
      welcomeHeaderTextColor: "#fde68a",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#1c0a0e",
      welcomeBackgroundGradientTo: "#be123c",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "outline",
      welcomeCardWidth: "wide"
    }
  },
  {
    id: "pistachio-cream",
    name: "Pistachio Cream",
    blurb: "Nutty green & soft cream",
    swatch: ["#4d7c0f", "#d9f99d", "#f7fee7"],
    patch: {
      primaryColor: "#4d7c0f",
      secondaryColor: "#a3e635",
      defaultTheme: "light",
      cardDesign: "classic",
      cardStyle: "outlined",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "overline",
      backgroundType: "pattern",
      backgroundColor: "#f7fee7",
      backgroundPattern: "honeycomb",
      backgroundPatternColor: "#4d7c0f",
      pageSurfaceColor: "#f7fee7",
      cardSurfaceColor: "#fcfff5",
      fontPreset: "soft",
      pageDensity: "comfortable",
      priceStyle: "badge",
      borderRadius: 18,
      welcomeAccentColor: "#4d7c0f",
      welcomeHeaderTextColor: "#4d7c0f",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#f7fee7",
      welcomeBackgroundPattern: "scatter",
      welcomeBackgroundPatternColor: "#4d7c0f",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "midnight-teal",
    name: "Midnight Teal",
    blurb: "Deep teal & moon silver",
    swatch: ["#0f766e", "#99f6e4", "#042f2e"],
    patch: {
      primaryColor: "#2dd4bf",
      secondaryColor: "#99f6e4",
      defaultTheme: "dark",
      cardDesign: "classic",
      cardStyle: "elevated",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "accent",
      backgroundType: "pattern",
      backgroundColor: "#042f2e",
      backgroundPattern: "mesh",
      backgroundPatternColor: "#0f766e",
      pageSurfaceColor: "#042f2e",
      cardSurfaceColor: "#0d3d3a",
      darkPageSurfaceColor: "#042f2e",
      darkCardSurfaceColor: "#0d3d3a",
      darkPrimaryColor: "#2dd4bf",
      fontPreset: "brand",
      pageDensity: "comfortable",
      priceStyle: "badge",
      borderRadius: 14,
      navSurface: "tinted",
      welcomeAccentColor: "#2dd4bf",
      welcomeHeaderTextColor: "#99f6e4",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#042f2e",
      welcomeBackgroundGradientTo: "#0f766e",
      welcomeBackgroundPattern: "drinks",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "outline"
    }
  },
  {
    id: "paper-ink",
    name: "Paper & Ink",
    blurb: "Editorial black on cream",
    swatch: ["#171717", "#737373", "#fafaf9"],
    patch: {
      primaryColor: "#171717",
      secondaryColor: "#737373",
      defaultTheme: "light",
      cardDesign: "minimal",
      cardStyle: "flat",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "divider",
      backgroundType: "pattern",
      backgroundColor: "#fafaf9",
      backgroundPattern: "stripes",
      backgroundPatternColor: "#a3a3a3",
      pageSurfaceColor: "#fafaf9",
      cardSurfaceColor: "#ffffff",
      fontPreset: "display",
      pageDensity: "cozy",
      contentWidth: "narrow",
      priceStyle: "plain",
      borderRadius: 0,
      cardHover: "border",
      showCategoryIcons: false,
      headerShowGlow: false,
      sectionTitleCase: "uppercase",
      welcomeAccentColor: "#171717",
      welcomeHeaderTextColor: "#171717",
      welcomeBackgroundStyle: "solid",
      welcomeBackgroundColor: "#fafaf9",
      welcomeBackgroundPattern: "diagonal",
      welcomeCardStyle: "outlined",
      welcomeFormBorderColor: "#171717",
      welcomeEnterStyle: "square",
      welcomeLanguageStyle: "minimal",
      welcomeCardWidth: "narrow"
    }
  }
];

const SAMPLE_ITEMS = defaultMenuItems.slice(0, 2);
const HOUR_OPTIONS = Array.from({ length: 25 }, (_, hour) => hour);
const WELCOME_BACKGROUND_MEDIA_HINT = "Supports images or videos. Recommended: 1080x1920 px mobile / 1920x1080 px desktop. Max upload: 100 MB.";
const WELCOME_BACKGROUND_MEDIA_MAX_BYTES = 100 * 1024 * 1024;
type DesignerTab = "menu" | "welcome";

// Central per-cafe menu design editor, shown in the platform /admin panel. The
// design data lives on each tenant (clients/{slug}/settings/{general,appearance}),
// so we point the active client slug at the selected cafe only around the
// tenant-scoped load/save calls, then reset it — keeping the rest of /admin
// (listClients, auth) on the platform root scope.
export function MenuDesigner() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [slug, setSlug] = useState("");
  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneralSettings);
  const [menu, setMenu] = useState<MenuSettings>(defaultMenuSettings);
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearanceSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeDesignerTab, setActiveDesignerTab] = useState<DesignerTab>("menu");

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setError("Could not load cafes."));
  }, []);

  async function loadCafe(next: string) {
    setSlug(next);
    setMessage("");
    setError("");
    if (!next) return;
    setLoading(true);
    setActiveClientSlug(next);
    try {
      const data = await getAdminAppData();
      setGeneral(data.general);
      setMenu(data.menu);
      setAppearance(data.appearance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this cafe's design.");
    } finally {
      setActiveClientSlug(null);
      setLoading(false);
    }
  }

  async function save() {
    if (!slug) return;
    setSaving(true);
    setMessage("");
    setError("");
    setActiveClientSlug(slug);
    try {
      await Promise.all([
        saveSettings("general", general as unknown as Record<string, unknown>),
        saveSettings("menu", menu as unknown as Record<string, unknown>),
        saveSettings("appearance", appearance as unknown as Record<string, unknown>)
      ]);
      setMessage("Saved. The live menu updates within about 20 seconds.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the design.");
    } finally {
      setActiveClientSlug(null);
      setSaving(false);
    }
  }

  const update = (patch: Partial<AppearanceSettings>) => setAppearance((prev) => ({ ...prev, ...patch }));
  const updateMenu = (patch: Partial<MenuSettings>) => setMenu((prev) => ({ ...prev, ...patch }));
  const backgroundType = appearance.backgroundType ?? "preset";

  function toggleEnabledLanguage(entry: Locale) {
    const current = general.enabledLanguages?.length ? general.enabledLanguages : ALL_LOCALES;
    const next = current.includes(entry) ? current.filter((locale) => locale !== entry) : [...current, entry];
    if (!next.length) return;
    setGeneral({ ...general, enabledLanguages: next });
  }

  const enabledLanguageList = general.enabledLanguages?.length ? general.enabledLanguages : ALL_LOCALES;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Menu Design</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Cafe">
              <Select value={slug} onChange={(e) => loadCafe(e.target.value)}>
                <option value="">Select a cafe…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.slug}>
                    {client.name} (/{client.slug})
                  </option>
                ))}
              </Select>
            </Field>
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
              </p>
            ) : null}
            {!clients.length ? (
              <p className="text-sm text-muted-foreground">No cafes yet. Create one in the Clients tab first.</p>
            ) : null}
          </CardContent>
        </Card>

        {slug && !loading ? (
          <>
            <div className="inline-flex w-full max-w-md gap-1 rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Design sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeDesignerTab === "menu"}
                onClick={() => setActiveDesignerTab("menu")}
                className={cn(
                  "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeDesignerTab === "menu" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Menu Page
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDesignerTab === "welcome"}
                onClick={() => setActiveDesignerTab("welcome")}
                className={cn(
                  "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeDesignerTab === "welcome" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Welcome Page
              </button>
            </div>

            <Card className={activeDesignerTab === "welcome" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Welcome Page</CardTitle></CardHeader>
              <CardContent className="grid gap-6">
                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Header &amp; cafe name</h3>
                    <p className="text-sm text-muted-foreground">This controls the first screen at /{slug} before customers enter the menu.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Cafe name (English)"><Input value={general.restaurantName.en} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, en: e.target.value } })} /></Field>
                    <Field label="Cafe name (Arabic)"><Input dir="rtl" value={general.restaurantName.ar} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ar: e.target.value } })} /></Field>
                    <Field label="Cafe name (Kurdish)"><Input dir="rtl" value={general.restaurantName.ckb} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ckb: e.target.value } })} /></Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Welcome header (English)"><Input value={general.welcomeHeader?.en || ""} placeholder="Welcome to" onChange={(e) => setGeneral({ ...general, welcomeHeader: { ...general.welcomeHeader, en: e.target.value } })} /></Field>
                    <Field label="Welcome header (Arabic)"><Input dir="rtl" value={general.welcomeHeader?.ar || ""} placeholder="أهلاً بك في" onChange={(e) => setGeneral({ ...general, welcomeHeader: { ...general.welcomeHeader, ar: e.target.value } })} /></Field>
                    <Field label="Welcome header (Kurdish)"><Input dir="rtl" value={general.welcomeHeader?.ckb || ""} placeholder="بەخێربێیت بۆ" onChange={(e) => setGeneral({ ...general, welcomeHeader: { ...general.welcomeHeader, ckb: e.target.value } })} /></Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Tagline (English)"><Input value={general.welcomeTagline?.en || ""} placeholder="Freshly brewed, just for you" onChange={(e) => setGeneral({ ...general, welcomeTagline: { ...general.welcomeTagline, en: e.target.value } })} /></Field>
                    <Field label="Tagline (Arabic)"><Input dir="rtl" value={general.welcomeTagline?.ar || ""} placeholder="قهوة طازجة، خصيصاً لك" onChange={(e) => setGeneral({ ...general, welcomeTagline: { ...general.welcomeTagline, ar: e.target.value } })} /></Field>
                    <Field label="Tagline (Kurdish)"><Input dir="rtl" value={general.welcomeTagline?.ckb || ""} placeholder="قاوەی تازە، تایبەت بۆ تۆ" onChange={(e) => setGeneral({ ...general, welcomeTagline: { ...general.welcomeTagline, ckb: e.target.value } })} /></Field>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Logo</h3>
                    <p className="text-sm text-muted-foreground">Shown on the welcome card before guests enter the menu.</p>
                  </div>
                  <ImageUploadField
                    label="Welcome logo"
                    path={`clients/${slug}/logo`}
                    imageUrl={general.logoUrl}
                    onUploaded={(result) => setGeneral({ ...general, logoUrl: result.imageUrl, logoPath: result.imagePath })}
                    onRemoved={() => setGeneral({ ...general, logoUrl: undefined, logoPath: undefined })}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Logo shape">
                      <Select value={appearance.welcomeLogoStyle ?? "circle"} onChange={(e) => update({ welcomeLogoStyle: e.target.value as AppearanceSettings["welcomeLogoStyle"] })}>
                        <option value="circle">Circle</option>
                        <option value="rounded">Rounded square</option>
                        <option value="square">Square</option>
                      </Select>
                    </Field>
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Show social links</p>
                        <p className="text-xs text-muted-foreground">Hide the social row on the welcome screen.</p>
                      </div>
                      <Switch label="Show social links on welcome" checked={appearance.welcomeShowSocialLinks !== false} onCheckedChange={(v) => update({ welcomeShowSocialLinks: v })} />
                    </div>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Languages on welcome</h3>
                    <p className="text-sm text-muted-foreground">Choose which languages guests can pick before entering the menu.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LOCALES.map((entry) => {
                      const active = enabledLanguageList.includes(entry);
                      return (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => toggleEnabledLanguage(entry)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                            active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {localeLabels[entry]}
                        </button>
                      );
                    })}
                  </div>
                  <Field label="Default menu language">
                    <Select value={general.defaultLanguage} onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value as GeneralSettings["defaultLanguage"] })}>
                      {enabledLanguageList.map((entry) => (
                        <option key={entry} value={entry}>{localeLabels[entry]}</option>
                      ))}
                    </Select>
                  </Field>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-2">
                    <div>
                      <p className="text-sm font-medium">Show dark/night mode toggle</p>
                      <p className="text-xs text-muted-foreground">Turn this off if this cafe should not offer dark mode to customers.</p>
                    </div>
                    <Switch label="Show dark/night mode toggle" checked={menu.enableDarkMode !== false} onCheckedChange={(v) => updateMenu({ enableDarkMode: v })} />
                  </div>
                  {menu.enableDarkMode !== false ? (
                    <>
                      <Field label="Theme icon design">
                        <Select value={appearance.welcomeThemeToggleStyle ?? "circle"} onChange={(e) => update({ welcomeThemeToggleStyle: e.target.value as AppearanceSettings["welcomeThemeToggleStyle"] })}>
                          <option value="circle">Circle button</option>
                          <option value="pill">Pill button</option>
                          <option value="segmented">Segmented button</option>
                        </Select>
                      </Field>
                      <Field label="Theme icon set">
                        <Select value={appearance.welcomeThemeIconStyle ?? "sunMoon"} onChange={(e) => update({ welcomeThemeIconStyle: e.target.value as AppearanceSettings["welcomeThemeIconStyle"] })}>
                          <option value="sunMoon">Sun / moon</option>
                          <option value="coffeeMoon">Coffee / moon</option>
                          <option value="sparkles">Sparkles / moon</option>
                          <option value="contrast">Contrast icon</option>
                        </Select>
                      </Field>
                    </>
                  ) : null}
                  <Field label="Language selector design">
                    <Select value={appearance.welcomeLanguageStyle ?? "buttons"} onChange={(e) => update({ welcomeLanguageStyle: e.target.value as AppearanceSettings["welcomeLanguageStyle"] })}>
                      <option value="buttons">Icon + buttons</option>
                      <option value="segmented">Segmented control</option>
                      <option value="cards">Language cards</option>
                      <option value="minimal">Minimal text</option>
                    </Select>
                  </Field>
                  <Field label="Enter button style">
                    <Select value={appearance.welcomeEnterStyle ?? "pill"} onChange={(e) => update({ welcomeEnterStyle: e.target.value as AppearanceSettings["welcomeEnterStyle"] })}>
                      <option value="pill">Pill</option>
                      <option value="rounded">Rounded</option>
                      <option value="square">Square</option>
                      <option value="outline">Outline</option>
                    </Select>
                  </Field>
                  <Field label="Welcome card width">
                    <Select value={appearance.welcomeCardWidth ?? "normal"} onChange={(e) => update({ welcomeCardWidth: e.target.value as AppearanceSettings["welcomeCardWidth"] })}>
                      <option value="narrow">Narrow</option>
                      <option value="normal">Normal</option>
                      <option value="wide">Wide</option>
                    </Select>
                  </Field>
                  <Field label="Welcome card position">
                    <Select value={appearance.welcomeCardAlign ?? "center"} onChange={(e) => update({ welcomeCardAlign: e.target.value as AppearanceSettings["welcomeCardAlign"] })}>
                      <option value="center">Centered</option>
                      <option value="bottom">Lower on screen</option>
                    </Select>
                  </Field>
                  <Field label="Accent color"><Input type="color" value={appearance.welcomeAccentColor || "#A4D8A6"} onChange={(e) => update({ welcomeAccentColor: e.target.value })} /></Field>
                  <Field label="Welcome text color"><Input type="color" value={appearance.welcomeHeaderTextColor || appearance.welcomeAccentColor || "#A4D8A6"} onChange={(e) => update({ welcomeHeaderTextColor: e.target.value })} /></Field>
                  <Field label="Tagline/helper text color"><Input type="color" value={appearance.welcomeHelperTextColor || appearance.welcomeFormTextColor || "#6b7280"} onChange={(e) => update({ welcomeHelperTextColor: e.target.value })} /></Field>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <Field label="Form/card design">
                    <Select value={appearance.welcomeCardStyle ?? "glass"} onChange={(e) => update({ welcomeCardStyle: e.target.value as AppearanceSettings["welcomeCardStyle"] })}>
                      <option value="glass">Glass card</option>
                      <option value="solid">Solid card</option>
                      <option value="outlined">Outlined card</option>
                      <option value="floating">Floating card</option>
                    </Select>
                  </Field>
                  <Field label="Form/card pattern">
                    <Select value={appearance.welcomeCardPattern ?? "none"} onChange={(e) => update({ welcomeCardPattern: e.target.value as AppearanceSettings["welcomeCardPattern"] })}>
                      {CARD_PATTERN_SELECT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Form/card color"><Input type="color" value={appearance.welcomeFormColor || "#ffffff"} onChange={(e) => update({ welcomeFormColor: e.target.value })} /></Field>
                  <Field label="Form/card text color"><Input type="color" value={appearance.welcomeFormTextColor || "#111827"} onChange={(e) => update({ welcomeFormTextColor: e.target.value })} /></Field>
                  <Field label="Form/card border color"><Input type="color" value={appearance.welcomeFormBorderColor || "#A4D8A6"} onChange={(e) => update({ welcomeFormBorderColor: e.target.value })} /></Field>
                  <Field label={`Form/card blur (${appearance.welcomeFormBlur ?? 24}px)`}>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={appearance.welcomeFormBlur ?? 24}
                      onChange={(e) => update({ welcomeFormBlur: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </Field>
                  <Field label={`Form/card transparency (${appearance.welcomeFormTransparency ?? 15}%)`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={appearance.welcomeFormTransparency ?? 15}
                      onChange={(e) => update({ welcomeFormTransparency: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </Field>
                </section>

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Welcome background</h3>
                    <p className="text-sm text-muted-foreground">Choose a background style, pattern, and colors for the /{slug} welcome screen.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Background design">
                      <Select value={appearance.welcomeBackgroundStyle ?? "gradient"} onChange={(e) => update({ welcomeBackgroundStyle: e.target.value as AppearanceSettings["welcomeBackgroundStyle"] })}>
                        <option value="gradient">Gradient</option>
                        <option value="solid">Solid color</option>
                        <option value="pattern">Pattern over color</option>
                        <option value="image">Uploaded image/video design</option>
                      </Select>
                    </Field>
                    <Field label="Pattern">
                      <Select value={appearance.welcomeBackgroundPattern ?? "cafe"} onChange={(e) => update({ welcomeBackgroundPattern: e.target.value as AppearanceSettings["welcomeBackgroundPattern"] })}>
                        {PATTERN_SELECT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Background color"><Input type="color" value={appearance.welcomeBackgroundColor || "#d7efd8"} onChange={(e) => update({ welcomeBackgroundColor: e.target.value })} /></Field>
                    <Field label="Pattern color"><Input type="color" value={appearance.welcomeBackgroundPatternColor || "#3f8a49"} onChange={(e) => update({ welcomeBackgroundPatternColor: e.target.value })} /></Field>
                    <Field label="Gradient start"><Input type="color" value={appearance.welcomeBackgroundGradientFrom || "#d7efd8"} onChange={(e) => update({ welcomeBackgroundGradientFrom: e.target.value })} /></Field>
                    <Field label="Gradient end"><Input type="color" value={appearance.welcomeBackgroundGradientTo || "#86cc8a"} onChange={(e) => update({ welcomeBackgroundGradientTo: e.target.value })} /></Field>
                  </div>
                  {(appearance.welcomeBackgroundStyle ?? "gradient") === "image" ? (
                    <>
                      <ImageUploadField
                        label="Welcome background image or video"
                        path={`clients/${slug}/welcome-background`}
                        imageUrl={appearance.welcomeBackgroundImageUrl}
                        mediaType={appearance.welcomeBackgroundMediaType}
                        helpText={WELCOME_BACKGROUND_MEDIA_HINT}
                        inputHint="Images or MP4/WebM videos up to 100 MB."
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                        allowVideo
                        maxBytes={WELCOME_BACKGROUND_MEDIA_MAX_BYTES}
                        maxBytesLabel="100 MB"
                        onUploaded={(result) => update({ welcomeBackgroundImageUrl: result.imageUrl, welcomeBackgroundImagePath: result.imagePath, welcomeBackgroundMediaType: result.mediaType ?? "image" })}
                        onRemoved={() => update({ welcomeBackgroundImageUrl: undefined, welcomeBackgroundImagePath: undefined, welcomeBackgroundMediaType: undefined })}
                      />
                      <Field label={`Background darken overlay (${appearance.welcomeBackgroundOverlay ?? 15}%)`}>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={appearance.welcomeBackgroundOverlay ?? 15}
                          onChange={(e) => update({ welcomeBackgroundOverlay: Number(e.target.value) })}
                          className="w-full accent-primary"
                        />
                      </Field>
                    </>
                  ) : null}
                </section>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader>
                <CardTitle>Look Presets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Curated luxury looks for different venues. Apply one, then refine colors, cards, and welcome styling below.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {LOOK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => update(preset.patch)}
                      className="group overflow-hidden rounded-2xl border bg-card text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                    >
                      <div
                        className="h-16 w-full"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${preset.swatch[2]} 0%, ${preset.swatch[0]} 48%, ${preset.swatch[1]} 100%)`
                        }}
                      />
                      <div className="space-y-2 p-3">
                        <div className="flex items-center gap-1.5">
                          {preset.swatch.map((color) => (
                            <span
                              key={color}
                              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold tracking-tight">{preset.name}</p>
                          <p className="text-xs text-muted-foreground">{preset.blurb}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Menu Display &amp; Behavior</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(menu)
                  .filter(([key]) => key !== "updatedAt" && key !== "enableFilters")
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-md border p-3">
                      <span className="text-sm font-medium">{MENU_SETTING_LABELS[key] || key}</span>
                      <Switch
                        label={MENU_SETTING_LABELS[key] || key}
                        checked={Boolean(value)}
                        onCheckedChange={(checked) => updateMenu({ [key]: checked } as Partial<MenuSettings>)}
                      />
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Languages &amp; Currency</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Enabled menu languages</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LOCALES.map((entry) => {
                      const active = enabledLanguageList.includes(entry);
                      return (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => toggleEnabledLanguage(entry)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                            active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {localeLabels[entry]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Default language">
                    <Select value={general.defaultLanguage} onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value as GeneralSettings["defaultLanguage"] })}>
                      {enabledLanguageList.map((entry) => (
                        <option key={entry} value={entry}>{localeLabels[entry]}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Default currency">
                    <Select value={general.defaultCurrency} onChange={(e) => setGeneral({ ...general, defaultCurrency: e.target.value as GeneralSettings["defaultCurrency"] })}>
                      {CURRENCIES.map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <ImageUploadField
                  label="Logo"
                  path={`clients/${slug}/logo`}
                  imageUrl={general.logoUrl}
                  onUploaded={(result) => setGeneral({ ...general, logoUrl: result.imageUrl, logoPath: result.imagePath })}
                  onRemoved={() => setGeneral({ ...general, logoUrl: undefined, logoPath: undefined })}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Description (English)"><Textarea value={general.description.en || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, en: e.target.value } })} /></Field>
                  <Field label="Description (Arabic)"><Textarea dir="rtl" value={general.description.ar || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ar: e.target.value } })} /></Field>
                  <Field label="Description (Kurdish)"><Textarea dir="rtl" value={general.description.ckb || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ckb: e.target.value } })} /></Field>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Colors &amp; Theme</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <Field label="Primary color"><Input type="color" value={appearance.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} /></Field>
                <Field label="Secondary color"><Input type="color" value={appearance.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })} /></Field>
                <Field label="Corner radius (px)"><Input type="number" value={appearance.borderRadius} onChange={(e) => update({ borderRadius: Number(e.target.value) })} /></Field>
                <Field label="Default theme">
                  <Select value={appearance.defaultTheme} onChange={(e) => update({ defaultTheme: e.target.value as AppearanceSettings["defaultTheme"] })}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </Select>
                </Field>
                <Field label="Font style">
                  <Select value={appearance.fontPreset ?? "brand"} onChange={(e) => update({ fontPreset: e.target.value as AppearanceSettings["fontPreset"] })}>
                    <option value="brand">Brand (Cairo / Readex)</option>
                    <option value="modern">Modern system</option>
                    <option value="classic">Classic serif</option>
                    <option value="soft">Soft rounded</option>
                    <option value="display">Display (serif headings)</option>
                    <option value="mono">Mono / technical</option>
                    <option value="rounded">Friendly rounded</option>
                  </Select>
                </Field>
                <Field label="Font size">
                  <Select value={appearance.fontScale ?? "md"} onChange={(e) => update({ fontScale: e.target.value as AppearanceSettings["fontScale"] })}>
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </Select>
                </Field>
                <Field label="Heading weight">
                  <Select value={appearance.headingWeight ?? "bold"} onChange={(e) => update({ headingWeight: e.target.value as AppearanceSettings["headingWeight"] })}>
                    <option value="normal">Normal</option>
                    <option value="semibold">Semibold</option>
                    <option value="bold">Bold</option>
                    <option value="extrabold">Extra bold</option>
                  </Select>
                </Field>
                <Field label="Page surface color"><Input type="color" value={appearance.pageSurfaceColor || "#f8fafc"} onChange={(e) => update({ pageSurfaceColor: e.target.value })} /></Field>
                <Field label="Card surface color"><Input type="color" value={appearance.cardSurfaceColor || "#ffffff"} onChange={(e) => update({ cardSurfaceColor: e.target.value })} /></Field>
                <Field label="Dark page surface"><Input type="color" value={appearance.darkPageSurfaceColor || "#0f172a"} onChange={(e) => update({ darkPageSurfaceColor: e.target.value })} /></Field>
                <Field label="Dark card surface"><Input type="color" value={appearance.darkCardSurfaceColor || "#1e293b"} onChange={(e) => update({ darkCardSurfaceColor: e.target.value })} /></Field>
                <Field label="Dark primary color"><Input type="color" value={appearance.darkPrimaryColor || appearance.primaryColor} onChange={(e) => update({ darkPrimaryColor: e.target.value })} /></Field>
                <div className="flex items-end md:col-span-2">
                  <Button type="button" variant="outline" onClick={() => update({ pageSurfaceColor: undefined, cardSurfaceColor: undefined, darkPageSurfaceColor: undefined, darkCardSurfaceColor: undefined, darkPrimaryColor: undefined })}>
                    Reset surfaces
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Layout</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Menu layout">
                  <Select value={appearance.menuLayout} onChange={(e) => update({ menuLayout: e.target.value as AppearanceSettings["menuLayout"] })}>
                    <option value="list">List</option>
                    <option value="grid">Grid</option>
                  </Select>
                </Field>
                <Field label="Item columns">
                  <Select value={appearance.itemColumns ?? "auto"} onChange={(e) => update({ itemColumns: e.target.value as AppearanceSettings["itemColumns"] })}>
                    <option value="auto">Auto (by card design)</option>
                    <option value="1">1 column</option>
                    <option value="2">2 columns</option>
                    <option value="3">3 columns</option>
                  </Select>
                </Field>
                <Field label="Page density">
                  <Select value={appearance.pageDensity ?? "comfortable"} onChange={(e) => update({ pageDensity: e.target.value as AppearanceSettings["pageDensity"] })}>
                    <option value="cozy">Cozy (more space)</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </Select>
                </Field>
                <Field label="Content width">
                  <Select value={appearance.contentWidth ?? "normal"} onChange={(e) => update({ contentWidth: e.target.value as AppearanceSettings["contentWidth"] })}>
                    <option value="narrow">Narrow</option>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                  </Select>
                </Field>
                <Field label="Header density">
                  <Select value={appearance.headerLayout} onChange={(e) => update({ headerLayout: e.target.value as AppearanceSettings["headerLayout"] })}>
                    <option value="expanded">Expanded</option>
                    <option value="compact">Compact</option>
                  </Select>
                </Field>
                <Field label="Category bar surface">
                  <Select value={appearance.navSurface ?? "solid"} onChange={(e) => update({ navSurface: e.target.value as AppearanceSettings["navSurface"] })}>
                    <option value="solid">Solid</option>
                    <option value="muted">Muted</option>
                    <option value="tinted">Primary tint</option>
                    <option value="transparent">Soft transparent</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-2">
                  <div>
                    <p className="text-sm font-medium">Show description under cafe name</p>
                    <p className="text-xs text-muted-foreground">Uses the multilingual description from Branding.</p>
                  </div>
                  <Switch label="Show header description" checked={appearance.showHeaderDescription !== false} onCheckedChange={(v) => update({ showHeaderDescription: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Header</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Logo design">
                  <Select value={appearance.menuLogoStyle ?? "rounded"} onChange={(e) => update({ menuLogoStyle: e.target.value as AppearanceSettings["menuLogoStyle"] })}>
                    <option value="rounded">Rounded square</option>
                    <option value="circle">Circle</option>
                    <option value="square">Sharp square</option>
                    <option value="badge">Badge frame</option>
                    <option value="wordmark">Wide wordmark</option>
                  </Select>
                </Field>
                <Field label="Alignment">
                  <Select value={appearance.headerAlign ?? "left"} onChange={(e) => update({ headerAlign: e.target.value as AppearanceSettings["headerAlign"] })}>
                    <option value="left">Left</option>
                    <option value="center">Centered</option>
                  </Select>
                </Field>
                <Field label="Open / closed badge">
                  <Select value={appearance.openStatusStyle ?? "pill"} onChange={(e) => update({ openStatusStyle: e.target.value as AppearanceSettings["openStatusStyle"] })}>
                    <option value="pill">Pill with time</option>
                    <option value="compact">Compact status</option>
                    <option value="outline">Outlined</option>
                    <option value="card">Small card</option>
                    <option value="banner">Filled banner</option>
                  </Select>
                </Field>
                <Field label="Header background">
                  <Select value={appearance.headerBackgroundType ?? "theme"} onChange={(e) => update({ headerBackgroundType: e.target.value as AppearanceSettings["headerBackgroundType"] })}>
                    <option value="theme">Theme (default)</option>
                    <option value="solid">Solid color</option>
                    <option value="gradient">Gradient</option>
                  </Select>
                </Field>
                <Field label="Cafe name color"><Input type="color" value={appearance.headerTextColor || "#0f172a"} onChange={(e) => update({ headerTextColor: e.target.value })} /></Field>
                <Field label="Description text color"><Input type="color" value={appearance.headerMutedColor || "#64748b"} onChange={(e) => update({ headerMutedColor: e.target.value })} /></Field>
                <Field label="Language control">
                  <Select value={appearance.menuLanguageStyle ?? "globe"} onChange={(e) => update({ menuLanguageStyle: e.target.value as AppearanceSettings["menuLanguageStyle"] })}>
                    <option value="globe">Globe menu</option>
                    <option value="buttons">Language buttons</option>
                    <option value="segmented">Segmented</option>
                    <option value="cards">Language cards</option>
                    <option value="minimal">Minimal</option>
                  </Select>
                </Field>
                <Field label="Theme toggle shape">
                  <Select value={appearance.menuThemeToggleStyle ?? "circle"} onChange={(e) => update({ menuThemeToggleStyle: e.target.value as AppearanceSettings["menuThemeToggleStyle"] })}>
                    <option value="circle">Circle</option>
                    <option value="pill">Pill</option>
                    <option value="segmented">Segmented</option>
                  </Select>
                </Field>
                <Field label="Theme toggle icons">
                  <Select value={appearance.menuThemeIconStyle ?? "sunMoon"} onChange={(e) => update({ menuThemeIconStyle: e.target.value as AppearanceSettings["menuThemeIconStyle"] })}>
                    <option value="sunMoon">Sun / moon</option>
                    <option value="coffeeMoon">Coffee / moon</option>
                    <option value="sparkles">Sparkles</option>
                    <option value="contrast">Contrast</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <span className="text-sm font-medium">Header glow accent</span>
                  <Switch label="Header glow" checked={appearance.headerShowGlow !== false} onCheckedChange={(v) => update({ headerShowGlow: v })} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <span className="text-sm font-medium">Show cart button</span>
                  <Switch label="Show cart" checked={appearance.showCartButton !== false} onCheckedChange={(v) => update({ showCartButton: v })} />
                </div>
                <div className="flex items-center justify-between gap-3 pt-6">
                  <span className="text-sm font-medium">Show contact row</span>
                  <Switch label="Show contact row" checked={appearance.showContactRow !== false} onCheckedChange={(v) => update({ showContactRow: v })} />
                </div>
                {(appearance.headerBackgroundType ?? "theme") === "solid" ? (
                  <Field label="Header color"><Input type="color" value={appearance.headerBackgroundColor || "#ffffff"} onChange={(e) => update({ headerBackgroundColor: e.target.value })} /></Field>
                ) : null}
                {(appearance.headerBackgroundType ?? "theme") === "gradient" ? (
                  <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                    <Field label="Header gradient top"><Input type="color" value={appearance.headerGradientFrom || "#ecfdf5"} onChange={(e) => update({ headerGradientFrom: e.target.value })} /></Field>
                    <Field label="Header gradient bottom"><Input type="color" value={appearance.headerGradientTo || "#ffffff"} onChange={(e) => update({ headerGradientTo: e.target.value })} /></Field>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Hours &amp; Contact Links</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Open time">
                    <Select value={String(general.openHour ?? 9)} onChange={(e) => setGeneral({ ...general, openHour: Number(e.target.value) })}>
                      {HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{formatHourLabel(hour)}</option>)}
                    </Select>
                  </Field>
                  <Field label="Close time">
                    <Select value={String(general.closeHour ?? 23)} onChange={(e) => setGeneral({ ...general, closeHour: Number(e.target.value) })}>
                      {HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{formatHourLabel(hour)}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Phone number"><Input value={general.phone || ""} onChange={(e) => setGeneral({ ...general, phone: e.target.value })} /></Field>
                  <Field label="WhatsApp"><Input value={general.whatsapp || ""} onChange={(e) => setGeneral({ ...general, whatsapp: e.target.value })} /></Field>
                  <Field label="Email"><Input type="email" value={general.email || ""} onChange={(e) => setGeneral({ ...general, email: e.target.value })} /></Field>
                  <Field label="Address"><Input value={general.address || ""} onChange={(e) => setGeneral({ ...general, address: e.target.value })} /></Field>
                  <Field label="Map URL"><Input value={general.googleMapsUrl || ""} onChange={(e) => setGeneral({ ...general, googleMapsUrl: e.target.value })} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Facebook"><Input value={general.socialLinks?.facebook || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, facebook: e.target.value } })} /></Field>
                  <Field label="Instagram"><Input value={general.socialLinks?.instagram || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, instagram: e.target.value } })} /></Field>
                  <Field label="TikTok"><Input value={general.socialLinks?.tiktok || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, tiktok: e.target.value } })} /></Field>
                  <Field label="Snapchat"><Input value={general.socialLinks?.snapchat || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, snapchat: e.target.value } })} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Contact layout">
                    <Select value={appearance.contactLayout ?? "inline"} onChange={(e) => update({ contactLayout: e.target.value as AppearanceSettings["contactLayout"] })}>
                      <option value="inline">Inline row</option>
                      <option value="centered">Centered row</option>
                      <option value="stacked">Stacked list</option>
                      <option value="grid">Grid</option>
                    </Select>
                  </Field>
                  <Field label="Contact chip design">
                    <Select value={appearance.contactChipStyle ?? "pill"} onChange={(e) => update({ contactChipStyle: e.target.value as AppearanceSettings["contactChipStyle"] })}>
                      <option value="pill">Pill</option>
                      <option value="soft">Soft filled</option>
                      <option value="outline">Primary outline</option>
                      <option value="square">Square</option>
                      <option value="iconOnly">Icon only</option>
                    </Select>
                  </Field>
                  <Field label="Social button design">
                    <Select value={appearance.socialLinkStyle ?? "icons"} onChange={(e) => update({ socialLinkStyle: e.target.value as AppearanceSettings["socialLinkStyle"] })}>
                      <option value="icons">Circle icons</option>
                      <option value="soft">Soft with label</option>
                      <option value="outline">Outline with label</option>
                      <option value="square">Square with label</option>
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Search Bar</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Field label="Shape">
                  <Select value={appearance.searchShape ?? "pill"} onChange={(e) => update({ searchShape: e.target.value as AppearanceSettings["searchShape"] })}>
                    <option value="pill">Pill</option>
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="soft">Soft large radius</option>
                  </Select>
                </Field>
                <Field label="Fill">
                  <Select value={appearance.searchStyle ?? "outlined"} onChange={(e) => update({ searchStyle: e.target.value as AppearanceSettings["searchStyle"] })}>
                    <option value="outlined">Outlined</option>
                    <option value="filled">Filled</option>
                    <option value="glass">Glass</option>
                    <option value="underline">Underline</option>
                    <option value="shadow">Floating shadow</option>
                  </Select>
                </Field>
                <Field label="Size">
                  <Select value={appearance.searchSize ?? "normal"} onChange={(e) => update({ searchSize: e.target.value as AppearanceSettings["searchSize"] })}>
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </Select>
                </Field>
                <Field label="Placement">
                  <Select value={appearance.searchPlacement ?? "header"} onChange={(e) => update({ searchPlacement: e.target.value as AppearanceSettings["searchPlacement"] })}>
                    <option value="header">In header</option>
                    <option value="sticky">Docked with categories</option>
                  </Select>
                </Field>
                <Field label="Icon position">
                  <Select value={appearance.searchIconPosition ?? "left"} onChange={(e) => update({ searchIconPosition: e.target.value as AppearanceSettings["searchIconPosition"] })}>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="none">No icon</option>
                  </Select>
                </Field>
                <Field label="Width">
                  <Select value={appearance.searchWidth ?? "wide"} onChange={(e) => update({ searchWidth: e.target.value as AppearanceSettings["searchWidth"] })}>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                    <option value="full">Full width</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-3">
                  <span className="text-sm font-medium">Show search label</span>
                  <Switch label="Show search label" checked={appearance.searchShowLabel === true} onCheckedChange={(v) => update({ searchShowLabel: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Item Cards</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Card design">
                  <Select value={appearance.cardDesign ?? "classic"} onChange={(e) => update({ cardDesign: e.target.value as AppearanceSettings["cardDesign"] })}>
                    <option value="classic">Classic — photo on top</option>
                    <option value="compact">Compact list — thumbnail beside text</option>
                    <option value="overlay">Image overlay — text over photo</option>
                    <option value="minimal">Minimal — text first, no photo</option>
                    <option value="poster">Poster — tall photo with title</option>
                  </Select>
                </Field>
                <Field label="Surface style">
                  <Select value={appearance.cardStyle} onChange={(e) => update({ cardStyle: e.target.value as AppearanceSettings["cardStyle"] })}>
                    <option value="flat">Flat</option>
                    <option value="outlined">Outlined</option>
                    <option value="elevated">Elevated</option>
                  </Select>
                </Field>
                <Field label="Photo aspect">
                  <Select value={appearance.imageAspect ?? "wide"} onChange={(e) => update({ imageAspect: e.target.value as AppearanceSettings["imageAspect"] })}>
                    <option value="wide">Wide</option>
                    <option value="square">Square</option>
                    <option value="tall">Tall</option>
                    <option value="auto">Auto</option>
                  </Select>
                </Field>
                <Field label="Price style">
                  <Select value={appearance.priceStyle ?? "plain"} onChange={(e) => update({ priceStyle: e.target.value as AppearanceSettings["priceStyle"] })}>
                    <option value="plain">Plain</option>
                    <option value="badge">Badge chip</option>
                    <option value="large">Large bold</option>
                    <option value="tag">Tag outline</option>
                  </Select>
                </Field>
                <Field label="Price color"><Input type="color" value={appearance.priceColor || appearance.primaryColor} onChange={(e) => update({ priceColor: e.target.value })} /></Field>
                <Field label="Card hover motion">
                  <Select value={appearance.cardHover ?? "lift"} onChange={(e) => update({ cardHover: e.target.value as AppearanceSettings["cardHover"] })}>
                    <option value="lift">Lift + soft shadow</option>
                    <option value="glow">Glow</option>
                    <option value="border">Border highlight</option>
                    <option value="none">None</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Category nav style">
                  <Select value={appearance.categoryNavStyle ?? "pills"} onChange={(e) => update({ categoryNavStyle: e.target.value as AppearanceSettings["categoryNavStyle"] })}>
                    <option value="pills">Pill tabs</option>
                    <option value="underline">Underline tabs</option>
                    <option value="cards">Category cards</option>
                    <option value="segmented">Segmented control</option>
                    <option value="minimal">Minimal text</option>
                    <option value="iconOnly">Icon only</option>
                    <option value="bubble">Bubble chips</option>
                  </Select>
                </Field>
                <Field label="Active category color"><Input type="color" value={appearance.navActiveColor || appearance.primaryColor} onChange={(e) => update({ navActiveColor: e.target.value })} /></Field>
                <Field label="Section header style">
                  <Select value={appearance.sectionHeaderStyle ?? "plain"} onChange={(e) => update({ sectionHeaderStyle: e.target.value as AppearanceSettings["sectionHeaderStyle"] })}>
                    <option value="plain">Plain</option>
                    <option value="divider">Centered with dividers</option>
                    <option value="banner">Filled banner</option>
                    <option value="centered">Centered</option>
                    <option value="boxed">Boxed</option>
                    <option value="accent">Accent bar</option>
                    <option value="numbered">Numbered</option>
                    <option value="overline">Overline</option>
                  </Select>
                </Field>
                <Field label="Section title case">
                  <Select value={appearance.sectionTitleCase ?? "normal"} onChange={(e) => update({ sectionTitleCase: e.target.value as AppearanceSettings["sectionTitleCase"] })}>
                    <option value="normal">Normal</option>
                    <option value="uppercase">UPPERCASE</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-2">
                  <span className="text-sm font-medium">Show category icons</span>
                  <Switch label="Show category icons" checked={appearance.showCategoryIcons !== false} onCheckedChange={(v) => update({ showCategoryIcons: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Above Categories</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Region">
                  <Select value={appearance.aboveCategory ?? "none"} onChange={(e) => update({ aboveCategory: e.target.value as AppearanceSettings["aboveCategory"] })}>
                    <option value="none">None</option>
                    <option value="cover">Cover / hero image</option>
                    <option value="promo">Promo strip</option>
                    <option value="featured">Featured categories row</option>
                  </Select>
                </Field>

                {(appearance.aboveCategory ?? "none") === "cover" ? (
                  <div className="grid gap-4">
                    <ImageUploadField
                      label="Cover image"
                      path={`clients/${slug}/cover`}
                      imageUrl={general.coverImageUrl}
                      onUploaded={(result) => setGeneral({ ...general, coverImageUrl: result.imageUrl, coverImagePath: result.imagePath })}
                      onRemoved={() => setGeneral({ ...general, coverImageUrl: undefined, coverImagePath: undefined })}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Cover height">
                        <Select value={appearance.coverHeight ?? "md"} onChange={(e) => update({ coverHeight: e.target.value as AppearanceSettings["coverHeight"] })}>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                          <option value="xl">Extra large</option>
                        </Select>
                      </Field>
                      <Field label={`Cover darken (${appearance.coverOverlay ?? 55}%)`}>
                        <input
                          type="range"
                          min={0}
                          max={90}
                          value={appearance.coverOverlay ?? 55}
                          onChange={(e) => update({ coverOverlay: Number(e.target.value) })}
                          className="w-full"
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}

                {(appearance.aboveCategory ?? "none") === "promo" ? (
                  <div className="grid gap-4">
                    <Field label="Strip color"><Input type="color" value={appearance.promoColor || "#0f766e"} onChange={(e) => update({ promoColor: e.target.value })} /></Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Message (English)"><Input value={general.promoText?.en || ""} onChange={(e) => setGeneral({ ...general, promoText: { ...general.promoText, en: e.target.value } })} /></Field>
                      <Field label="Message (Arabic)"><Input dir="rtl" value={general.promoText?.ar || ""} onChange={(e) => setGeneral({ ...general, promoText: { ...general.promoText, ar: e.target.value } })} /></Field>
                      <Field label="Message (Kurdish)"><Input dir="rtl" value={general.promoText?.ckb || ""} onChange={(e) => setGeneral({ ...general, promoText: { ...general.promoText, ckb: e.target.value } })} /></Field>
                    </div>
                  </div>
                ) : null}

                {(appearance.aboveCategory ?? "none") === "featured" ? (
                  <div className="grid gap-4">
                    <p className="text-sm text-muted-foreground">Shows a quick-jump row of this cafe&apos;s categories above the sticky bar.</p>
                    <Field label="Featured row style">
                      <Select value={appearance.featuredNavStyle ?? "cards"} onChange={(e) => update({ featuredNavStyle: e.target.value as AppearanceSettings["featuredNavStyle"] })}>
                        <option value="cards">Category cards</option>
                        <option value="pills">Pills</option>
                        <option value="bubble">Bubbles</option>
                        <option value="iconOnly">Icons only</option>
                        <option value="segmented">Segmented</option>
                      </Select>
                    </Field>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Background</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Background type">
                  <Select value={backgroundType} onChange={(e) => update({ backgroundType: e.target.value as AppearanceSettings["backgroundType"] })}>
                    <option value="preset">Preset (animated café)</option>
                    <option value="solid">Solid color</option>
                    <option value="gradient">Gradient</option>
                    <option value="image">Uploaded image</option>
                    <option value="pattern">Pattern design</option>
                  </Select>
                </Field>

                {(backgroundType === "solid" || backgroundType === "pattern") ? (
                  <Field label="Background color"><Input type="color" value={appearance.backgroundColor || "#ffffff"} onChange={(e) => update({ backgroundColor: e.target.value })} /></Field>
                ) : null}

                {backgroundType === "gradient" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Gradient top"><Input type="color" value={appearance.backgroundGradientFrom || "#ecfdf5"} onChange={(e) => update({ backgroundGradientFrom: e.target.value })} /></Field>
                    <Field label="Gradient bottom"><Input type="color" value={appearance.backgroundGradientTo || "#ffffff"} onChange={(e) => update({ backgroundGradientTo: e.target.value })} /></Field>
                  </div>
                ) : null}

                {backgroundType === "image" ? (
                  <div className="grid gap-4">
                    <ImageUploadField
                      label="Background image"
                      path={`clients/${slug}/background`}
                      imageUrl={appearance.backgroundImageUrl}
                      onUploaded={(result) => update({ backgroundImageUrl: result.imageUrl, backgroundImagePath: result.imagePath })}
                      onRemoved={() => update({ backgroundImageUrl: undefined, backgroundImagePath: undefined })}
                    />
                    <Field label="Image design">
                      <Select value={appearance.backgroundImageStyle ?? "cover"} onChange={(e) => update({ backgroundImageStyle: e.target.value as AppearanceSettings["backgroundImageStyle"] })}>
                        <option value="cover">Cover full screen</option>
                        <option value="contain">Contain full image</option>
                        <option value="tile">Tile pattern</option>
                        <option value="fixed">Fixed cover</option>
                      </Select>
                    </Field>
                    <Field label={`Darken for readability (${appearance.backgroundOverlay ?? 45}%)`}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={appearance.backgroundOverlay ?? 45}
                        onChange={(e) => update({ backgroundOverlay: Number(e.target.value) })}
                        className="w-full"
                      />
                    </Field>
                  </div>
                ) : null}

                {backgroundType === "pattern" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Pattern">
                      <Select value={appearance.backgroundPattern ?? "dots"} onChange={(e) => update({ backgroundPattern: e.target.value as AppearanceSettings["backgroundPattern"] })}>
                        {PATTERN_SELECT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Pattern color"><Input type="color" value={appearance.backgroundPatternColor || "#3f8a49"} onChange={(e) => update({ backgroundPatternColor: e.target.value })} /></Field>
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-2">
                      <span className="text-sm font-medium">Animate pattern</span>
                      <Switch label="Animate pattern" checked={appearance.backgroundPatternAnimated !== false} onCheckedChange={(v) => update({ backgroundPatternAnimated: v })} />
                    </div>
                  </div>
                ) : null}

                {backgroundType === "preset" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Floating icon pack">
                      <Select value={appearance.backgroundPreset || "cafe"} onChange={(e) => update({ backgroundPreset: e.target.value })}>
                        {PATTERN_SELECT_OPTIONS.filter((option) => option.value !== "none" && ["cafe", "bakery", "drinks", "dessert", "leaves", "utensils", "hearts", "beans", "sparkles", "mixed"].includes(option.value)).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <p className="self-end text-sm text-muted-foreground">Drifting café icons (desktop). Hidden on phones for scroll performance.</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : <Save className="me-2 h-4 w-4" aria-hidden />}
                {saving ? "Saving…" : "Save design"}
              </Button>
              {message ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> {message}
                </span>
              ) : null}
              {error ? <span className="text-sm text-destructive">{error}</span> : null}
            </div>
          </>
        ) : null}
      </div>

      {/* Live preview */}
      {slug && !loading ? (
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
            <CardContent>
              <DesignPreview activeTab={activeDesignerTab} appearance={appearance} general={general} menu={menu} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function previewBackgroundStyle(appearance: AppearanceSettings): React.CSSProperties {
  const type = appearance.backgroundType ?? "preset";
  if (type === "solid") return { backgroundColor: appearance.backgroundColor || "#ffffff" };
  if (type === "gradient") return { backgroundImage: `linear-gradient(to bottom, ${appearance.backgroundGradientFrom || "#ecfdf5"}, ${appearance.backgroundGradientTo || "#ffffff"})` };
  if (type === "image" && appearance.backgroundImageUrl) {
    const imageStyle = appearance.backgroundImageStyle ?? "cover";
    return {
      backgroundImage: `url(${appearance.backgroundImageUrl})`,
      backgroundSize: imageStyle === "tile" ? "120px auto" : imageStyle,
      backgroundPosition: "center",
      backgroundRepeat: imageStyle === "tile" ? "repeat" : "no-repeat"
    };
  }
  if (type === "pattern") {
    return {
      backgroundColor: appearance.backgroundColor || "#ffffff",
      ...designerPatternStyle(appearance.backgroundPattern ?? "dots", appearance.backgroundPatternColor || "#3f8a49")
    };
  }
  return { backgroundImage: "linear-gradient(to bottom, #ecfdf5, #ffffff)" };
}

function formatHourLabel(hour: number) {
  if (hour === 24) return "24:00";
  return `${String(hour).padStart(2, "0")}:00`;
}

function designerPatternStyle(pattern: string, color: string): React.CSSProperties {
  if (isFloatingIconPattern(pattern)) {
    return {
      color,
      opacity: 0.22,
      backgroundImage: "radial-gradient(currentColor 2px, transparent 2px), radial-gradient(currentColor 1.5px, transparent 1.5px)",
      backgroundPosition: "0 0, 24px 24px",
      backgroundSize: "48px 48px"
    };
  }
  return cssPatternStyle(pattern, color, 0.2);
}

// Lightweight sample of the menu (header + background + two cards) rendered with
// the chosen appearance so header/search/card/background changes are visible
// before saving. Uses the same MenuItemCard and theme-variable injection as the
// live menu.
function DesignPreview({
  activeTab,
  appearance,
  general,
  menu
}: {
  activeTab: DesignerTab;
  appearance: AppearanceSettings;
  general: GeneralSettings;
  menu: MenuSettings;
}) {
  const overlay = appearance.backgroundType === "image" ? Math.min(100, Math.max(0, appearance.backgroundOverlay ?? 45)) / 100 : 0;
  const cardDesign = appearance.cardDesign ?? "classic";
  const gridClass = cardDesign === "compact" ? "grid gap-3" : "grid gap-4 sm:grid-cols-2";
  const isDark = appearance.defaultTheme === "dark";
  const align = appearance.headerAlign ?? "left";
  const headerBg = appearance.headerBackgroundType ?? "theme";
  const headerStyle: React.CSSProperties | undefined =
    headerBg === "solid"
      ? { backgroundColor: appearance.headerBackgroundColor || "#ffffff" }
      : headerBg === "gradient"
        ? { backgroundImage: `linear-gradient(to bottom, ${appearance.headerGradientFrom || "#ecfdf5"}, ${appearance.headerGradientTo || "#ffffff"})` }
        : undefined;
  const searchSample = cn(
    "mt-2 flex items-center border px-3 text-xs text-muted-foreground",
    (appearance.searchSize ?? "normal") === "large" ? "h-9" : "h-8",
    (appearance.searchShape ?? "pill") === "pill" ? "rounded-full" : appearance.searchShape === "square" ? "rounded-none" : "rounded-md",
    (appearance.searchStyle ?? "outlined") === "filled" ? "border-transparent bg-muted" : "bg-background"
  );
  const name = general.restaurantName.en || "Cafe";
  const promo = general.promoText?.en;
  const locale = useMemo(() => "en" as const, []);

  if (activeTab === "welcome") {
    return <WelcomePreview appearance={appearance} general={general} menu={menu} />;
  }

  return (
    <div className={cn("space-y-4", isDark && "dark")}>
      <div className="relative overflow-hidden rounded-xl border" style={{ ...menuThemeStyle(appearance) }}>
        <div className="absolute inset-0" style={previewBackgroundStyle(appearance)} aria-hidden />
        {overlay ? <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} aria-hidden /> : null}
        <div className="relative">
          {/* header sample */}
          <div className={cn("border-b p-3", headerBg === "theme" && "bg-gradient-to-b from-accent/55 to-card/90")} style={headerStyle}>
            <div className={cn("flex items-center gap-2", align === "center" && "flex-col text-center")}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">{name.slice(0, 2)}</span>
              <span className="text-sm font-bold">{name}</span>
            </div>
            {(appearance.searchPlacement ?? "header") === "header" ? <div className={searchSample}>Search…</div> : null}
          </div>
          {/* promo sample */}
          {(appearance.aboveCategory ?? "none") === "promo" && promo ? (
            <div className="px-3 py-1.5 text-center text-xs font-semibold" style={{ backgroundColor: appearance.promoColor || "#0f766e", color: `hsl(${readableForegroundHslVar(appearance.promoColor || "#0f766e") || "0 0% 100%"})` }}>
              {promo}
            </div>
          ) : null}
          {/* body sample */}
          <div className="space-y-3 p-4">
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Coffee</div>
            <div className={gridClass}>
              {SAMPLE_ITEMS.map((item) => (
                <MenuItemCard key={item.id} item={item} locale={locale} settings={menu} appearance={appearance} logoUrl={general.logoUrl} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomePreview({ appearance, general, menu }: { appearance: AppearanceSettings; general: GeneralSettings; menu: MenuSettings }) {
  const accent = appearance.welcomeAccentColor || appearance.primaryColor || "#A4D8A6";
  const name = general.restaurantName.en || "Cafe";
  const header = general.welcomeHeader?.en || "Welcome to";
  const tagline = general.welcomeTagline?.en || "Freshly brewed, just for you";
  const pattern = appearance.welcomeBackgroundPattern ?? "cafe";
  const cardPattern = appearance.welcomeCardPattern ?? "none";
  const foreground = appearance.welcomeFormTextColor || undefined;
  const headerColor = appearance.welcomeHeaderTextColor || accent;
  const helperColor = appearance.welcomeHelperTextColor || foreground;
  const helperStyle = helperColor ? { color: helperColor } : undefined;
  const previewThemeStyle = menuThemeStyle({ ...appearance, primaryColor: accent });

  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border p-4" style={{ ...previewThemeStyle, ...welcomePreviewBackgroundStyle(appearance) }}>
      <WelcomePreviewBackgroundVideo appearance={appearance} />
      {pattern !== "none" ? <div className="absolute inset-0" style={welcomePreviewPatternStyle(pattern, appearance.welcomeBackgroundPatternColor || accent, pattern === "cafe" ? 0.14 : 0.2)} aria-hidden /> : null}
      <div
        className={cn("relative mx-auto mt-5 max-w-[260px] overflow-hidden p-5 text-center", welcomePreviewCardClass(appearance))}
        style={{
          backgroundColor: welcomePreviewFormBackgroundColor(appearance),
          borderColor: appearance.welcomeFormBorderColor || undefined,
          color: foreground,
          ...welcomePreviewBlurStyle(appearance.welcomeFormBlur)
        }}
      >
        {cardPattern !== "none" ? <div className="absolute inset-0" style={welcomePreviewPatternStyle(cardPattern, appearance.welcomeBackgroundPatternColor || accent, 0.08)} aria-hidden /> : null}
        <div className="relative space-y-3">
          {menu.enableDarkMode !== false ? <div className="absolute right-0 top-0 h-8 w-8 rounded-full border bg-background/80" /> : null}
          <p className={cn("text-sm font-bold", menu.enableDarkMode !== false && "pr-10")} style={{ color: headerColor }}>{header}</p>
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 ring-4 ring-white/60" style={welcomePreviewLogoStyle(appearance)} />
          <h3 className="text-xl font-bold" style={{ color: foreground }}>{name}</h3>
          <p className="text-xs text-muted-foreground" style={helperStyle}>{tagline}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" style={helperStyle}>Choose your language</p>
          <div className={cn("mx-auto flex justify-center gap-1.5", (appearance.welcomeLanguageStyle ?? "buttons") === "cards" && "grid w-full grid-cols-3")}>
            {["کوردی", "العربية", "EN"].map((label, index) => (
              <span
                key={label}
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] font-semibold",
                  index === 0 ? "bg-primary text-primary-foreground" : "bg-background/70 text-muted-foreground",
                  (appearance.welcomeLanguageStyle ?? "buttons") === "cards" && "rounded-lg py-2"
                )}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="h-9 rounded-full bg-primary" />
          <p className="text-[10px] font-medium text-muted-foreground" style={helperStyle}>Find us on social media</p>
        </div>
      </div>
    </div>
  );
}

function welcomePreviewLogoStyle(appearance: AppearanceSettings): React.CSSProperties {
  const style = appearance.welcomeLogoStyle ?? "circle";
  if (style === "square") return { borderRadius: "0.5rem" };
  if (style === "rounded") return { borderRadius: "1rem" };
  return { borderRadius: "9999px" };
}

function welcomePreviewBackgroundStyle(appearance: AppearanceSettings): React.CSSProperties {
  const style = appearance.welcomeBackgroundStyle ?? "gradient";
  const overlay = Math.min(100, Math.max(0, appearance.welcomeBackgroundOverlay ?? 15)) / 100;
  if (style === "image" && appearance.welcomeBackgroundImageUrl && !isWelcomePreviewBackgroundVideo(appearance)) {
    return {
      backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8",
      backgroundImage: `linear-gradient(rgba(0, 0, 0, ${overlay}), rgba(0, 0, 0, ${overlay})), url(${appearance.welcomeBackgroundImageUrl})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover"
    };
  }
  if (style === "image") return { backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8" };
  if (style === "solid" || style === "pattern") return { backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8" };
  return {
    backgroundImage: `linear-gradient(135deg, ${appearance.welcomeBackgroundGradientFrom || "#d7efd8"}, ${appearance.welcomeAccentColor || "#A4D8A6"}, ${appearance.welcomeBackgroundGradientTo || "#86cc8a"})`
  };
}

function WelcomePreviewBackgroundVideo({ appearance }: { appearance: AppearanceSettings }) {
  if (!isWelcomePreviewBackgroundVideo(appearance)) return null;
  return (
    <>
      <video
        src={appearance.welcomeBackgroundImageUrl}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: Math.min(100, Math.max(0, appearance.welcomeBackgroundOverlay ?? 15)) / 100 }} aria-hidden />
    </>
  );
}

function isWelcomePreviewBackgroundVideo(appearance: AppearanceSettings) {
  const url = appearance.welcomeBackgroundImageUrl;
  if (!url || (appearance.welcomeBackgroundStyle ?? "gradient") !== "image") return false;
  return appearance.welcomeBackgroundMediaType === "video" || /\.(mp4|webm)(\?.*)?$/i.test(url);
}

function welcomePreviewCardClass(appearance: AppearanceSettings) {
  const style = appearance.welcomeCardStyle ?? "glass";
  if (style === "solid") return "rounded-2xl border bg-card shadow-xl";
  if (style === "outlined") return "rounded-2xl border-2 border-primary/35 bg-background/80 shadow-xl backdrop-blur";
  if (style === "floating") return "rounded-[2rem] border bg-card shadow-2xl shadow-primary/20";
  return "rounded-3xl border border-primary/35 bg-card/85 shadow-2xl backdrop-blur-xl";
}

function welcomePreviewBlurStyle(value: number | undefined): React.CSSProperties {
  if (typeof value !== "number" || Number.isNaN(value)) return {};
  const blur = Math.min(40, Math.max(0, value));
  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`
  };
}

function welcomePreviewFormBackgroundColor(appearance: AppearanceSettings) {
  const transparency = normalizeWelcomePreviewTransparency(appearance.welcomeFormTransparency);
  if (transparency === undefined) return appearance.welcomeFormColor || undefined;
  const alpha = 1 - transparency / 100;
  if (!appearance.welcomeFormColor) return `hsl(var(--card) / ${alpha.toFixed(2)})`;
  return hexToRgba(appearance.welcomeFormColor, alpha) || appearance.welcomeFormColor;
}

function normalizeWelcomePreviewTransparency(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, value));
}

function welcomePreviewPatternStyle(pattern: string, color: string, opacity: number): React.CSSProperties {
  if (isFloatingIconPattern(pattern)) {
    return {
      color,
      opacity,
      backgroundImage: "radial-gradient(currentColor 2px, transparent 2px), radial-gradient(currentColor 1.5px, transparent 1.5px)",
      backgroundPosition: "0 0, 24px 24px",
      backgroundSize: "48px 48px"
    };
  }
  return cssPatternStyle(pattern, color, opacity);
}
