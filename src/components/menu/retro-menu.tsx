"use client";

import { Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { SocialLinks } from "@/components/menu/social-links";
import { QuantityStepper } from "@/components/menu/cart";
import { useMenuController, MenuTopControls, MenuOverlays } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney } from "@/lib/utils/format";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

const CHECKER = "repeating-conic-gradient(hsl(var(--primary)) 0% 25%, transparent 0% 50%) 0 0 / 22px 22px";

// The "Retro Diner" design: cream board, bold condensed caps, checkerboard trim,
// and red price tags. Fun, 50s American diner energy.
export function RetroMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      <div className="h-3 w-full" style={{ background: CHECKER }} aria-hidden />

      {/* Top bar */}
      <div className="border-b-2 border-primary/70">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-sm font-black uppercase tracking-widest text-primary">{ctrl.restaurantName}</span>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      {/* Header */}
      <header className="mx-auto w-full max-w-3xl px-4 pb-6 pt-8 text-center">
        <h1 className="text-5xl font-black uppercase italic tracking-tight sm:text-7xl" style={{ color: "hsl(var(--primary))" }}>
          {ctrl.restaurantName}
        </h1>
        {ctrl.description ? <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-stone-700 dark:text-stone-300">{ctrl.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="banner" />
          <SocialLinks social={general.socialLinks} style="square" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mt-6 block w-full max-w-sm">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-11 rounded-full border-2 border-primary/60 bg-white/70 ps-11 text-center font-semibold dark:bg-stone-900"
            />
          </label>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-2">
        <div className="space-y-10">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <div className="mx-auto mb-5 w-fit rounded-full border-2 border-primary bg-primary/10 px-6 py-1.5">
                <h2 className="text-lg font-black uppercase tracking-widest text-primary">
                  {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
                </h2>
              </div>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <RetroRow
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
              <UtensilsCrossed className="h-10 w-10 text-primary/50" aria-hidden />
              <p dir={textDir} className="font-semibold text-stone-500">{translate(locale, "menu.empty")}</p>
            </div>
          ) : null}
        </div>
      </div>

      <MenuOverlays ctrl={ctrl} />
      <footer className="px-4 pb-10 pt-2"><BrandCredit /></footer>
    </main>
  );
}

function RetroRow({
  item, locale, textDir, showPrices, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 border-stone-900/10 bg-white/70 p-3 dark:border-white/10 dark:bg-stone-900/60">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <h3 dir={textDir} className="truncate text-lg font-extrabold uppercase tracking-wide">{name}</h3>
        {description ? <p className="mt-0.5 line-clamp-1 text-xs text-stone-600 dark:text-stone-400">{description}</p> : null}
        {item.isSoldOut ? <span className="text-[10px] font-black uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span> : null}
      </button>
      {showPrices ? (
        <span className="shrink-0 rounded-lg bg-primary px-3 py-1 text-sm font-black tabular-nums text-primary-foreground shadow-sm">
          {formatMoney(price, item.currency, locale)}
        </span>
      ) : null}
      {showCart && !item.isSoldOut ? (
        quantity > 0 ? (
          <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
        ) : (
          <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        )
      ) : null}
    </li>
  );
}
