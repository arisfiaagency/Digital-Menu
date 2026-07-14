"use client";

import { useEffect, type CSSProperties } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CakeSlice,
  Coffee,
  Croissant,
  CupSoda,
  GlassWater,
  Martini,
  Pizza
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/menu/language-selector";
import { ThemeToggle } from "@/components/menu/theme-toggle";
import { useLocale, publicLocaleChangeEvent, publicLocaleStorageKey } from "@/hooks/use-locale";
import { localized, translate } from "@/lib/i18n/config";
import { defaultAppData } from "@/data/default-data";
import { cn } from "@/lib/utils/cn";
import { SocialLinks } from "@/components/menu/social-links";
import { BrandCredit } from "@/components/brand-credit";
import { hexToHslVar, readableForegroundHslVar } from "@/lib/utils/color";
import type { AppearanceSettings, GeneralSettings, MenuSettings, WelcomePattern } from "@/types/models";

// The welcome screen always opens in this language, regardless of any previously
// stored public locale.
const WELCOME_DEFAULT_LOCALE = "ckb";

export function WelcomeScreen({
  initialGeneral,
  initialSocial,
  initialAppearance,
  initialMenu,
  menuHref = "/menu"
}: {
  initialGeneral?: GeneralSettings;
  initialSocial?: GeneralSettings["socialLinks"];
  initialAppearance?: AppearanceSettings;
  initialMenu?: MenuSettings;
  menuHref?: string;
}) {
  const { locale, setLocale, dir: textDir } = useLocale(WELCOME_DEFAULT_LOCALE, {
    documentDirection: "ltr",
    readStored: false
  });
  const general = initialGeneral ?? defaultAppData.general;
  const menu = initialMenu ?? defaultAppData.menu;
  const appearance = initialAppearance ?? defaultAppData.appearance;
  const restaurantName = localized(general.restaurantName, locale);
  const welcomeHeader = localized(general.welcomeHeader, locale, translate(locale, "welcome.greeting"));
  const logoUrl = general.logoUrl;

  // Live social links come from the server (falls back to default data). No
  // client Firebase fetch — the welcome page ships zero Firebase.
  const social = initialSocial ?? general.socialLinks;

  // Brand mint #A4D8A6 (HSL 122 40% 75%) as the accent. Deep-green foreground
  // keeps text legible on the light mint. Scoped to this subtree so the shared
  // Button / selectors recolor here without affecting /menu or /admin.
  const accentColor = appearance.welcomeAccentColor || appearance.primaryColor || "#A4D8A6";
  const accentStyle = welcomeThemeStyle(accentColor);
  const mainStyle = { ...accentStyle, ...welcomeBackgroundStyle(appearance) } as CSSProperties;
  const formTextStyle = appearance.welcomeFormTextColor ? { color: appearance.welcomeFormTextColor } : undefined;
  const mutedTextStyle = appearance.welcomeFormTextColor ? { color: appearance.welcomeFormTextColor, opacity: 0.72 } : undefined;

  // The welcome always shows Kurdish by default, but the menu reads the persisted
  // locale (`stone-cafe-menu-locale`). Without syncing, a previously chosen language
  // (e.g. English) lingers in storage, so pressing Enter on the Kurdish-looking
  // welcome would still load the menu in that old language. Reset storage to the
  // welcome default on open so "what you see is what you get"; an explicit pick on
  // the welcome still overwrites it and carries into the menu.
  useEffect(() => {
    window.localStorage.setItem(publicLocaleStorageKey, WELCOME_DEFAULT_LOCALE);
    window.dispatchEvent(new CustomEvent(publicLocaleChangeEvent, { detail: WELCOME_DEFAULT_LOCALE }));
  }, []);

  // Lock the page to a single, non-scrollable screen (prevents iOS Safari
  // rubber-band overscroll). Reverted on unmount so /menu can scroll normally.
  useEffect(() => {
    document.documentElement.classList.add("overflow-lock");
    document.body.classList.add("overflow-lock");
    return () => {
      document.documentElement.classList.remove("overflow-lock");
      document.body.classList.remove("overflow-lock");
    };
  }, []);

  // The welcome page pins `position: fixed` on <body> for the scroll lock.
  // Release it before leaving so the browser tears the lock down cleanly and
  // never shows /menu clipped behind a leftover fixed body.
  function releaseScrollLock() {
    document.documentElement.classList.remove("overflow-lock");
    document.body.classList.remove("overflow-lock");
  }

  return (
    <main
      dir="ltr"
      style={mainStyle}
      className="no-select fixed inset-0 flex touch-none items-center justify-center overflow-hidden overscroll-none p-4"
    >
      <WelcomeBackgroundPattern appearance={appearance} />

      <section
        className={cn("relative z-10 w-full max-w-md overflow-hidden p-6 text-center sm:p-8", welcomeCardClass(appearance))}
        style={welcomeCardStyle(appearance)}
      >
        <WelcomePatternLayer
          pattern={appearance.welcomeCardPattern ?? "none"}
          color={appearance.welcomeBackgroundPatternColor || accentColor}
          opacity={0.08}
        />
        <div className="relative z-10">
        {/* Fixed physical corner (right) so it doesn't move when the selected
            language flips the page direction. */}
        {menu.enableDarkMode !== false ? (
          <ThemeToggle
            presentation={appearance.welcomeThemeToggleStyle ?? "circle"}
            iconStyle={appearance.welcomeThemeIconStyle ?? "sunMoon"}
            className="absolute right-4 top-4 z-20 border-primary/35 bg-background/70 shadow-sm backdrop-blur hover:bg-muted"
          />
        ) : null}

        <p
          dir={textDir}
          style={{ color: accentColor }}
          className={cn(
            "font-bold",
            // Arabic/Kurdish letters join up, so letter-spacing looks broken —
            // drop it there and make the greeting larger. English keeps the
            // uppercase tracked-label look.
            textDir === "rtl" ? "text-2xl tracking-normal" : "text-sm uppercase tracking-[0.2em]"
          )}
        >
          {welcomeHeader}
        </p>

        {/* Logo (placeholder steaming cup when no logo is set) */}
        <div className="mx-auto my-4 flex flex-col items-center gap-2">
          <div
            className={cn(
              "relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full shadow-lg ring-4",
              logoUrl
                ? "ring-white/70 dark:ring-white/10"
                : "bg-gradient-to-br from-amber-400 to-orange-600 ring-amber-200/50 dark:ring-amber-900/40"
            )}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={restaurantName}
                width={112}
                height={112}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <SteamingCup />
            )}
          </div>
          {!logoUrl ? (
            <span dir={textDir} className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {translate(locale, "welcome.logoHint")}
            </span>
          ) : null}
        </div>

        <h1 dir={textDir} className="text-3xl font-bold text-foreground" style={formTextStyle}>
          {restaurantName}
        </h1>
        <p dir={textDir} className="text-sm text-muted-foreground" style={mutedTextStyle}>
          {translate(locale, "welcome.tagline")}
        </p>

        {/* Language */}
        <div className="mt-6 space-y-3">
          <p
            dir={textDir}
            className={cn(
              "font-semibold text-muted-foreground",
              // Arabic/Kurdish are connected scripts — letter-spacing + uppercase
              // break the glyphs, so only the Latin (English) label gets them.
              textDir === "rtl" ? "text-sm tracking-normal" : "text-xs uppercase tracking-wide"
            )}
            style={mutedTextStyle}
          >
            {translate(locale, "welcome.chooseLanguage")}
          </p>
          {/* Fixed ltr order so the buttons keep their position when the
              selected language flips the page between rtl and ltr. */}
          <div className="flex justify-center" dir="ltr">
            <LanguageSelector locale={locale} onChange={setLocale} variant={appearance.welcomeLanguageStyle ?? "buttons"} />
          </div>
        </div>

        {/* Enter — a plain <a> (hard navigation), NOT next/link. iOS in-app
            browsers (Instagram / Facebook WKWebView) frequently render a blank
            screen after a client-side soft navigation and only paint on manual
            refresh. A full page load reliably paints the server-rendered menu
            and guarantees the fixed-body scroll lock is fully released. The
            chosen language still carries over via localStorage. */}
        <Button asChild size="default" className="mt-8 h-12 w-full text-base font-semibold">
          <a href={menuHref} onClick={releaseScrollLock}>
            <span dir={textDir}>{translate(locale, "welcome.enter")}</span>
            <ArrowRight className="h-5 w-5" aria-hidden />
          </a>
        </Button>

        {social && Object.values(social).some((value) => value?.trim()) ? (
          <div className="mt-6 space-y-2">
            <p dir={textDir} className="text-xs font-medium text-muted-foreground" style={mutedTextStyle}>
              {translate(locale, "welcome.findUsSocial")}
            </p>
            <SocialLinks social={social} className="justify-center" />
          </div>
        ) : null}
        </div>
      </section>

      <BrandCredit className="absolute inset-x-0 bottom-4 z-10 text-[#2f7a3b]/80 dark:text-[#A4D8A6]/70" />
    </main>
  );
}

