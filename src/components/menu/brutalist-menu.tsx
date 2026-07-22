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

const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";

// The "Brutalist" design: raw and high-impact — monospace type, thick borders,
// hard offset shadows, zero rounding, oversized headings. For specialty coffee /
// design-forward spots.
export function BrutalistMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative min-h-dvh bg-background text-foreground" style={{ ...accentStyle(accent), fontFamily: MONO }}>
      <div className="border-b-4 border-foreground">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-sm font-bold uppercase">{ctrl.restaurantName}</span>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      <header className="mx-auto w-full max-w-3xl px-4 pb-6 pt-8">
        <h1 className="text-5xl font-black uppercase leading-none tracking-tighter sm:text-7xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mt-3 max-w-xl text-sm text-muted-foreground">{ctrl.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="banner" />
          <SocialLinks social={general.socialLinks} style="square" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mt-6 block w-full max-w-md">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" aria-hidden />
            <Input dir={textDir} value={browse.query} onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search").toUpperCase()}
              className="h-12 rounded-none border-2 border-foreground bg-background ps-11 font-bold uppercase focus-visible:ring-0" />
          </label>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-2">
        <div className="space-y-10">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <h2 dir={textDir} className="mb-4 inline-block border-2 border-foreground bg-primary px-3 py-1 text-lg font-black uppercase text-primary-foreground"
                style={{ boxShadow: "4px 4px 0 hsl(var(--foreground))" }}>
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <BrutalRow key={item.id} item={item} locale={locale} textDir={textDir}
                    showPrices={ctrl.showPrices} showCart={ctrl.showCart} quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)} onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)} onDecrement={() => cart.decrement(item.id)} />
                ))}
              </ul>
            </section>
          ))}
          {!browse.hasResults ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" aria-hidden />
              <p dir={textDir} className="font-bold uppercase text-muted-foreground">{translate(locale, "menu.empty")}</p>
            </div>
          ) : null}
        </div>
      </div>

      <MenuOverlays ctrl={ctrl} />
      <footer className="px-4 pb-10 pt-2"><BrandCredit /></footer>
    </main>
  );
}

function BrutalRow({
  item, locale, textDir, showPrices, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <li className="flex items-center gap-3 border-2 border-foreground bg-card p-3" style={{ boxShadow: "4px 4px 0 hsl(var(--foreground))" }}>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <h3 dir={textDir} className="truncate text-base font-black uppercase">{name}</h3>
        {description ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p> : null}
        {item.isSoldOut ? <span className="text-[10px] font-black uppercase text-destructive">{translate(locale, "menu.soldOut")}</span> : null}
      </button>
      {showPrices ? <span className="shrink-0 text-base font-black tabular-nums">{formatMoney(price, item.currency, locale)}</span> : null}
      {showCart && !item.isSoldOut ? (
        quantity > 0 ? (
          <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
        ) : (
          <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
            className="flex h-9 w-9 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground transition-transform active:translate-x-0.5 active:translate-y-0.5">
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        )
      ) : null}
    </li>
  );
}
