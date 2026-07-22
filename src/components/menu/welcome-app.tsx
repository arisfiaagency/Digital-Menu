"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { LanguageGlobe } from "@/components/menu/language-globe";
import { ThemeToggle } from "@/components/menu/theme-toggle";
import { OpenStatusBadge, type OpenStatusStyle } from "@/components/menu/open-status-badge";
import { SocialLinks, type SocialLinkStyle } from "@/components/menu/social-links";
import { useForcedDark } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import { useLocale } from "@/hooks/use-locale";
import { localized, locales } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { accentStyle } from "@/lib/utils/accent";
import type { GeneralSettings, MenuDesign, MenuSettings } from "@/types/models";

const VIEW_MENU_LABEL = { en: "View Menu", ar: "عرض القائمة", ckb: "بینینی مێنیۆ" } as const;

const SERIF = "Georgia, 'Times New Roman', 'Noto Naskh Arabic', serif";
const CHALK = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Noto Naskh Arabic', cursive";
const BOARD_BG =
  "radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,0.05), transparent 60%)," +
  "radial-gradient(60% 50% at 100% 100%, rgba(255,255,255,0.04), transparent 60%)," +
  "#1c2622";

// Per-design welcome theme. Each cafe's front door echoes its locked menu design.
type WelcomeTheme = {
  forcedDark?: boolean;
  glow?: boolean;         // radial accent glow behind the hero
  glowText?: boolean;     // neon text-shadow on the name
  rootClassName: string;
  rootStyle?: CSSProperties;
  headingFont?: string;
  kicker?: boolean;       // small "· MENU ·" rule above the name
  nameClassName: string;
  logoClassName: string;
  ctaClassName: string;
  badgeStyle: OpenStatusStyle;
  socialStyle: SocialLinkStyle;
};

const CTA_BASE = "inline-flex items-center gap-2 text-sm font-semibold transition-all active:scale-95";

const WELCOME_THEMES: Record<MenuDesign, WelcomeTheme> = {
  luxury: {
    glow: true,
    rootClassName: "bg-background text-foreground",
    headingFont: SERIF,
    kicker: true,
    nameClassName: "text-4xl font-semibold tracking-tight sm:text-6xl",
    logoClassName: "ring-1 ring-primary/25 shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.5)]",
    ctaClassName: cn(CTA_BASE, "rounded-full bg-primary px-7 py-3 text-primary-foreground shadow-lg hover:-translate-y-0.5"),
    badgeStyle: "outline",
    socialStyle: "outline"
  },
  modern: {
    rootClassName: "bg-gradient-to-b from-primary/5 to-background text-foreground",
    nameClassName: "text-4xl font-extrabold tracking-tight sm:text-6xl",
    logoClassName: "rounded-3xl ring-1 ring-border shadow-lg",
    ctaClassName: cn(CTA_BASE, "rounded-2xl bg-primary px-7 py-3.5 text-primary-foreground shadow-md hover:brightness-105"),
    badgeStyle: "compact",
    socialStyle: "soft"
  },
  classic: {
    rootClassName: "text-stone-900 dark:text-stone-100",
    rootStyle: { fontFamily: SERIF, background: "#faf6ef" },
    headingFont: SERIF,
    kicker: true,
    nameClassName: "text-4xl font-bold tracking-tight sm:text-6xl",
    logoClassName: "ring-1 ring-stone-300 dark:ring-stone-700",
    ctaClassName: cn(CTA_BASE, "rounded-none border-2 border-primary px-7 py-3 text-primary hover:bg-primary hover:text-primary-foreground"),
    badgeStyle: "outline",
    socialStyle: "outline"
  },
  minimal: {
    rootClassName: "bg-background text-foreground",
    nameClassName: "text-3xl font-semibold tracking-tight sm:text-5xl",
    logoClassName: "ring-1 ring-border",
    ctaClassName: cn(CTA_BASE, "rounded-full border border-primary/50 px-7 py-3 text-primary hover:bg-primary hover:text-primary-foreground"),
    badgeStyle: "compact",
    socialStyle: "icons"
  },
  neon: {
    forcedDark: true,
    glow: true,
    glowText: true,
    rootClassName: "bg-[#08080f] text-zinc-100",
    nameClassName: "text-5xl font-black uppercase tracking-tight sm:text-7xl",
    logoClassName: "ring-2 ring-primary/50 shadow-[0_0_34px_hsl(var(--primary)/0.6)]",
    ctaClassName: cn(CTA_BASE, "rounded-full border border-primary/60 bg-primary/10 px-8 py-3.5 text-primary shadow-[0_0_22px_hsl(var(--primary)/0.5)] hover:bg-primary hover:text-primary-foreground"),
    badgeStyle: "outline",
    socialStyle: "outline"
  },
  gallery: {
    rootClassName: "bg-gradient-to-b from-muted/60 to-background text-foreground",
    nameClassName: "text-4xl font-extrabold tracking-tight sm:text-6xl",
    logoClassName: "rounded-3xl shadow-xl ring-1 ring-border",
    ctaClassName: cn(CTA_BASE, "rounded-2xl bg-primary px-7 py-3.5 text-primary-foreground shadow-lg hover:brightness-105"),
    badgeStyle: "compact",
    socialStyle: "soft"
  },
  chalkboard: {
    forcedDark: true,
    rootClassName: "text-[#f3efe6]",
    rootStyle: { background: BOARD_BG, fontFamily: CHALK },
    headingFont: CHALK,
    kicker: true,
    nameClassName: "text-5xl font-bold tracking-wide sm:text-7xl",
    logoClassName: "ring-2 ring-white/30",
    ctaClassName: cn(CTA_BASE, "rounded-lg border-2 border-dashed border-white/50 px-7 py-3 text-[#f3efe6] hover:border-primary hover:text-primary"),
    badgeStyle: "outline",
    socialStyle: "outline"
  },
  tabs: {
    rootClassName: "bg-background text-foreground",
    nameClassName: "text-4xl font-bold tracking-tight sm:text-6xl",
    logoClassName: "rounded-2xl ring-1 ring-border shadow-md",
    ctaClassName: cn(CTA_BASE, "rounded-2xl bg-primary px-7 py-3.5 text-primary-foreground shadow-md hover:brightness-105"),
    badgeStyle: "compact",
    socialStyle: "soft"
  }
};