function SteamingCup() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-white cup-bob" aria-hidden focusable="false">
      {/* steam */}
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
        <path className="steam-wisp" style={{ animationDelay: "0s" }} d="M24 22 c-3.5 -4 3.5 -7 0 -11" />
        <path className="steam-wisp" style={{ animationDelay: "0.7s" }} d="M32 21 c-3.5 -4 3.5 -7 0 -11" />
        <path className="steam-wisp" style={{ animationDelay: "1.3s" }} d="M40 22 c-3.5 -4 3.5 -7 0 -11" />
      </g>
      {/* cup */}
      <path d="M14 28 H46 V35 A16 16 0 0 1 30 51 A16 16 0 0 1 14 35 Z" fill="currentColor" />
      {/* handle */}
      <path d="M46 31 a8 8 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="4" />
      {/* coffee surface */}
      <ellipse cx="30" cy="28" rx="16" ry="3" fill="#6f4e37" />
      {/* saucer */}
      <ellipse cx="30" cy="54" rx="22" ry="3.4" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function welcomeThemeStyle(accentColor: string): CSSProperties {
  const primary = hexToHslVar(accentColor) || "122 40% 75%";
  return {
    "--primary": primary,
    "--primary-foreground": readableForegroundHslVar(accentColor) || "128 44% 14%",
    "--ring": primary
  } as CSSProperties;
}

