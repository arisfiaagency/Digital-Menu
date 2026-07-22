"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { SocialLinks } from "@/components/menu/social-links";
import { useMenuController, MenuTopControls, MenuOverlays } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

// The "Modern" design: a bright, image-forward app menu — bold sans-serif, a
// sticky pill category bar, and a responsive grid of photo cards with inline
// add-to-cart steppers.
export function ModernMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  useEffect(() => {
    function onScroll() {
      const offset = 180;
      let current = "";
      for (const section of browse.sections) {
        const el = sectionRefs.current[section.category.id];
        if (el && el.getBoundingClientRect().top <= offset) current = section.category.id;
      }
      setActiveCategoryId(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [browse.sections]);

  function scrollToCategory(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main dir={textDir} className="menu-theme-root relative min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {general.logoUrl ? (
              <Image src={general.logoUrl} alt={ctrl.restaurantName} width={40} height={40} className="h-10 w-10 rounded-xl object-cover ring-1 ring-border" />
            ) : null}
            <span className="truncate text-base font-extrabold tracking-tight">{ctrl.restaurantName}</span>
          </div>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-4 pb-2 pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{ctrl.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="compact" />
          <SocialLinks social={general.socialLinks} style="soft" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mt-5 block w-full max-w-lg">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(event) => browse.setQuery(event.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-12 rounded-2xl ps-11"
            />
          </label>
        ) : null}
      </header>

      {/* Sticky pill category nav */}
      {browse.sections.length ? (
        <nav className="sticky top-[61px] z-20 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {browse.sections.map((section) => (
              <button
                key={section.category.id}
                type="button"
                onClick={() => scrollToCategory(section.category.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                  activeCategoryId === section.category.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <span dir={textDir}>{localized(section.category.name, locale)}</span>
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      {/* Sections */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6">
        <div className="space-y-10">
          {allSections.map((section) => (
            <section
              key={section.category?.id ?? "others"}
              ref={(el) => { if (section.category) sectionRefs.current[section.category.id] = el; }}
              className="scroll-mt-32"
            >
              <h2 dir={textDir} className="mb-4 text-xl font-extrabold tracking-tight">
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {section.items.map((item) => (
                  <ModernCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    textDir={textDir}
                    showPrices={ctrl.showPrices}
                    showImages={ctrl.showImages}
                    showCart={ctrl.showCart}
                    logoUrl={ctrl.logoUrl}
                    quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)}
                    onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)}
                    onDecrement={() => cart.decrement(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          {!browse.hasResults ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" aria-hidden />
              <p dir={textDir} className="text-muted-foreground">{translate(locale, "menu.empty")}</p>
            </div>
          ) : null}
        </div>
      </div>

      <MenuOverlays ctrl={ctrl} />

      <footer className="px-4 pb-10 pt-2">
        <BrandCredit />
      </footer>
    </main>
  );
}

function ModernCard({
  item,
  locale,
  textDir,
  showPrices,
  showImages,
  showCart,
  logoUrl,
  quantity,
  onOpen,
  onAdd,
  onIncrement,
  onDecrement
}: {
  item: MenuItem;
  locale: Locale;
  textDir: "ltr" | "rtl";
  showPrices: boolean;
  showImages: boolean;
  showCart: boolean;
  logoUrl?: string;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const price = effectiveItemPrice(item);
  const hasDiscount = Boolean(item.discountPrice);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {showImages ? (
        <button type="button" onClick={onOpen} aria-label={name} className="relative aspect-square overflow-hidden bg-muted">
          <FallbackMenuImage src={item.imageUrl} alt={name} fallbackSrc={logoUrl} />
          {item.isSoldOut ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs font-bold uppercase tracking-wide text-destructive">
              {translate(locale, "menu.soldOut")}
            </span>
          ) : null}
          {item.isNew ? (
            <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
              {translate(locale, "menu.new")}
            </span>
          ) : null}
        </button>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-start">
          <h3 dir={textDir} className="line-clamp-2 text-sm font-bold leading-snug">{name}</h3>
        </button>
        <div className="mt-auto flex items-center justify-between gap-2">
          {showPrices ? (
            <div className="min-w-0">
              <span className="text-sm font-extrabold text-primary">{formatMoney(price, item.currency, locale)}</span>
              {hasDiscount ? (
                <span className="ms-1 text-[11px] text-muted-foreground line-through">{formatMoney(item.basePrice, item.currency, locale)}</span>
              ) : null}
            </div>
          ) : <span />}
          {showCart && !item.isSoldOut ? (
            quantity > 0 ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 p-0.5">
                <button type="button" aria-label="Decrease" onClick={onDecrement} className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="min-w-4 text-center text-xs font-bold tabular-nums">{formatNumber(quantity, locale)}</span>
                <button type="button" aria-label="Increase" onClick={onIncrement} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`${translate(locale, "cart.add")} ${name}`}
                onClick={onAdd}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:bg-primary/90 active:scale-90"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
