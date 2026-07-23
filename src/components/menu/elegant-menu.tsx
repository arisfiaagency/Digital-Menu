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

const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', 'Noto Naskh Arabic', serif";

// The "Fine Dining" design: airy and refined like a tasting menu — ivory canvas,
// thin serif, centered small-caps sections with a hairline, no imagery, item name
// over a centered price. Calm and upscale.
export function ElegantMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground"
      style={{ ...accentStyle(accent), fontFamily: SERIF }}>
      <DesignBackdrop design="elegant" />
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-6 py-4">
        <span className="truncate text-xs uppercase tracking-[0.35em] text-stone-500">{ctrl.restaurantName}</span>
        <MenuTopControls ctrl={ctrl} />
      </div>

      <header className="mx-auto w-full max-w-2xl px-6 pb-8 pt-10 text-center">
        <h1 className="text-5xl font-light tracking-wide sm:text-6xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mx-auto mt-4 max-w-md text-base font-light italic text-stone-500">{ctrl.description}</p> : null}
        <div className="mx-auto mt-6 h-px w-16 bg-primary/40" aria-hidden />
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="pill" />
          <SocialLinks social={general.socialLinks} style="icons" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mt-7 block w-full max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
            <Input dir={textDir} value={browse.query} onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-10 rounded-none border-x-0 border-t-0 border-b border-stone-300 bg-transparent ps-9 text-center tracking-wide focus-visible:ring-0" />
          </label>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 pb-28">
        <div className="space-y-16">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <div className="mb-8 flex items-center justify-center gap-4">
                <span className="h-px w-10 bg-stone-300" />
                <h2 className="text-sm font-normal uppercase tracking-[0.4em] text-stone-500">
                  {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
                </h2>
                <span className="h-px w-10 bg-stone-300" />
              </div>
              <ul className="space-y-7">
                {section.items.map((item) => (
                  <ElegantRow key={item.id} item={item} locale={locale} textDir={textDir}
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

function ElegantRow({
  item, locale, textDir, showPrices, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <li className="flex items-start justify-between gap-4 text-center">
      <button type="button" onClick={onOpen} className="mx-auto min-w-0 flex-1 text-center">
        <h3 className="text-xl font-normal tracking-wide">{name}</h3>
        {description ? <p className="mx-auto mt-1 max-w-md text-sm font-light italic text-stone-500">{description}</p> : null}
        {showPrices ? <p className="mt-2 text-base font-normal tracking-[0.2em] text-primary">{formatMoney(price, item.currency, locale)}</p> : null}
        {item.isSoldOut ? <span className="mt-1 inline-block text-[11px] uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span> : null}
      </button>
      {showCart && !item.isSoldOut ? (
        <div className="shrink-0 pt-1">
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
