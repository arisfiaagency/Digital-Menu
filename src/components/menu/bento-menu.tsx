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
import { cn } from "@/lib/utils/cn";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

// The "Bento Mosaic" design: a masonry of photo tiles where featured/popular
// items grow taller — an editorial, Pinterest-like mosaic that spotlights specials.
export function BentoMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;
  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      <div className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-base font-extrabold tracking-tight">{ctrl.restaurantName}</span>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      <header className="mx-auto w-full max-w-5xl px-4 pb-2 pt-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{ctrl.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="compact" />
          <SocialLinks social={general.socialLinks} style="soft" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mt-5 block w-full max-w-lg">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input dir={textDir} value={browse.query} onChange={(e) => browse.setQuery(e.target.value)}
              placeholder={translate(locale, "menu.search")} className="h-12 rounded-2xl ps-11" />
          </label>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6">
        <div className="space-y-10">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <h2 dir={textDir} className="mb-4 text-xl font-black tracking-tight">
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <div className="[column-fill:_balance] columns-2 gap-3 sm:columns-3 lg:columns-4">
                {section.items.map((item) => (
                  <BentoTile key={item.id} item={item} locale={locale} textDir={textDir}
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

function BentoTile({
  item, locale, textDir, showPrices, showImages, showCart, logoUrl, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showImages: boolean; showCart: boolean;
  logoUrl?: string; quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const price = effectiveItemPrice(item);
  // Featured / popular items get a taller tile so the mosaic spotlights them.
  const big = item.isFeatured || item.isPopular;

  return (
    <article className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border bg-card shadow-sm">
      {showImages ? (
        <button type="button" onClick={onOpen} aria-label={name} className={cn("relative block w-full overflow-hidden bg-muted", big ? "aspect-[3/4]" : "aspect-square")}>
          <FallbackMenuImage src={item.imageUrl} alt={name} fallbackSrc={logoUrl} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
          {item.isFeatured ? (
            <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">{translate(locale, "menu.featured")}</span>
          ) : null}
          {item.isSoldOut ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold uppercase text-white">{translate(locale, "menu.soldOut")}</span>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-white">
            <h3 dir={textDir} className={cn("line-clamp-2 font-bold leading-snug drop-shadow", big ? "text-base" : "text-sm")}>{name}</h3>
            {showPrices ? <span className="text-sm font-extrabold drop-shadow">{formatMoney(price, item.currency, locale)}</span> : null}
          </div>
        </button>
      ) : (
        <button type="button" onClick={onOpen} className="block w-full p-4 text-start">
          <h3 dir={textDir} className="text-sm font-bold">{name}</h3>
          {showPrices ? <span className="mt-1 block text-sm font-extrabold text-primary">{formatMoney(price, item.currency, locale)}</span> : null}
        </button>
      )}
      {showCart && !item.isSoldOut ? (
        <div className="flex items-center justify-end p-2">
          {quantity > 0 ? (
            <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
          ) : (
            <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:bg-primary/90 active:scale-90">
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
