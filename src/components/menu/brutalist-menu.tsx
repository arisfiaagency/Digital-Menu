"use client";

import { Plus, Search, UtensilsCrossed } from "lucide-react";
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
    <main dir={textDir} className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground" style={{ ...accentStyle(accent), fontFamily: MONO }}>
      <DesignBackdrop design="brutalist" />
      <div className="border-b-4 border-foreground">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
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
              <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4">
                {section.items.map((item) => (
                  <BrutalCard key={item.id} item={item} locale={locale} textDir={textDir}
                    showPrices={ctrl.showPrices} showImages={ctrl.showImages} showCart={ctrl.showCart} quantity={cart.quantityOf(item.id)}
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

function BrutalCard({
  item, locale, textDir, showPrices, showImages, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showImages: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <li className="flex flex-col border-2 border-foreground bg-card" style={{ boxShadow: "4px 4px 0 hsl(var(--foreground))" }}>
      {showImages ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={name}
          className="group relative aspect-square overflow-hidden border-b-2 border-foreground bg-muted"
        >
          <FallbackMenuImage src={menuItemCardImageUrl(item)} alt={name} />
          {item.isSoldOut ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-[10px] font-black uppercase tracking-widest text-destructive">
              {translate(locale, "menu.soldOut")}
            </span>
          ) : null}
        </button>
      ) : null}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <button type="button" onClick={onOpen} className="min-w-0 text-start">
          <h3 dir={textDir} className="line-clamp-2 text-sm font-black uppercase leading-tight">{name}</h3>
          {description ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p> : null}
          {!showImages && item.isSoldOut ? (
            <span className="mt-1 inline-block text-[10px] font-black uppercase text-destructive">{translate(locale, "menu.soldOut")}</span>
          ) : null}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {showPrices ? <span className="text-sm font-black tabular-nums">{formatMoney(price, item.currency, locale)}</span> : <span />}
          {showCart && !item.isSoldOut ? (
            quantity > 0 ? (
              <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
            ) : (
              <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
                className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground transition-transform active:translate-x-0.5 active:translate-y-0.5">
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}