function welcomeBackgroundStyle(appearance: AppearanceSettings): CSSProperties {
  const design = appearance.welcomeBackgroundStyle ?? "gradient";
  if (design === "image" && appearance.welcomeBackgroundImageUrl) {
    return {
      backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8",
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.14)), url(${appearance.welcomeBackgroundImageUrl})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover"
    };
  }
  if (design === "solid" || design === "pattern") {
    return { backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8" };
  }
  return {
    backgroundImage: `linear-gradient(135deg, ${appearance.welcomeBackgroundGradientFrom || "#d7efd8"}, ${appearance.welcomeAccentColor || "#A4D8A6"}, ${appearance.welcomeBackgroundGradientTo || "#86cc8a"})`
  };
}

function welcomeCardClass(appearance: AppearanceSettings) {
  const style = appearance.welcomeCardStyle ?? "glass";
  if (style === "solid") return "rounded-2xl border border-border bg-card shadow-xl";
  if (style === "outlined") return "rounded-2xl border-2 border-primary/35 bg-background/80 shadow-xl backdrop-blur";
  if (style === "floating") return "rounded-[2rem] border border-white/50 bg-card shadow-2xl shadow-primary/20";
  return "rounded-3xl border border-primary/35 bg-card/85 shadow-2xl backdrop-blur-xl";
}

