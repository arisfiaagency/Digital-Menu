"use client";

import { useEffect, type CSSProperties } from "react";
import Image from "next/image";
import { LanguageSelector } from "@/components/menu/language-selector";
import { ThemeToggle } from "@/components/menu/theme-toggle";
import { useLocale, publicLocaleChangeEvent, publicLocaleStorageKey } from "@/hooks/use-locale";
import { localized, translate, locales } from "@/lib/i18n/config";
import { defaultAppData } from "@/data/default-data";
import { cn } from "@/lib/utils/cn";
import { SocialLinks } from "@/components/menu/social-links";
import { BrandCredit } from "@/components/brand-credit";
import { hexToHslVar, hexToRgba, readableForegroundHslVar } from "@/lib/utils/color";
import { cssPatternStyle, floatingFigures, isFloatingIconPattern } from "@/lib/menu-patterns";
import type { AppearanceSettings, GeneralSettings, MenuSettings, WelcomePattern } from "@/types/models";

// The welcome screen always opens in this language, regardless of any previously
// stored public locale.
const WELCOME_DEFAULT_LOCALE = "ckb";

export function WelcomeScreen({
  initialGeneral,
  initialSocial,
  initialAppearance,
  initialMenu
}: {
  initialGeneral?: GeneralSettings;
  initialSocial?: GeneralSettings["socialLinks"];
  initialAppearance?: AppearanceSettings;
  initialMenu?: MenuSettings;
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
  const welcomeTagline = localized(general.welcomeTagline, locale, translate(locale, "welcome.tagline"));
  const logoUrl = general.logoUrl;

  // Live social links come from the server (falls back to default data). No
  // client Firebase fetch — the welcome page ships zero Firebase.
  const social = initialSocial ?? general.socialLinks;
  const enabledLocales = general.enabledLanguages?.length ? general.enabledLanguages : locales;
  const welcomeLogoShape = appearance.welcomeLogoStyle ?? "circle";

  // Brand mint #A4D8A6 (HSL 122 40% 75%) as the accent. Deep-green foreground
  // keeps text legible on the light mint.
  const accentColor = appearance.welcomeAccentColor || appearance.primaryColor || "#A4D8A6";
  const accentStyle = welcomeThemeStyle(accentColor);
  const mainStyle = { ...accentStyle, ...welcomeBackgroundStyle(appearance) } as CSSProperties;
  const formTextStyle = appearance.welcomeFormTextColor ? { color: appearance.welcomeFormTextColor } : undefined;
  const mutedTextStyle = appearance.welcomeFormTextColor ? { color: appearance.welcomeFormTextColor, opacity: 0.72 } : undefined;
  const welcomeHeaderStyle = { color: appearance.welcomeHeaderTextColor || accentColor };
  const helperTextStyle = appearance.welcomeHelperTextColor ? { color: appearance.welcomeHelperTextColor } : mutedTextStyle;

  // The welcome always shows Kurdish by default regardless of a previously stored
  // locale. An explicit language choice still updates the shared preference.
  useEffect(() => {
    window.localStorage.setItem(publicLocaleStorageKey, WELCOME_DEFAULT_LOCALE);
    window.dispatchEvent(new CustomEvent(publicLocaleChangeEvent, { detail: WELCOME_DEFAULT_LOCALE }));
  }, []);

  // Lock the page to a single, non-scrollable screen (prevents iOS Safari
  // rubber-band overscroll).
  useEffect(() => {
    document.documentElement.classList.add("overflow-lock");
    document.body.classList.add("overflow-lock");
    return () => {
      document.documentElement.classList.remove("overflow-lock");
      document.body.classList.remove("overflow-lock");
    };
  }, []);

  return (
    <main
      dir="ltr"
      style={mainStyle}
      className={cn(
        "no-select fixed inset-0 flex touch-none overflow-hidden overscroll-none p-4",
        (appearance.welcomeCardAlign ?? "center") === "bottom" ? "items-end justify-center pb-8 sm:pb-12" : "items-center justify-center"
      )}
    >
      <WelcomeBackgroundVideo appearance={appearance} />
      <WelcomeBackgroundPattern appearance={appearance} />

      <section
        className={cn(
          "relative z-10 w-full overflow-hidden p-6 text-center sm:p-8",
          welcomeCardWidthClass(appearance),
          welcomeCardClass(appearance)
        )}
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
          style={welcomeHeaderStyle}
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
              "relative flex h-28 w-28 items-center justify-center overflow-hidden shadow-lg ring-4",
              welcomeLogoClass(welcomeLogoShape),
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
        <p dir={textDir} className="text-sm text-muted-foreground" style={helperTextStyle}>
          {welcomeTagline}
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
            style={helperTextStyle}
          >
            {translate(locale, "welcome.chooseLanguage")}
          </p>
          {/* Fixed ltr order so the buttons keep their position when the
              selected language flips the page between rtl and ltr. */}
          <div className="flex justify-center" dir="ltr">
            <LanguageSelector locale={locale} onChange={setLocale} variant={appearance.welcomeLanguageStyle ?? "buttons"} availableLocales={enabledLocales} />
          </div>
        </div>

        {appearance.welcomeShowSocialLinks !== false && social && Object.values(social).some((value) => value?.trim()) ? (
          <div className="mt-6 space-y-2">
            <p dir={textDir} className="text-xs font-medium text-muted-foreground" style={helperTextStyle}>
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

function welcomeCardWidthClass(appearance: AppearanceSettings) {
  const width = appearance.welcomeCardWidth ?? "normal";
  if (width === "narrow") return "max-w-sm";
  if (width === "wide") return "max-w-xl";
  return "max-w-md";
}

function welcomeLogoClass(style: "circle" | "rounded" | "square") {
  if (style === "square") return "rounded-lg";
  if (style === "rounded") return "rounded-2xl";
  return "rounded-full";
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
  const overlay = Math.min(100, Math.max(0, appearance.welcomeBackgroundOverlay ?? 15)) / 100;
  if (design === "image" && appearance.welcomeBackgroundImageUrl && !isWelcomeBackgroundVideo(appearance)) {
    return {
      backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8",
      backgroundImage: `linear-gradient(rgba(0, 0, 0, ${overlay}), rgba(0, 0, 0, ${overlay})), url(${appearance.welcomeBackgroundImageUrl})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover"
    };
  }
  if (design === "image") return { backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8" };
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
  const backgroundColor = welcomeFormBackgroundColor(appearance);
  if (backgroundColor) style.backgroundColor = backgroundColor;
  if (appearance.welcomeFormTextColor) style.color = appearance.welcomeFormTextColor;
  if (appearance.welcomeFormBorderColor) style.borderColor = appearance.welcomeFormBorderColor;
  const blur = normalizeWelcomeFormBlur(appearance.welcomeFormBlur);
  if (blur !== undefined) {
    style.backdropFilter = `blur(${blur}px)`;
    style.WebkitBackdropFilter = `blur(${blur}px)`;
  }
  return style;
}

function normalizeWelcomeFormBlur(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(40, Math.max(0, value));
}

function welcomeFormBackgroundColor(appearance: AppearanceSettings) {
  const transparency = normalizeWelcomeFormTransparency(appearance.welcomeFormTransparency);
  if (transparency === undefined) return appearance.welcomeFormColor;
  const alpha = 1 - transparency / 100;
  if (!appearance.welcomeFormColor) return `hsl(var(--card) / ${alpha.toFixed(2)})`;
  return hexToRgba(appearance.welcomeFormColor, alpha) || appearance.welcomeFormColor;
}

function normalizeWelcomeFormTransparency(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, value));
}

function WelcomeBackgroundVideo({ appearance }: { appearance: AppearanceSettings }) {
  if (!isWelcomeBackgroundVideo(appearance)) return null;
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
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: Math.min(100, Math.max(0, appearance.welcomeBackgroundOverlay ?? 15)) / 100 }}
        aria-hidden
      />
    </>
  );
}

function isWelcomeBackgroundVideo(appearance: AppearanceSettings) {
  const url = appearance.welcomeBackgroundImageUrl;
  if (!url || (appearance.welcomeBackgroundStyle ?? "gradient") !== "image") return false;
  return appearance.welcomeBackgroundMediaType === "video" || /\.(mp4|webm)(\?.*)?$/i.test(url);
}

function WelcomeBackgroundPattern({ appearance }: { appearance: AppearanceSettings }) {
  const pattern = appearance.welcomeBackgroundPattern ?? "cafe";
  const color = appearance.welcomeBackgroundPatternColor || appearance.welcomeAccentColor || "#3f8a49";
  if (pattern === "none") return null;
  if (isFloatingIconPattern(pattern)) return <FloatingIconsLayer pattern={pattern} color={color} />;
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
  if (pattern === "none" || isFloatingIconPattern(pattern)) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={cssPatternStyle(pattern, color, opacity)}
      aria-hidden
    />
  );
}

function FloatingIconsLayer({
  pattern,
  color
}: {
  pattern: Parameters<typeof floatingFigures>[0];
  color?: string;
}) {
  const figures = floatingFigures(pattern);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="aroma-1 aroma-pan absolute -left-24 -top-24 h-80 w-80" />
      <div
        className="aroma-2 aroma-pan absolute -bottom-32 -right-20 h-96 w-96"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="aroma-3 aroma-pan absolute right-1/3 top-10 h-56 w-56"
        style={{ animationDelay: "8s" }}
      />

      {figures.map(({ Icon, ...figure }, index) => (
        <span
          key={index}
          className="bean-float absolute"
          style={{
            top: figure.top,
            left: figure.left,
            animationDelay: figure.delay,
            opacity: figure.opacity,
            color: color || "#3f8a49"
          }}
        >
          <Icon style={{ width: figure.size, height: figure.size }} aria-hidden />
        </span>
      ))}
    </div>
  );
}
