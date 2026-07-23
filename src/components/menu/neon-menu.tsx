"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { SocialLinks } from "@/components/menu/social-links";
import { useMenuController, MenuTopControls, MenuOverlays, useForcedDark } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { DesignBackdrop } from "@/components/menu/design-backdrop";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

// The "Neon Night" design: a dark, high-contrast menu with a glowing accent.
// Big prices, luminous category pills, and marker-dotted item rows. Always dark.
export function NeonMenu({ data, accent }: MenuDesignProps) {
  useForcedDark();
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  useEffect(() => {
    function onScroll() {
      const offset = 160;
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
    <main dir={textDir} className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      <DesignBackdrop design="neon" />

      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-sm font-bold uppercase tracking-[0.25em] text-primary" style={{ textShadow: "0 0 16px hsl(var(--primary) / 0.8)" }}>
            {ctrl.restaurantName}
          </span>
          <MenuTopControls ctrl={ctrl} hideTheme />
        </div>
      </div>

      {/* Hero */}
      <header className="mx-auto w-full max-w-4xl px-5 pb-4 pt-10 text-center">
        {general.logoUrl ? (
          <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-full ring-2 ring-primary/50" style={{ boxShadow: "0 0 34px hsl(var(--primary) / 0.6)" }}>
            <Image src={general.logoUrl} alt={ctrl.restaurantName} width={160} height={160} className="h-full w-full object-cover" priority />
          </div>
        ) : null}
        <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl" style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.75)" }}>
          {ctrl.restaurantName}
        </h1>
        {ctrl.description ? <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">{ctrl.description}</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="outline" />
          <SocialLinks social={general.socialLinks} style="outline" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mt-6 block w-full max-w-md">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(event) => browse.setQuery(event.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-12 rounded-full border-primary/40 bg-white/5 ps-11 text-center text-zinc-100 placeholder:text-zinc-500"
            />
          </label>
        ) : null}
      </header>

      {/* Category nav */}
      {browse.sections.length ? (
        <nav className="sticky top-[57px] z-20 border-y border-white/10 bg-background/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {browse.sections.map((section) => {
              const active = activeCategoryId === section.category.id;
              return (
                <button
                  key={section.category.id}
                  type="button"
                  onClick={() => scrollToCategory(section.category.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition-all",
                    active ? "border-primary bg-primary/10 text-primary" : "border-white/15 text-zinc-400 hover:text-zinc-100"
                  )}
                  style={active ? { boxShadow: "0 0 18px hsl(var(--primary) / 0.5)" } : undefined}
                >
                  <span dir={textDir}>{localized(section.category.name, locale)}</span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}

      {/* Sections */}
      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-8">
        <div className="space-y-12">
          {allSections.map((section) => (
            <section
              key={section.category?.id ?? "others"}
              ref={(el) => { if (section.category) sectionRefs.current[section.category.id] = el; }}
              className="scroll-mt-28"
            >
              <h2 dir={textDir} className="mb-5 text-xl font-black uppercase tracking-[0.15em] text-primary" style={{ textShadow: "0 0 16px hsl(var(--primary) / 0.5)" }}>
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <ul className="divide-y divide-white/10">
                {section.items.map((item) => (
                  <NeonRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    textDir={textDir}
                    showPrices={ctrl.showPrices}
                    showCart={ctrl.showCart}
                    quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)}
                    onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)}
                    onDecrement={() => cart.decrement(item.id)}
                  />
                ))}
              </ul>
            </section>
          ))}

          {!browse.hasResults ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <UtensilsCrossed className="h-10 w-10 text-zinc-600" aria-hidden />
              <p dir={textDir} className="text-zinc-500">{translate(locale, "menu.empty")}</p>
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

function NeonRow({
  item,
  locale,
  textDir,
  showPrices,
  showCart,
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
  showCart: boolean;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);
  const hasDiscount = Boolean(item.discountPrice);

  return (
    <li className="flex items-center gap-4 py-4">
      <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-primary" style={{ boxShadow: "0 0 10px hsl(var(--primary) / 0.9)" }} aria-hidden />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-base font-semibold text-zinc-100">{name}</span>
          {showPrices ? (
            <span className="shrink-0 text-lg font-black tabular-nums text-primary" style={{ textShadow: "0 0 14px hsl(var(--primary) / 0.6)" }}>
              {formatMoney(price, item.currency, locale)}
              {hasDiscount ? (
                <span className="ms-1.5 text-xs font-normal text-zinc-500 line-through">{formatMoney(item.basePrice, item.currency, locale)}</span>
              ) : null}
            </span>
          ) : null}
        </div>
        {description ? <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{description}</p> : null}
        {item.isSoldOut ? (
          <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-rose-400">{translate(locale, "menu.soldOut")}</span>
        ) : null}
      </button>
      {showCart && !item.isSoldOut ? (
        quantity > 0 ? (
          <div className="inline-flex items-center gap-1 rounded-full border border-primary/50 p-0.5">
            <button type="button" aria-label="Decrease" onClick={onDecrement} className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
              <Minus className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="min-w-4 text-center text-xs font-bold tabular-nums">{formatNumber(quantity, locale)}</span>
            <button type="button" aria-label="Increase" onClick={onIncrement} className="flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10">
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={`${translate(locale, "cart.add")} ${name}`}
            onClick={onAdd}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/60 text-primary transition-all hover:bg-primary hover:text-primary-foreground"
            style={{ boxShadow: "0 0 16px hsl(var(--primary) / 0.4)" }}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        )
      ) : null}
    </li>
  );
}
