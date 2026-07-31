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
    <main dir={textDir} className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground" style={{ ...accentStyle(accent), fontFamily: SERIF }}>
      <DesignBackdrop design="magazine" />
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
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {section.items.map((item) => (
                  <MagazineCard key={item.id} item={item} locale={locale} textDir={textDir}
                    showPrices={ctrl.showPrices} showImages={ctrl.showImages} showCart={ctrl.showCart} quantity={cart.quantityOf(item.id)}
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

function MagazineCard({
  item, locale, textDir, showPrices, showImages, showCart, quantity, onOpen, onAdd, onIncrement, onDecrement
}: {
  item: MenuItem; locale: Locale; textDir: "ltr" | "rtl"; showPrices: boolean; showImages: boolean; showCart: boolean;
  quantity: number; onOpen: () => void; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);

  return (
    <article className="flex flex-col overflow-hidden border border-foreground/15 bg-card">
      {showImages ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={name}
          className="group relative aspect-[4/3] overflow-hidden bg-muted"
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
          <h3 dir={textDir} className="line-clamp-2 text-base font-bold leading-snug">{name}</h3>
          {description ? <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{description}</p> : null}
          {!showImages && item.isSoldOut ? (
            <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span>
          ) : null}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {showPrices ? <span className="font-bold text-primary">{formatMoney(price, item.currency, locale)}</span> : <span />}
          {showCart && !item.isSoldOut ? (
            quantity > 0 ? (
              <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
            ) : (
              <button type="button" aria-label={`${translate(locale, "cart.add")} ${name}`} onClick={onAdd}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
