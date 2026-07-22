"use client";

import { useEffect, useState } from "react";
import { CartFab, CartIconButton, CartSheet } from "@/components/menu/cart";
import { LanguageGlobe } from "@/components/menu/language-globe";
import { ThemeToggle } from "@/components/menu/theme-toggle";
import { MenuItemDetailModal } from "@/components/menu/menu-item-detail-modal";
import { useMenuBrowse, type MenuBrowse } from "@/components/menu/use-menu-browse";
import { useCart, type Cart } from "@/hooks/use-cart";
import { useLocale } from "@/hooks/use-locale";
import { localized, locales } from "@/lib/i18n/config";
import { serviceFeeAmount } from "@/lib/utils/format";
import type { AppData, GeneralSettings, Locale, MenuItem } from "@/types/models";
import type { LocaleDirection } from "@/lib/i18n/config";

// Shared wiring every menu design reuses: locale + direction, the cart, the
// browse/search state, the open item, and the derived display flags. Each design
// consumes this and lays the page out its own way.
export type MenuController = {
  data: AppData;
  general: GeneralSettings;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  textDir: LocaleDirection;
  cart: Cart;
  browse: MenuBrowse;
  activeItem: MenuItem | null;
  setActiveItem: (item: MenuItem | null) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  restaurantName: string;
  description: string;
  logoUrl?: string;
  enabledLocales: Locale[];
  serviceFeePercent: number;
  showPrices: boolean;
  showImages: boolean;
  showCart: boolean;
  searchEnabled: boolean;
  darkModeEnabled: boolean;
};

export function useMenuController(data: AppData): MenuController {
  const { locale, setLocale, dir: textDir } = useLocale(data.general.defaultLanguage);
  const cart = useCart();
  const browse = useMenuBrowse(data);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Lock body scroll while the item modal is open (shared by every design).
  useEffect(() => {
    if (!activeItem) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveItem(null);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [activeItem]);

  const general = data.general;
  return {
    data,
    general,
    locale,
    setLocale,
    textDir,
    cart,
    browse,
    activeItem,
    setActiveItem,
    cartOpen,
    setCartOpen,
    restaurantName: localized(general.restaurantName, locale),
    description: localized(general.description, locale),
    logoUrl: general.logoUrl,
    enabledLocales: general.enabledLanguages?.length ? general.enabledLanguages : locales,
    serviceFeePercent: general.serviceFeePercent ?? 10,
    showPrices: data.menu.showPrices,
    showImages: data.menu.showImages,
    showCart: data.menu.showPrices,
    searchEnabled: data.menu.enableSearch,
    darkModeEnabled: data.menu.enableDarkMode !== false
  };
}

// The cart / theme / language buttons every design shows in its top bar.
// `hideTheme` is set by fixed-dark designs (neon, chalkboard) where a light/dark
// toggle doesn't make sense.
export function MenuTopControls({ ctrl, hideTheme = false }: { ctrl: MenuController; hideTheme?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ctrl.showCart ? (
        <CartIconButton count={ctrl.cart.totalQuantity} locale={ctrl.locale} onClick={() => ctrl.setCartOpen(true)} />
      ) : null}
      {!hideTheme && ctrl.darkModeEnabled ? <ThemeToggle presentation="circle" iconStyle="sunMoon" /> : null}
      <LanguageGlobe locale={ctrl.locale} onChange={ctrl.setLocale} availableLocales={ctrl.enabledLocales} />
    </div>
  );
}

// Fixed-dark designs (neon, chalkboard) force the `dark` class so the shared cart
// sheet + item modal (which use bg-card / bg-background) match the dark canvas.
export function useForcedDark() {
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);
}

// The floating cart pill + item detail modal + cart sheet. Dropped in once per
// design; they render themselves only when relevant.
export function MenuOverlays({ ctrl }: { ctrl: MenuController }) {
  const grandTotal = ctrl.cart.totalPrice + serviceFeeAmount(ctrl.cart.totalPrice, ctrl.serviceFeePercent);
  return (
    <>
      {ctrl.showCart && ctrl.cart.totalQuantity > 0 ? (
        <CartFab
          count={ctrl.cart.totalQuantity}
          total={grandTotal}
          currency={ctrl.cart.currency ?? ctrl.general.defaultCurrency}
          locale={ctrl.locale}
          textDir={ctrl.textDir}
          onClick={() => ctrl.setCartOpen(true)}
        />
      ) : null}

      {ctrl.activeItem ? (
        <MenuItemDetailModal
          item={ctrl.activeItem}
          category={ctrl.data.categories.find((category) => category.id === ctrl.activeItem?.categoryId)}
          settings={ctrl.data.menu}
          locale={ctrl.locale}
          textDir={ctrl.textDir}
          cart={ctrl.cart}
          logoUrl={ctrl.logoUrl}
          onClose={() => ctrl.setActiveItem(null)}
        />
      ) : null}

      <CartSheet
        open={ctrl.cartOpen}
        onClose={() => ctrl.setCartOpen(false)}
        cart={ctrl.cart}
        locale={ctrl.locale}
        textDir={ctrl.textDir}
        serviceFeePercent={ctrl.serviceFeePercent}
        logoUrl={ctrl.logoUrl}
      />
    </>
  );
}
