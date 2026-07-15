/**
 * Shared menu/welcome background patterns: floating icon packs + CSS textures.
 */
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bean,
  CakeSlice,
  Cherry,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Donut,
  Droplets,
  Flame,
  Flower2,
  GlassWater,
  Heart,
  IceCreamCone,
  Leaf,
  Martini,
  Milk,
  Pizza,
  Sandwich,
  Sparkles,
  Star,
  UtensilsCrossed,
  Wine
} from "lucide-react";

export const FLOATING_ICON_PATTERNS = [
  "cafe",
  "bakery",
  "drinks",
  "dessert",
  "leaves",
  "utensils",
  "hearts",
  "beans",
  "sparkles",
  "mixed"
] as const;

export type FloatingIconPattern = (typeof FLOATING_ICON_PATTERNS)[number];

export const CSS_PATTERN_VALUES = [
  "none",
  "dots",
  "grid",
  "diagonal",
  "waves",
  "checker",
  "confetti",
  "stars",
  "mesh",
  "honeycomb",
  "crosshatch",
  "chevron",
  "diamonds",
  "plus",
  "rings",
  "rain",
  "herringbone",
  "bubbles",
  "triangles",
  "mosaic",
  "circuit",
  "polka",
  "stripes",
  "scatter"
] as const;

export type CssPattern = (typeof CSS_PATTERN_VALUES)[number];

export type MenuSurfacePattern = FloatingIconPattern | CssPattern;

export type FigureSpec = {
  Icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  delay: string;
  opacity: number;
};

const LAYOUTS: Omit<FigureSpec, "Icon">[] = [
  { top: "8%", left: "5%", size: 34, delay: "0s", opacity: 0.14 },
  { top: "16%", left: "89%", size: 36, delay: "1.2s", opacity: 0.13 },
  { top: "34%", left: "3%", size: 32, delay: "0.6s", opacity: 0.14 },
  { top: "44%", left: "94%", size: 30, delay: "1s", opacity: 0.13 },
  { top: "62%", left: "6%", size: 32, delay: "2s", opacity: 0.14 },
  { top: "70%", left: "91%", size: 34, delay: "0.4s", opacity: 0.13 },
  { top: "86%", left: "10%", size: 32, delay: "1.6s", opacity: 0.14 },
  { top: "90%", left: "85%", size: 28, delay: "2.4s", opacity: 0.13 },
  { top: "52%", left: "48%", size: 26, delay: "1.8s", opacity: 0.1 },
  { top: "24%", left: "42%", size: 22, delay: "3s", opacity: 0.09 }
];

const ICON_SETS: Record<FloatingIconPattern, LucideIcon[]> = {
  cafe: [Coffee, Martini, Croissant, CupSoda, CakeSlice, Pizza, Sandwich, GlassWater, Coffee, Bean],
  bakery: [Croissant, Cookie, Donut, CakeSlice, Sandwich, Donut, Cookie, Croissant, CakeSlice, Cookie],
  drinks: [Coffee, CupSoda, Martini, GlassWater, Wine, Milk, Droplets, Coffee, CupSoda, Martini],
  dessert: [CakeSlice, IceCreamCone, Cookie, Donut, Cherry, CakeSlice, IceCreamCone, Cookie, Donut, Cherry],
  leaves: [Leaf, Flower2, Leaf, Sparkles, Flower2, Leaf, Flower2, Leaf, Sparkles, Flower2],
  utensils: [UtensilsCrossed, Flame, Sandwich, Pizza, UtensilsCrossed, Flame, Sandwich, Pizza, UtensilsCrossed, Flame],
  hearts: [Heart, Sparkles, Heart, Star, Heart, Sparkles, Heart, Star, Heart, Sparkles],
  beans: [Bean, Coffee, Bean, Coffee, Bean, Coffee, Bean, Coffee, Bean, Coffee],
  sparkles: [Sparkles, Star, Sparkles, Star, Sparkles, Star, Sparkles, Star, Sparkles, Star],
  mixed: [Coffee, Leaf, CakeSlice, Heart, Croissant, Sparkles, CupSoda, Bean, Pizza, Flower2]
};

export function isFloatingIconPattern(pattern: string | undefined): pattern is FloatingIconPattern {
  return !!pattern && (FLOATING_ICON_PATTERNS as readonly string[]).includes(pattern);
}

