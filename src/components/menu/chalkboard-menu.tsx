"use client";

import Image from "next/image";
import { Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { SocialLinks } from "@/components/menu/social-links";
import { QuantityStepper } from "@/components/menu/cart";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { menuItemCardImageUrl } from "@/lib/storage/menu-image";
import { useMenuController, MenuTopControls, MenuOverlays, useForcedDark } from "@/components/menu/menu-shell";
import { BrandCredit } from "@/components/brand-credit";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { DesignBackdrop } from "@/components/menu/design-backdrop";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney } from "@/lib/utils/format";
import { accentStyle } from "@/lib/utils/accent";
import type { Locale, MenuItem } from "@/types/models";

// Casual handwriting stack for the chalk lettering (falls back to the browser's
// cursive default when no system script font is present).
const CHALK_FONT = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Noto Naskh Arabic', cursive";

// The "Chalkboard" design: a dark slate board with white chalk lettering, colored
// chalk headings, and hand-drawn dashed rules. Text-forward like a real café board.
export function ChalkboardMenu({ data, accent }: MenuDesignProps) {
  useForcedDark();
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;

  const allSections = browse.orphanItems.length
    ? [...browse.sections, { category: null, items: browse.orphanItems }]
    : browse.sections;

  return (
    <main
      dir={textDir}
      className="menu-theme-root relative isolate min-h-dvh bg-background text-foreground"
      style={{ ...accentStyle(accent), fontFamily: CHALK_FONT }}
    >
      <DesignBackdrop design="chalkboard" />
      {/* Top bar */}
      <div className="border-b border-dashed border-white/25">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <span className="truncate text-sm tracking-wide text-[#f3efe6]/80">{ctrl.restaurantName}</span>
          <MenuTopControls ctrl={ctrl} hideTheme />
        </div>
      </div>

      {/* Header */}
      <header className="mx-auto w-full max-w-3xl px-5 pb-6 pt-9 text-center">
        {general.logoUrl ? (
          <Image src={general.logoUrl} alt={ctrl.restaurantName} width={72} height={72} className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-2 ring-white/30" priority />
        ) : null}
        <h1 className="text-5xl font-bold tracking-wide sm:text-6xl" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.12)" }}>
          {ctrl.restaurantName}
        </h1>
        {ctrl.description ? <p className="mx-auto mt-3 max-w-xl text-base text-[#f3efe6]/75">{ctrl.description}</p> : null}
        <div className="mx-auto mt-4 h-px max-w-xs border-t-2 border-dashed border-white/30" aria-hidden />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="outline" />
          <SocialLinks social={general.socialLinks} style="outline" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mx-auto mt-6 block w-full max-w-sm">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3efe6]/70" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(event) => browse.setQuery(event.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-11 rounded-none border-x-0 border-t-0 border-b-2 border-dashed border-white/40 bg-transparent ps-11 text-center text-[#f3efe6] placeholder:text-[#f3efe6]/50 focus-visible:ring-0"
            />
          </label>
        ) : null}
      </header>

      {/* Sections */}
      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-2">
        <div className="space-y-12">
          {allSections.map((section) => (
            <section key={section.category?.id ?? "others"}>
              <h2 className="mb-5 text-center text-3xl font-bold tracking-wide text-primary" style={{ textShadow: "0 1px 0 rgba(0,0,0,0.3)" }}>
                {section.category ? localized(section.category.name, locale) : translate(locale, "menu.all")}
              </h2>
              <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4">
                {section.items.map((item) => (
                  <ChalkCard
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
              <UtensilsCrossed className="h-10 w-10 text-white/40" aria-hidden />
              <p dir={textDir} className="text-[#f3efe6]/70">{translate(locale, "menu.empty")}</p>
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

function ChalkCard({
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
    <li className="flex flex-col overflow-hidden rounded-md border-2 border-dashed border-white/25 bg-black/10">
      {showImages ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={name}
          className="group relative aspect-[4/3] overflow-hidden bg-black/20 ring-1 ring-white/15"
        >
          <FallbackMenuImage src={menuItemCardImageUrl(item)} alt={name} />
          {item.isSoldOut ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs uppercase tracking-widest text-rose-300">
              {translate(locale, "menu.soldOut")}
            </span>
          ) : null}
        </button>
      ) : null}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <button type="button" onClick={onOpen} className="min-w-0 text-start">
          <h3 className="line-clamp-2 text-lg leading-snug">{name}</h3>
          {description ? <p className="mt-0.5 line-clamp-2 text-sm text-[#f3efe6]/70">{description}</p> : null}
          {!showImages && item.isSoldOut ? (
            <span className="mt-1 inline-block text-xs uppercase tracking-widest text-rose-300">{translate(locale, "menu.soldOut")}</span>
          ) : null}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {showPrices ? (
            <span className="text-xl font-bold text-primary">
              {formatMoney(price, item.currency, locale)}
              {hasDiscount ? (
                <span className="ms-1.5 text-xs font-normal text-[#f3efe6]/50 line-through">{formatMoney(item.basePrice, item.currency, locale)}</span>
              ) : null}
            </span>
          ) : (
            <span />
          )}
          {showCart && !item.isSoldOut ? (
            quantity > 0 ? (
              <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
            ) : (
              <button
                type="button"
                aria-label={`${translate(locale, "cart.add")} ${name}`}
                onClick={onAdd}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-white/50 text-[#f3efe6] transition-colors hover:border-primary hover:text-primary"
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
