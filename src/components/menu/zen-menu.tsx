"use client";

import { Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { SocialLinks } from "@/components/menu/social-links";
import { QuantityStepper } from "@/components/menu/cart";
import { useMenuController, MenuTopControls, MenuOverlays } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { DesignBackdrop } from "@/components/menu/design-backdrop";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney } from "@/lib/utils/format";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

// The "Japanese Zen" design: calm and spacious — a warm paper canvas, hairline
// rules, a vertical accent line beside each section, muted type and generous
// whitespace. For matcha bars, tea houses, sushi.
export function ZenMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      <DesignBackdrop design="zen" />
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-6 py-5">
        <span className="truncate text-xs tracking-[0.3em] text-stone-500">{ctrl.restaurantName}</span>
        <MenuTopControls ctrl={ctrl} />
      </div>

      <header className="mx-auto w-full max-w-2xl px-6 pb-10 pt-8">
        <span className="mb-6 block h-10 w-10 rounded-full border border-primary/50" aria-hidden />
        <h1 className="text-4xl font-light tracking-[0.05em] sm:text-5xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-stone-500">{ctrl.description}</p> : null}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="compact" />
          <SocialLinks social={general.socialLinks} style="icons" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mt-6 block w-full max-w-xs">
            <Search className="pointer-events-none absolute start-1 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
            <Input dir={textDir} value={browse.query} onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-10 rounded-none border-0 border-b border-stone-300 bg-transparent ps-7 font-light tracking-wide focus-visible:ring-0" />
          </label>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 pb-28">
        <div className="space-y-16">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"} className="border-s-2 border-primary/30 ps-5">
              <h2 dir={textDir} className="mb-7 text-sm font-normal uppercase tracking-[0.35em] text-stone-500">
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <ul className="space-y-8">
                {section.items.map((item) => (
                  <ZenRow key={item.id} item={item} locale={locale} textDir={textDir}
                    showPrices={ctrl.showPrices} showCart={ctrl.showCart} quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)} onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)} onDecrement={() => cart.decrement(item.id)} />
                ))}
              </ul>
            </section>
          ))}
          {!browse.hasResults ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <UtensilsCrossed className="h-10 w-10 text-stone-300" aria-hidden />
              <p dir={textDir} className="font-light text-stone-500">{translate(locale, "menu.empty")}</p>
            </div>
          ) : null}
        </div>
      </div>

      <MenuOverlays ctrl={ctrl} />
      <footer className="px-4 pb-10 pt-2"><BrandCredit /></footer>
    </main>
  );
}

function ZenRow({
  item, locale, textDir, showPrices, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <li className="flex items-start justify-between gap-4">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-normal tracking-wide">{name}</h3>
          {showPrices ? <span className="shrink-0 text-sm tracking-wider text-primary">{formatMoney(price, item.currency, locale)}</span> : null}
        </div>
        {description ? <p className="mt-1 text-sm font-light leading-relaxed text-stone-500">{description}</p> : null}
        {item.isSoldOut ? <span className="mt-1 inline-block text-[11px] uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span> : null}
      </button>
      {showCart && !item.isSoldOut ? (
        <div className="shrink-0">
          {quantity > 0 ? (
            <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
          ) : (
            <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
