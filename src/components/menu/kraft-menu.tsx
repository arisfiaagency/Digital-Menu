"use client";

import { Coffee, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { SocialLinks } from "@/components/menu/social-links";
import { QuantityStepper } from "@/components/menu/cart";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { menuItemCardImageUrl } from "@/lib/storage/menu-image";
import { useMenuController, MenuTopControls, MenuOverlays } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { DesignBackdrop } from "@/components/menu/design-backdrop";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney } from "@/lib/utils/format";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

const SERIF = "Georgia, 'Times New Roman', 'Noto Naskh Arabic', serif";

// The "Kraft Bakery" design: warm kraft-paper canvas, earthy serif, stamp-style
// category badges and dashed rules. For bakeries, roasters, farm-to-table.
export function KraftMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground"
      style={{ ...accentStyle(accent), fontFamily: SERIF }}>
      <DesignBackdrop design="kraft" />
      <div className="border-b border-dashed border-foreground/30">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <span className="truncate text-sm font-semibold uppercase tracking-[0.25em]">{ctrl.restaurantName}</span>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      <header className="mx-auto w-full max-w-3xl px-5 pb-6 pt-9 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground/50">
          <Coffee className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mx-auto mt-3 max-w-xl text-sm italic text-foreground/80 dark:text-stone-300">{ctrl.description}</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="outline" />
          <SocialLinks social={general.socialLinks} style="outline" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mt-6 block w-full max-w-sm">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/70" aria-hidden />
            <Input dir={textDir} value={browse.query} onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-11 rounded-none border-x-0 border-t-0 border-b-2 border-dashed border-foreground/40 bg-transparent ps-11 text-center focus-visible:ring-0" />
          </label>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-2">
        <div className="space-y-11">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <div className="mx-auto mb-5 w-fit -rotate-1 rounded-md border-2 border-dashed border-foreground/50 px-5 py-1.5">
                <h2 className="text-xl font-bold uppercase tracking-[0.18em]">
                  {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
                </h2>
              </div>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {section.items.map((item) => (
                  <KraftCard key={item.id} item={item} locale={locale} textDir={textDir}
                    showPrices={ctrl.showPrices} showImages={ctrl.showImages} showCart={ctrl.showCart} quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)} onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)} onDecrement={() => cart.decrement(item.id)} />
                ))}
              </ul>
            </section>
          ))}
          {!browse.hasResults ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <UtensilsCrossed className="h-10 w-10 text-foreground/40" aria-hidden />
              <p dir={textDir} className="text-foreground/70">{translate(locale, "menu.empty")}</p>
            </div>
          ) : null}
        </div>
      </div>

      <MenuOverlays ctrl={ctrl} />
      <footer className="px-4 pb-10 pt-2"><BrandCredit /></footer>
    </main>
  );
}

function KraftCard({
  item, locale, textDir, showPrices, showImages, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showImages: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <li className="flex flex-col overflow-hidden rounded-md border-2 border-dashed border-foreground/30 bg-card/40">
      {showImages ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={name}
          className="group relative aspect-[4/3] overflow-hidden bg-muted ring-1 ring-foreground/15"
        >
          <FallbackMenuImage src={menuItemCardImageUrl(item)} alt={name} />
          {item.isSoldOut ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/60 text-[11px] font-semibold uppercase tracking-widest text-destructive">
              {translate(locale, "menu.soldOut")}
            </span>
          ) : null}
        </button>
      ) : null}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-start">
          <h3 dir={textDir} className="line-clamp-2 text-base font-semibold leading-snug">{name}</h3>
          {description ? <p className="mt-1 line-clamp-2 text-sm italic text-foreground/75 dark:text-stone-300">{description}</p> : null}
          {!showImages && item.isSoldOut ? (
            <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span>
          ) : null}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {showPrices ? <span className="text-base font-bold">{formatMoney(price, item.currency, locale)}</span> : <span />}
          {showCart && !item.isSoldOut ? (
            quantity > 0 ? (
              <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
            ) : (
              <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-foreground/50 transition-colors hover:bg-primary hover:text-primary-foreground">
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}
