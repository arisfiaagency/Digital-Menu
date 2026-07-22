"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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

// The "App Tabs" design: a native-app feel where one category shows at a time via
// a tab bar (no long scroll). Typing in search flattens to matching items across
// every category. Best for large menus.
export function TabsMenu({ data, accent }: MenuDesignProps) {
  const ctrl = useMenuController(data);
  const { locale, textDir, cart, browse, general } = ctrl;

  const tabs = useMemo(
    () =>
      browse.orphanItems.length
        ? [...browse.sections, { category: null, items: browse.orphanItems }]
        : browse.sections,
    [browse.sections, browse.orphanItems]
  );

  const [activeId, setActiveId] = useState<string>("");
  const tabKey = (t: { category: { id: string } | null }) => t.category?.id ?? "others";
  const searching = browse.query.trim().length > 0;
  const activeTab = tabs.find((t) => tabKey(t) === activeId) ?? tabs[0];
  const shownItems = searching ? browse.visibleItems : activeTab?.items ?? [];

  return (
    <main dir={textDir} className="menu-theme-root relative flex min-h-dvh flex-col bg-background text-foreground" style={accentStyle(accent)}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {general.logoUrl ? (
              <Image src={general.logoUrl} alt={ctrl.restaurantName} width={36} height={36} className="h-9 w-9 rounded-xl object-cover ring-1 ring-border" />
            ) : null}
            <span className="truncate text-base font-bold tracking-tight">{ctrl.restaurantName}</span>
          </div>
          <MenuTopControls ctrl={ctrl} />
        </div>
      </div>

      {/* Compact header */}
      <header className="mx-auto w-full max-w-3xl px-4 pb-1 pt-4">
        {ctrl.description ? <p className="max-w-2xl text-sm text-muted-foreground">{ctrl.description}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="compact" />
          <SocialLinks social={general.socialLinks} style="soft" />
        </div>
        {ctrl.searchEnabled ? (
          <label className="relative mt-4 block w-full">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              dir={textDir}
              value={browse.query}
              onChange={(event) => browse.setQuery(event.target.value)}
              placeholder={translate(locale, "menu.search")}
              className="h-11 rounded-2xl ps-11"
            />
          </label>
        ) : null}
      </header>

      {/* Tabs (hidden while searching) */}
      {!searching && tabs.length ? (
        <nav className="sticky top-[57px] z-20 mt-3 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const key = tabKey(tab);
              const active = (activeTab && tabKey(activeTab) === key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveId(key)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span dir={textDir}>
                    {tab.category ? localized(tab.category.name, locale) : translate(locale, "menu.all")}
                  </span>
                  <span className={cn("absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors", active ? "bg-primary" : "bg-transparent")} />
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}

      {/* Active category (or flat search results) */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5">
        {shownItems.length ? (
          <ul className="space-y-2.5">
            {shownItems.map((item) => (
              <TabRow
                key={item.id}
                item={item}
                locale={locale}
                textDir={textDir}
                showPrices={ctrl.showPrices}
                showImages={ctrl.showImages}
                showCart={ctrl.showCart}
                logoUrl={ctrl.logoUrl}
                quantity={cart.quantityOf(item.id)}
                onOpen={() => ctrl.setActiveItem(item)}
                onAdd={() => cart.add(item)}
                onIncrement={() => cart.increment(item.id)}
                onDecrement={() => cart.decrement(item.id)}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" aria-hidden />
            <p dir={textDir} className="text-muted-foreground">{translate(locale, "menu.empty")}</p>
          </div>
        )}
      </div>

      <MenuOverlays ctrl={ctrl} />

      <footer className="px-4 pb-10 pt-2">
        <BrandCredit />
      </footer>
    </main>
  );
}

function TabRow({
  item,
  locale,
  textDir,
  showPrices,
  showImages,
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
  showImages: boolean;
  showCart: boolean;
  logoUrl?: string;
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
    <li className="flex items-center gap-3 rounded-2xl border bg-card p-2.5">
      {showImages ? (
        <button type="button" onClick={onOpen} aria-label={name} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          <FallbackMenuImage src={item.imageUrl} alt={name} fallbackSrc={logoUrl} />
        </button>
      ) : null}
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <h3 dir={textDir} className="truncate text-sm font-bold">{name}</h3>
        {description ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p> : null}
        <div className="mt-1 flex items-center gap-1.5">
          {showPrices ? (
            <span className="text-sm font-extrabold text-primary">{formatMoney(price, item.currency, locale)}</span>
          ) : null}
          {showPrices && hasDiscount ? (
            <span className="text-[11px] text-muted-foreground line-through">{formatMoney(item.basePrice, item.currency, locale)}</span>
          ) : null}
          {item.isSoldOut ? (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span>
          ) : null}
        </div>
      </button>
      {showCart && !item.isSoldOut ? (
        <div className="shrink-0">
          {quantity > 0 ? (
            <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={onIncrement} onDecrement={onDecrement} />
          ) : (
            <button
              type="button"
              aria-label={`${translate(locale, "cart.add")} ${name}`}
              onClick={onAdd}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:bg-primary/90 active:scale-90"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