export function floatingFigures(pattern: FloatingIconPattern): FigureSpec[] {
  const icons = ICON_SETS[pattern] || ICON_SETS.cafe;
  return LAYOUTS.map((layout, index) => ({
    ...layout,
    Icon: icons[index % icons.length]
  }));
}

export function cssPatternStyle(pattern: string, color: string, opacity = 0.18): CSSProperties {
  const base: CSSProperties = { color, opacity };
  switch (pattern) {
    case "grid":
      return {
        ...base,
        backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
        backgroundSize: "34px 34px"
      };
    case "diagonal":
      return {
        ...base,
        backgroundImage: "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 18px)"
      };
    case "waves":
      return {
        ...base,
        backgroundImage: "radial-gradient(70% 60% at 50% 100%, transparent 58%, currentColor 60%, transparent 62%)",
        backgroundSize: "58px 32px"
      };
    case "checker":
      return {
        ...base,
        backgroundImage:
          "linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%), linear-gradient(45deg, transparent 75%, currentColor 75%), linear-gradient(-45deg, transparent 75%, currentColor 75%)",
        backgroundPosition: "0 0, 0 14px, 14px -14px, -14px 0",
        backgroundSize: "28px 28px"
      };
    case "confetti":
      return {
        ...base,
        backgroundImage:
          "radial-gradient(circle at 20% 30%, currentColor 0 2px, transparent 2px), radial-gradient(circle at 70% 65%, currentColor 0 1.5px, transparent 1.5px), linear-gradient(35deg, transparent 45%, currentColor 45% 48%, transparent 48%)",
        backgroundSize: "64px 64px"
      };
    case "stars":
      return {
        ...base,
        backgroundImage:
          "radial-gradient(circle at 50% 50%, currentColor 0 1.4px, transparent 1.6px), radial-gradient(circle at 15% 20%, currentColor 0 1px, transparent 1.2px)",
        backgroundSize: "44px 44px"
      };
    case "mesh":
      return {
        ...base,
        opacity: Math.min(1, opacity + 0.08),
        backgroundImage:
          "radial-gradient(circle at 20% 20%, currentColor, transparent 30%), radial-gradient(circle at 80% 30%, currentColor, transparent 28%), radial-gradient(circle at 45% 80%, currentColor, transparent 34%)",
        backgroundSize: "360px 360px"
      };
    case "honeycomb":
      return {
        ...base,
        backgroundImage:
          "radial-gradient(circle farthest-side at 0% 50%, transparent 96%, currentColor 98% 99%, transparent 101%), radial-gradient(circle farthest-side at 100% 50%, transparent 96%, currentColor 98% 99%, transparent 101%)",
        backgroundSize: "28px 48px",
        backgroundPosition: "0 0, 14px 24px"
      };
    case "crosshatch":
      return {
        ...base,
        backgroundImage:
          "repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 14px), repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 14px)"
      };
    case "chevron":
      return {
        ...base,
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent 0 10px, currentColor 10px 11px, transparent 11px 20px), repeating-linear-gradient(-45deg, transparent 0 10px, currentColor 10px 11px, transparent 11px 20px)"
      };
    case "diamonds":
      return {
        ...base,
        backgroundImage:
          "linear-gradient(45deg, transparent 46%, currentColor 46% 54%, transparent 54%), linear-gradient(-45deg, transparent 46%, currentColor 46% 54%, transparent 54%)",
        backgroundSize: "22px 22px"
      };
    case "plus":
      return {
        ...base,
        backgroundImage:
          "linear-gradient(currentColor 0 0), linear-gradient(currentColor 0 0)",
        backgroundSize: "10px 1.5px, 1.5px 10px",
        backgroundPosition: "center",
        backgroundRepeat: "space"
      };
    case "rings":
      return {
        ...base,
        backgroundImage: "radial-gradient(circle, transparent 55%, currentColor 57% 60%, transparent 62%)",
        backgroundSize: "36px 36px"
      };
    case "rain":
      return {
        ...base,
        backgroundImage: "repeating-linear-gradient(110deg, transparent 0 10px, currentColor 10px 11px, transparent 11px 22px)"
      };
    case "herringbone":
      return {
        ...base,
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent 0 8px, currentColor 8px 9px, transparent 9px 16px), repeating-linear-gradient(-45deg, transparent 0 8px, currentColor 8px 9px, transparent 9px 16px)"
      };
    case "bubbles":
      return {
        ...base,
        backgroundImage:
          "radial-gradient(circle at 25% 25%, currentColor 0 3px, transparent 3.5px), radial-gradient(circle at 75% 60%, currentColor 0 2px, transparent 2.5px), radial-gradient(circle at 40% 80%, currentColor 0 4px, transparent 4.5px)",
        backgroundSize: "52px 52px"
      };
    case "triangles":
      return {
        ...base,
        backgroundImage: "repeating-linear-gradient(60deg, transparent 0 12px, currentColor 12px 13px, transparent 13px 24px)"
      };
    case "mosaic":
      return {
        ...base,
        backgroundImage:
          "linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(currentColor 1px, transparent 1px), linear-gradient(45deg, transparent 48%, currentColor 49% 51%, transparent 52%)",
        backgroundSize: "40px 40px, 40px 40px, 20px 20px"
      };
    case "circuit":
      return {
        ...base,
        backgroundImage:
          "radial-gradient(circle at 20% 30%, currentColor 0 1.5px, transparent 2px), radial-gradient(circle at 70% 60%, currentColor 0 1.5px, transparent 2px), linear-gradient(90deg, transparent 48%, currentColor 49% 51%, transparent 52%), linear-gradient(transparent 48%, currentColor 49% 51%, transparent 52%)",
        backgroundSize: "48px 48px"
      };
    case "polka":
      return {
        ...base,
        backgroundImage: "radial-gradient(currentColor 3.5px, transparent 3.5px)",
        backgroundSize: "28px 28px"
      };
    case "stripes":
      return {
        ...base,
        backgroundImage: "repeating-linear-gradient(90deg, transparent 0 14px, currentColor 14px 15px)"
      };
    case "scatter":
      return {
        ...base,
        backgroundImage:
          "radial-gradient(circle at 10% 20%, currentColor 0 1px, transparent 1.5px), radial-gradient(circle at 80% 40%, currentColor 0 1.5px, transparent 2px), radial-gradient(circle at 35% 75%, currentColor 0 1px, transparent 1.5px), radial-gradient(circle at 60% 15%, currentColor 0 2px, transparent 2.5px)",
        backgroundSize: "56px 56px"
      };
    case "none":
      return { ...base, opacity: 0 };
    case "dots":
    default:
      return {
        ...base,
        backgroundImage: "radial-gradient(currentColor 1.6px, transparent 1.6px)",
        backgroundSize: "22px 22px"
      };
  }
}

