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

const SERIF = "Georgia, 'Times New Roman', 'Noto Naskh Arabic', serif";

// The "Magazine" design: an editorial masthead over a multi-column flowing layout
// (like a printed food magazine). Items flow across columns with a big serif
// section heading; distinct from the centered Luxury/Classic looks.
export function MagazineMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative min-h-dvh bg-background text-foreground" style={{ ...accentStyle(accent), fontFamily: SERIF }}>
      {/* Masthead */}
      <header className="border-b-4 border-double border-foreground/80">
        <div className="mx-auto w-full max-w-4xl px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{translate(locale, "menu.title")}</span>
            <MenuTopControls ctrl={ctrl} />
          </div>
          <h1 className="mt-2 text-center text-5xl font-black uppercase tracking-tight sm:text-7xl">{ctrl.restaurantName}</h1>
          {ctrl.description ? <p className="mx-auto mt-2 max-w-2xl text-center text-sm italic text-muted-foreground">{ctrl.description}</p> : null}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 border-t pt-3">
            <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="compact" />
            <SocialLinks social={general.socialLinks} style="icons" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-5 pb-28 pt-6">
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mb-8 block w-full max-w-md">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input dir={textDir} value={browse.query} onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search")} className="h-11 rounded-full ps-11" />
          </label>
        ) : null}

        <div className="space-y-10">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <h2 dir={textDir} className="mb-4 border-b-2 border-foreground/70 pb-1 text-2xl font-black uppercase tracking-tight">
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <div className="gap-x-10 sm:columns-2">
                {section.items.map((item) => (
                  <MagazineRow key={item.id} item={item} locale={locale} textDir={textDir}
                    showPrices={ctrl.showPrices} showCart={ctrl.showCart} quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)} onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)} onDecrement={() => cart.decrement(item.id)} />
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
      <footer className="px-4 pb-10 pt-2"><BrandCredit /></footer>
    </main>
  );
}

function MagazineRow({
  item, locale, textDir, showPrices, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <div className="mb-5 break-inside-avoid">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold">{name}</h3>
            <span className="mb-1 h-px flex-1 self-end border-b border-dotted border-foreground/30" aria-hidden />
            {showPrices ? <span className="shrink-0 font-bold text-primary">{formatMoney(price, item.currency, locale)}</span> : null}
          </div>
          {description ? <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{description}</p> : null}
          {item.isSoldOut ? <span className="text-[11px] font-semibold uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span> : null}
        </button>
        {showCart && !item.isSoldOut ? (
          <div className="shrink-0">
            {quantity > 0 ? (
              <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
            ) : (
              <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
