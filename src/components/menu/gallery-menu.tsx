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
import { DesignBackdrop } from "@/components/menu/design-backdrop";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney } from "@/lib/utils/format";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

// The "Photo Gallery" design: an image-first grid of full-bleed square tiles with
// the name + price laid over the photo (Instagram-style). The most visual design —
// best for cafes with strong food photography.
export function GalleryMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;

  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      <DesignBackdrop design="gallery" />
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="truncate text-base font-bold tracking-tight">{ctrl.restaurantName}</span>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-4 pb-2 pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{ctrl.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="compact" />
          <SocialLinks social={general.socialLinks} style="soft" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mt-5 block w-full max-w-lg">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(event) => browse.setQuery(event.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-12 rounded-2xl ps-11"
            />
          </label>
        ) : null}
      </header>

      {/* Sections */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6">
        <div className="space-y-10">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <h2 dir={textDir} className="mb-4 text-xl font-extrabold tracking-tight">
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {section.items.map((item) => (
                  <GalleryTile
                    key={item.id}
                    item={item}
                    locale={locale}
                    textDir={textDir}
                    showPrices={ctrl.showPrices}
                    showCart={ctrl.showCart}
                    logoUrl={ctrl.logoUrl}
                    quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)}
                    onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)}
                    onDecrement={() => cart.decrement(item.id)}
                  />
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

      <footer className="px-4 pb-10 pt-2">
        <BrandCredit />
      </footer>
    </main>
  );
}

function GalleryTile({
  item,
  locale,
  textDir,
  showPrices,
  showCart,
  logoUrl,
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
  logoUrl?: string;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const price = effectiveItemPrice(item);
  const hasDiscount = Boolean(item.discountPrice);

  return (
    <article className="group relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm">
      <button type="button" onClick={onOpen} aria-label={name} className="absolute inset-0">
        <FallbackMenuImage src={item.imageUrl} alt={name} fallbackSrc={logoUrl} />
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden />
      </button>

      {item.isNew ? (
        <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
          {translate(locale, "menu.new")}
        </span>
      ) : null}
      {item.isSoldOut ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold uppercase tracking-wide text-white">
          {translate(locale, "menu.soldOut")}
        </span>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-white">
        <h3 dir={textDir} className="line-clamp-2 text-sm font-bold leading-snug drop-shadow">{name}</h3>
        {showPrices ? (
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-sm font-extrabold drop-shadow">{formatMoney(price, item.currency, locale)}</span>
            {hasDiscount ? (
              <span className="text-[11px] text-white/70 line-through">{formatMoney(item.basePrice, item.currency, locale)}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {showCart && !item.isSoldOut ? (
        <div className="absolute bottom-2 end-2">
          {quantity > 0 ? (
            <div className="pointer-events-auto rounded-full bg-black/45 p-0.5 backdrop-blur">
              <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
            </div>
          ) : (
            <button
              type="button"
              aria-label={`${translate(locale, "cart.add")} ${name}`}
              onClick={onAdd}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:bg-primary/90 active:scale-90"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
