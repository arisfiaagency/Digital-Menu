"use client";

import Image from "next/image";
import { Minus, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { SocialLinks } from "@/components/menu/social-links";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { menuItemCardImageUrl } from "@/lib/storage/menu-image";
import { useMenuController, MenuTopControls, MenuOverlays } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { DesignBackdrop } from "@/components/menu/design-backdrop";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney, formatNumber } from "@/lib/utils/format";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

// Serif stack for the classic printed-menu look.
const CLASSIC_SERIF = "Georgia, 'Times New Roman', 'Noto Naskh Arabic', serif";

// The "Classic" design: a timeless printed menu — warm serif type, centered
// section headings with rules, and item lines with dotted price leaders. Imagery
// stays minimal so it reads like a real menu card.
export function ClassicMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;

  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main
      dir={textDir}
      className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground"
      style={{ ...accentStyle(accent), fontFamily: CLASSIC_SERIF }}
    >
      <DesignBackdrop design="classic" />
      {/* Slim top bar */}
      <div className="border-b border-stone-300/70 dark:border-stone-700/60">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <span className="truncate text-xs font-semibold uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400">
            {ctrl.restaurantName}
          </span>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      {/* Header */}
      <header className="mx-auto w-full max-w-3xl px-5 pb-6 pt-10 text-center">
        {general.logoUrl ? (
          <Image src={general.logoUrl} alt={ctrl.restaurantName} width={72} height={72} className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-1 ring-stone-300 dark:ring-stone-700" priority />
        ) : null}
        <div className="mx-auto flex max-w-xs items-center gap-3 text-primary/70">
          <span className="h-px flex-1 bg-current" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">{translate(locale, "menu.title")}</span>
          <span className="h-px flex-1 bg-current" />
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{ctrl.restaurantName}</h1>
        {ctrl.description ? <p className="mx-auto mt-3 max-w-xl text-sm italic text-stone-600 dark:text-stone-400">{ctrl.description}</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="outline" />
          <SocialLinks social={general.socialLinks} style="outline" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mt-6 block w-full max-w-sm">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(event) => browse.setQuery(event.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-11 rounded-none border-x-0 border-t-0 border-b border-stone-400 bg-transparent ps-11 text-center focus-visible:ring-0"
            />
          </label>
        ) : null}
      </header>

      {/* Sections */}
      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-4">
        <div className="space-y-12">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <h2 className="mb-6 text-center text-2xl font-bold uppercase tracking-[0.18em]">
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4">
                {section.items.map((item) => (
                  <ClassicCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    textDir={textDir}
                    showPrices={ctrl.showPrices}
                    showImages={ctrl.showImages}
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
              <UtensilsCrossed className="h-10 w-10 text-stone-400" aria-hidden />
              <p dir={textDir} className="text-stone-500">{translate(locale, "menu.empty")}</p>
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

function ClassicCard({
  item,
  locale,
  textDir,
  showPrices,
  showImages,
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
  showImages: boolean;
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
    <li className="flex flex-col overflow-hidden rounded-md border border-stone-300/70 bg-card/60 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700/60">
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
          <h3 dir={textDir} className="line-clamp-2 text-base font-semibold leading-snug">{name}</h3>
          {description ? <p className="mt-1 line-clamp-2 text-xs italic text-stone-600 dark:text-stone-400">{description}</p> : null}
          {!showImages && item.isSoldOut ? (
            <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span>
          ) : null}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {showPrices ? (
            <span className="min-w-0 text-base font-semibold text-primary">
              {formatMoney(price, item.currency, locale)}
              {hasDiscount ? (
                <span className="ms-1 text-xs text-stone-500 line-through">{formatMoney(item.basePrice, item.currency, locale)}</span>
              ) : null}
            </span>
          ) : (
            <span />
          )}
          {showCart && !item.isSoldOut ? (
            quantity > 0 ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-primary/40 p-0.5">
                <button type="button" aria-label="Decrease" onClick={onDecrement} className="flex h-10 w-10 items-center justify-center rounded-full text-primary hover:bg-primary/10 sm:h-8 sm:w-8">
                  <Minus className="h-3 w-3" aria-hidden />
                </button>
                <span className="min-w-4 text-center text-xs font-bold tabular-nums">{formatNumber(quantity, locale)}</span>
                <button type="button" aria-label="Increase" onClick={onIncrement} className="flex h-10 w-10 items-center justify-center rounded-full text-primary hover:bg-primary/10 sm:h-8 sm:w-8">
                  <Plus className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`${translate(locale, "cart.add")} ${name}`}
                onClick={onAdd}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}