function welcomeCardStyle(appearance: AppearanceSettings): CSSProperties {
  const style: CSSProperties = {};
  if (appearance.welcomeFormColor) style.backgroundColor = appearance.welcomeFormColor;
  if (appearance.welcomeFormTextColor) style.color = appearance.welcomeFormTextColor;
  if (appearance.welcomeFormBorderColor) style.borderColor = appearance.welcomeFormBorderColor;
  return style;
}

function WelcomeBackgroundPattern({ appearance }: { appearance: AppearanceSettings }) {
  const pattern = appearance.welcomeBackgroundPattern ?? "cafe";
  const color = appearance.welcomeBackgroundPatternColor || appearance.welcomeAccentColor || "#3f8a49";
  if (pattern === "none") return null;
  if (pattern === "cafe") return <CoffeeBackground color={color} />;
  return <WelcomePatternLayer pattern={pattern} color={color} opacity={0.16} />;
}

function WelcomePatternLayer({
  pattern,
  color,
  opacity
}: {
  pattern: WelcomePattern;
  color: string;
  opacity: number;
}) {
  if (pattern === "none" || pattern === "cafe") return null;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={welcomePatternStyle(pattern, color, opacity)}
      aria-hidden
    />
  );
}

function welcomePatternStyle(pattern: WelcomePattern, color: string, opacity: number): CSSProperties {
  const base: CSSProperties = {
    color,
    opacity
  };
  if (pattern === "dots") {
    return {
      ...base,
      backgroundImage: "radial-gradient(currentColor 1.4px, transparent 1.4px)",
      backgroundSize: "18px 18px"
    };
  }
  if (pattern === "grid") {
    return {
      ...base,
      backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
      backgroundSize: "28px 28px"
    };
  }
  if (pattern === "diagonal") {
    return {
      ...base,
      backgroundImage: "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 16px)"
    };
  }
  return {
    ...base,
    backgroundImage: "radial-gradient(70% 60% at 50% 100%, transparent 58%, currentColor 60%, transparent 62%)",
    backgroundSize: "42px 24px"
  };
}

function CoffeeBackground({ color }: { color?: string }) {
  // Floating figures representing the cafe menu: coffee, mocktails, other
  // non-alcoholic drinks, cinnamon rolls, trileçe (tralicha), and mini pizza.
  const figures = [
    { Icon: Coffee, top: "11%", left: "9%", size: 30, delay: "0s", opacity: 0.16 },
    { Icon: Martini, top: "20%", left: "84%", size: 34, delay: "1.2s", opacity: 0.15 },
    { Icon: Pizza, top: "70%", left: "11%", size: 32, delay: "0.7s", opacity: 0.16 },
    { Icon: CakeSlice, top: "79%", left: "82%", size: 28, delay: "2s", opacity: 0.17 },
    { Icon: CupSoda, top: "43%", left: "91%", size: 26, delay: "1s", opacity: 0.15 },
    { Icon: Croissant, top: "85%", left: "46%", size: 30, delay: "0.4s", opacity: 0.14 },
    { Icon: GlassWater, top: "31%", left: "5%", size: 24, delay: "1.6s", opacity: 0.16 },
    { Icon: Coffee, top: "57%", left: "93%", size: 20, delay: "2.4s", opacity: 0.12 }
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* mint aroma glows (+ a soft light glow) */}
      <div className="aroma-1 aroma-pan absolute -left-24 -top-24 h-80 w-80" />
      <div
        className="aroma-2 aroma-pan absolute -bottom-32 -right-20 h-96 w-96"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="aroma-3 aroma-pan absolute right-1/3 top-10 h-56 w-56"
        style={{ animationDelay: "8s" }}
      />

      {/* floating menu figures */}
      {figures.map(({ Icon, ...figure }, index) => (
        <span
          key={index}
          className="bean-float absolute"
          style={{ top: figure.top, left: figure.left, animationDelay: figure.delay, opacity: figure.opacity, color: color || "#3f8a49" }}
        >
          <Icon style={{ width: figure.size, height: figure.size }} aria-hidden />
        </span>
      ))}
    </div>
  );
}
