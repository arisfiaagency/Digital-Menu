"use client";

import { Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
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

// The "Playful Pastel" design: soft gradient canvas, big pillowy rounded cards,
// bubble category headers. Cheerful — for juice bars, bubble tea, dessert.
export function PastelMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative min-h-dvh bg-gradient-to-b from-primary/10 via-background to-primary/5 text-foreground" style={accentStyle(accent)}>
      <div className="sticky top-0 z-30 bg-background/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-base font-extrabold tracking-tight">{ctrl.restaurantName}</span>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      <header className="mx-auto w-full max-w-4xl px-4 pb-2 pt-7 text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{ctrl.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="pill" />
          <SocialLinks social={general.socialLinks} style="soft" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mt-5 block w-full max-w-md">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input dir={textDir} value={browse.query} onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search")} className="h-12 rounded-full border-primary/20 bg-white/70 ps-11 text-center shadow-sm dark:bg-white/5" />
          </label>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-4">
        <div className="space-y-9">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <div className="mb-4 flex justify-center">
                <span className="rounded-full bg-primary/15 px-5 py-1.5 text-sm font-extrabold text-primary">
                  {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.items.map((item) => (
                  <PastelCard key={item.id} item={item} locale={locale} textDir={textDir}
                    showPrices={ctrl.showPrices} showImages={ctrl.showImages} showCart={ctrl.showCart} logoUrl={ctrl.logoUrl}
                    quantity={cart.quantityOf(item.id)} onOpen={() => ctrl.setActiveItem(item)} onAdd={() => cart.add(item)}
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

function PastelCard({
  item, locale, textDir, showPrices, showImages, showCart, logoUrl, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showImages: boolean; showCart: boolean;
  logoUrl?: string; quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <article className="flex items-center gap-3 rounded-[1.75rem] border border-primary/10 bg-card/80 p-3 shadow-sm">
      {showImages ? (
        <button type="button" onClick={onOpen} aria-label={name} className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-muted">
          <FallbackMenuImage src={item.imageUrl} alt={name} fallbackSrc={logoUrl} />
        </button>
      ) : null}
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <h3 dir={textDir} className="truncate text-base font-extrabold">{name}</h3>
        {description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p> : null}
        {showPrices ? <span className="mt-1 inline-block text-sm font-black text-primary">{formatMoney(price, item.currency, locale)}</span> : null}
        {item.isSoldOut ? <span className="ms-2 text-[10px] font-bold uppercase text-destructive">{translate(locale, "menu.soldOut")}</span> : null}
      </button>
      {showCart && !item.isSoldOut ? (
        quantity > 0 ? (
          <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
        ) : (
          <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-90">
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        )
      ) : null}
    </article>
  );
}