/** Designer dropdown options: floating packs first, then CSS textures. */
export const PATTERN_SELECT_OPTIONS: Array<{ value: MenuSurfacePattern; label: string }> = [
  { value: "none", label: "None" },
  { value: "cafe", label: "Floating cafe icons" },
  { value: "bakery", label: "Floating bakery icons" },
  { value: "drinks", label: "Floating drink icons" },
  { value: "dessert", label: "Floating dessert icons" },
  { value: "leaves", label: "Floating leaves & flowers" },
  { value: "utensils", label: "Floating utensils" },
  { value: "hearts", label: "Floating hearts" },
  { value: "beans", label: "Floating coffee beans" },
  { value: "sparkles", label: "Floating sparkles" },
  { value: "mixed", label: "Floating mixed cafe" },
  { value: "dots", label: "Dots" },
  { value: "grid", label: "Grid" },
  { value: "diagonal", label: "Diagonal lines" },
  { value: "waves", label: "Waves" },
  { value: "checker", label: "Checker" },
  { value: "confetti", label: "Confetti" },
  { value: "stars", label: "Stars" },
  { value: "mesh", label: "Soft mesh" },
  { value: "honeycomb", label: "Honeycomb" },
  { value: "crosshatch", label: "Crosshatch" },
  { value: "chevron", label: "Chevron" },
  { value: "diamonds", label: "Diamonds" },
  { value: "plus", label: "Plus marks" },
  { value: "rings", label: "Rings" },
  { value: "rain", label: "Rain lines" },
  { value: "herringbone", label: "Herringbone" },
  { value: "bubbles", label: "Bubbles" },
  { value: "triangles", label: "Triangles" },
  { value: "mosaic", label: "Mosaic tiles" },
  { value: "circuit", label: "Circuit dots" },
  { value: "polka", label: "Large polka" },
  { value: "stripes", label: "Soft stripes" },
  { value: "scatter", label: "Scattered dots" }
];

/** Card-friendly subset (no floating icons — they need a full-bleed layer). */
export const CARD_PATTERN_SELECT_OPTIONS = PATTERN_SELECT_OPTIONS.filter(
  (option) => option.value === "none" || !isFloatingIconPattern(option.value)
);