export function WelcomeApp({
  general,
  menu,
  design = "classic",
  accent,
  slug
}: {
  general: GeneralSettings;
  menu: MenuSettings;
  design?: MenuDesign;
  accent?: string;
  slug: string;
}) {
  const theme = WELCOME_THEMES[design] ?? WELCOME_THEMES.classic;
  return <WelcomeScreen theme={theme} general={general} menu={menu} accent={accent} slug={slug} />;
}

function WelcomeScreen({
  theme,
  general,
  menu,
  accent,
  slug
}: {
  theme: WelcomeTheme;
  general: GeneralSettings;
  menu: MenuSettings;
  accent?: string;
  slug: string;
}) {
  const { locale, setLocale, dir: textDir } = useLocale(general.defaultLanguage);
  const name = localized(general.restaurantName, locale);
  const description = localized(general.description, locale);
  const enabledLocales = general.enabledLanguages?.length ? general.enabledLanguages : locales;
  const darkModeEnabled = menu.enableDarkMode !== false;
  const headingStyle = theme.headingFont ? { fontFamily: theme.headingFont } : undefined;
  const nameStyle = theme.glowText ? { ...headingStyle, textShadow: "0 0 28px hsl(var(--primary) / 0.75)" } : headingStyle;

  return (
    <WelcomeRoot theme={theme} accent={accent}>
      {/* Top controls */}
      <div dir={textDir} className="relative z-20 mx-auto flex w-full max-w-4xl items-center justify-end gap-2 px-5 py-4">
        {!theme.forcedDark && darkModeEnabled ? <ThemeToggle presentation="circle" iconStyle="sunMoon" /> : null}
        <LanguageGlobe locale={locale} onChange={setLocale} availableLocales={enabledLocales} />
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-6 text-center">
        <div className={cn("relative mb-6 h-28 w-28 overflow-hidden rounded-full sm:h-32 sm:w-32", theme.logoClassName)}>
          {general.logoUrl ? (
            <Image src={general.logoUrl} alt={name} width={200} height={200} className="h-full w-full object-cover" priority />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-primary text-3xl font-bold text-primary-foreground" style={headingStyle}>
              {name.slice(0, 2)}
            </span>
          )}
        </div>

        {theme.kicker ? (
          <div className="mb-4 flex items-center gap-3 text-primary/70">
            <span className="h-px w-10 bg-current" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">Menu</span>
            <span className="h-px w-10 bg-current" />
          </div>
        ) : null}

        <h1 dir={textDir} className={cn("leading-tight", theme.nameClassName)} style={nameStyle}>
          {name}
        </h1>
        {description ? (
          <p dir={textDir} className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style={theme.badgeStyle} />
          <SocialLinks social={general.socialLinks} style={theme.socialStyle} />
        </div>

        <Link href={`/${slug}/menu`} className={cn("mt-9", theme.ctaClassName)} dir={textDir}>
          <UtensilsCrossed className="h-4 w-4" aria-hidden />
          <span>{VIEW_MENU_LABEL[locale] ?? VIEW_MENU_LABEL.en}</span>
        </Link>
      </div>

      <footer className="relative z-10 px-4 pb-8">
        <BrandCredit />
      </footer>
    </WelcomeRoot>
  );
}

function WelcomeRoot({ theme, accent, children }: { theme: WelcomeTheme; accent?: string; children: React.ReactNode }) {
  useForcedDark(Boolean(theme.forcedDark));
  return (
    <main
      className={cn("menu-theme-root relative flex min-h-dvh flex-col overflow-hidden", theme.rootClassName)}
      style={{ ...accentStyle(accent), ...theme.rootStyle }}
    >
      {theme.glow ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-80"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(55% 40% at 50% 0%, hsl(var(--primary) / 0.22), transparent 70%), radial-gradient(45% 40% at 100% 100%, hsl(var(--primary) / 0.12), transparent 70%)"
          }}
        />
      ) : null}
      {children}
    </main>
  );
}
