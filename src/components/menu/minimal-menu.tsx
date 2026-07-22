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

// The "Minimal" design: stark and typographic — lots of whitespace, small
// mono-ish labels, no imagery, prices aligned to the edge. Monochrome with a
// single accent for interactive bits.
export function MinimalMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;

  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main dir={textDir} className="menu-theme-root relative min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      {/* Top bar */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-6 py-5">
        <span className="truncate text-sm font-medium tracking-tight">{ctrl.restaurantName}</span>
        <MenuTopControls ctrl={ctrl} />
      </div>

      {/* Header */}
      <header className="mx-auto w-full max-w-2xl px-6 pb-4 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mt-2 max-w-xl text-sm text-muted-foreground">{ctrl.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="compact" />
          <SocialLinks social={general.socialLinks} style="icons" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mt-5 block w-full">
            <Search className="pointer-events-none absolute start-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(event) => browse.setQuery(event.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-10 rounded-none border-0 border-b border-border bg-transparent ps-6 focus-visible:ring-0"
            />
          </label>
        ) : null}
      </header>

      {/* Sections */}
      <div className="mx-auto w-full max-w-2xl px-6 pb-28 pt-4">
        <div className="space-y-14">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <ul className="divide-y divide-border/60">
                {section.items.map((item) => (
                  <MinimalRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    textDir={textDir}
                    showPrices={ctrl.showPrices}
                    showCart={ctrl.showCart}
                    quantity={cart.quantityOf(item.id)}
                    onOpen={() => ctrl.setActiveItem(item)}
                    onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)}
                    onDecrement={() => cart.decrement(item.id)}
                  />
                ))}
              </ul>
            </section>
          ))}

          {!browse.hasResults ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <UtensilsCrossed className="h-9 w-9 text-muted-foreground/50" aria-hidden />
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

function MinimalRow({
  item,
  locale,
  textDir,
  showPrices,
  showCart,
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
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);
  const hasDiscount = Boolean(item.discountPrice);

  return (
    <li className="flex items-center gap-4 py-4">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-base font-medium">{name}</span>
          {showPrices ? (
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {formatMoney(price, item.currency, locale)}
              {hasDiscount ? (
                <span className="ms-1.5 text-xs line-through opacity-60">{formatMoney(item.basePrice, item.currency, locale)}</span>
              ) : null}
            </span>
          ) : null}
        </div>
        {description ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/80">{description}</p> : null}
        {item.isSoldOut ? (
          <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span>
        ) : null}
      </button>
      {showCart && !item.isSoldOut ? (
        quantity > 0 ? (
          <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
        ) : (
          <button
            type="button"
            aria-label={`${translate(locale, "cart.add")} ${name}`}
            onClick={onAdd}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        )
      ) : null}
    </li>
  );
}
