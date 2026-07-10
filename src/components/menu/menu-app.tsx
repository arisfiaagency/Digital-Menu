"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  UtensilsCrossed,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CartFab, CartIconButton, CartSheet, QuantityStepper } from "@/components/menu/cart";
import { useCart, type Cart } from "@/hooks/use-cart";
import { CategoryIcon } from "@/components/menu/category-icon";
import { LocationPinIcon, PhoneSignalIcon, WhatsappSendIcon } from "@/components/menu/menu-contact-icons";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { LanguageGlobe } from "@/components/menu/language-globe";
import { MenuBackground } from "@/components/menu/menu-background";
import { ThemeToggle } from "@/components/menu/theme-toggle";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { SocialLinks } from "@/components/menu/social-links";
import { BrandCredit } from "@/components/brand-credit";
import { defaultAppData } from "@/data/default-data";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney, normalizeSearch, serviceFeeAmount } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { menuThemeStyle, readableForegroundHslVar } from "@/lib/utils/color";
import { useLocale } from "@/hooks/use-locale";
import type { AppData, Category, CategoryNavStyle, Locale, MenuItem, MenuSettings, SectionHeaderStyle } from "@/types/models";

export function MenuApp({
  initialCategorySlug,
  initialData
}: {
  initialCategorySlug?: string;
  initialData?: AppData;
}) {
  const { locale, setLocale, dir: textDir } = useLocale(defaultAppData.general.defaultLanguage, {
    documentDirection: "ltr"
  });
  const [data] = useState<AppData>(initialData ?? defaultAppData);
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [contactPrompt, setContactPrompt] = useState<{
    title: string;
    description?: string;
    confirmLabel: string;
    href: string;
    external: boolean;
  } | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (!activeItem) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveItem(null);
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [activeItem]);

  const visibleItems = useMemo(() => {
    const normalized = normalizeSearch(query);
    return data.menuItems
      .filter((item) => data.menu.showSoldOutItems || !item.isSoldOut)
      .filter((item) => {
        if (!normalized) return true;
        const category = data.categories.find((entry) => entry.id === item.categoryId);
        const haystack = [
          ...Object.values(item.name),
          ...Object.values(item.description || {}),
          ...Object.values(item.ingredients || {}),
          ...item.tags,
          ...(category ? Object.values(category.name) : [])
        ]
          .map(normalizeSearch)
          .join(" ");
        return haystack.includes(normalized);
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [data, query]);

  // Group the visible items under their category so the menu shows every
  // section with a heading instead of one flat list.
  const sections = useMemo(() => {
    return [...data.categories]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((category) => ({
        category,
        items: visibleItems.filter((item) => item.categoryId === category.id)
      }))
      .filter((section) => section.items.length > 0);
  }, [data.categories, visibleItems]);

  // Items whose category is missing/inactive still render so nothing disappears.
  const orphanItems = useMemo(() => {
    const known = new Set(data.categories.map((category) => category.id));
    return visibleItems.filter((item) => !known.has(item.categoryId));
  }, [data.categories, visibleItems]);

  const scrollToCategory = useCallback((id: string) => {
    setActiveCategoryId(id);
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Highlight the pill of the section currently scrolled under the sticky bar.
  // rAF-throttled so fast scrolling does at most one layout read per frame.
  useEffect(() => {
    let ticking = false;
    function update() {
      ticking = false;
      const offset = 120;
      let current = "all";
      for (const section of sections) {
        const el = sectionRefs.current[section.category.id];
        if (el && el.getBoundingClientRect().top <= offset) current = section.category.id;
      }
      setActiveCategoryId(current);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  // When opening /menu/category/[slug], jump straight to that section once.
  useEffect(() => {
    if (initialScrollDone.current || !initialCategorySlug) return;
    const category = data.categories.find((entry) => entry.slug === initialCategorySlug);
    const el = category ? sectionRefs.current[category.id] : null;
    if (!el) return;
    initialScrollDone.current = true;
    requestAnimationFrame(() => el.scrollIntoView({ behavior: "auto", block: "start" }));
  }, [data.categories, initialCategorySlug, sections]);

  const restaurantName = localized(data.general.restaurantName, locale);
  const description = localized(data.general.description, locale);
  const logoUrl = data.general.logoUrl;
  const serviceFeePercent = data.general.serviceFeePercent ?? 10;
  const cartGrandTotal = cart.totalPrice + serviceFeeAmount(cart.totalPrice, serviceFeePercent);

  const appearance = data.appearance;
  const cardDesign = appearance.cardDesign ?? "classic";
  // Compact cards are horizontal, so they read best in a 1–2 column list; the
  // image-forward classic/overlay designs use the wider grid.
  const itemsGridClass = cardDesign === "compact" ? "grid gap-3 lg:grid-cols-2" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3";
  const categoryNavStyle = appearance.categoryNavStyle ?? "pills";
  const sectionHeaderStyle = appearance.sectionHeaderStyle ?? "plain";

  // --- Header customization ---
  const headerCompact = appearance.headerLayout === "compact";
  const headerAlign = appearance.headerAlign ?? "left";
  const headerBgType = appearance.headerBackgroundType ?? "theme";
  const headerStyle: React.CSSProperties | undefined =
    headerBgType === "solid"
      ? { backgroundColor: appearance.headerBackgroundColor || "#ffffff" }
      : headerBgType === "gradient"
        ? { backgroundImage: `linear-gradient(to bottom, ${appearance.headerGradientFrom || "#ecfdf5"}, ${appearance.headerGradientTo || "#ffffff"})` }
        : undefined;
  const showContactRow = appearance.showContactRow !== false;

  // --- Search customization ---
  const searchEnabled = data.menu.enableSearch;
  const searchPlacement = appearance.searchPlacement ?? "header";
  const searchInputClass = cn(
    "w-full ps-10",
    (appearance.searchSize ?? "normal") === "large" ? "h-14 text-base" : "h-12",
    (appearance.searchShape ?? "pill") === "pill" ? "rounded-full" : appearance.searchShape === "square" ? "rounded-none" : "rounded-lg",
    (appearance.searchStyle ?? "outlined") === "filled" ? "border-transparent bg-muted" : ""
  );
  const searchField = searchEnabled ? (
    <label className={cn("relative block w-full max-w-2xl", headerAlign === "center" && "mx-auto")}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input className={searchInputClass} dir={textDir} placeholder={translate(locale, "menu.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
    </label>
  ) : null;

  // --- Above-category region ---
  const aboveCategory = appearance.aboveCategory ?? "none";
  const coverImageUrl = data.general.coverImageUrl;
  const promoText = localized(data.general.promoText, locale);

  // Reusable header pieces (shared by the left and centered layouts).
  const brandLogo = (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary font-bold text-primary-foreground shadow-md ring-1 ring-primary/20", headerCompact ? "h-12 w-12 text-base" : "h-14 w-14 text-lg sm:h-16 sm:w-16 sm:text-xl")}>
      {logoUrl ? <Image src={logoUrl} alt={restaurantName} width={64} height={64} className="h-full w-full object-cover" priority /> : restaurantName.slice(0, 2)}
    </div>
  );
  const brandText = (
    <div className="min-w-0" dir={textDir}>
      <h1 className={cn("truncate font-bold", headerCompact ? "text-lg sm:text-2xl" : "text-xl sm:text-3xl")}>{restaurantName}</h1>
      {description ? <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
  const actionButtons = (
    <div className="flex shrink-0 items-center justify-end gap-2">
      {data.menu.showPrices ? <CartIconButton count={cart.totalQuantity} locale={locale} onClick={() => setCartOpen(true)} /> : null}
      <ThemeToggle />
      <LanguageGlobe locale={locale} onChange={setLocale} />
    </div>
  );
  const contactRow = (
    <div className={cn("flex max-w-full flex-wrap items-center gap-2 text-sm", headerAlign === "center" && "justify-center")}>
      <OpenStatusBadge locale={locale} textDir={textDir} openHour={data.general.openHour} closeHour={data.general.closeHour} />
      {data.general.phone ? (
        <button
          type="button"
          className="focus-ring inline-flex max-w-full items-center gap-2 rounded-full border bg-card px-3 py-1.5 transition-colors hover:bg-muted"
          onClick={() =>
            setContactPrompt({
              title: translate(locale, "menu.callConfirmTitle"),
              description: data.general.phone,
              confirmLabel: translate(locale, "menu.call"),
              href: `tel:${data.general.phone}`,
              external: false
            })
          }
        >
          <PhoneSignalIcon className="h-4 w-4 text-primary" />
          <span className="truncate">{data.general.phone}</span>
        </button>
      ) : null}
      {data.general.whatsapp ? (
        <button
          type="button"
          className="focus-ring inline-flex max-w-full items-center gap-2 rounded-full border bg-card px-3 py-1.5 transition-colors hover:bg-muted"
          onClick={() =>
            setContactPrompt({
              title: translate(locale, "menu.whatsappConfirmTitle"),
              description: restaurantName,
              confirmLabel: translate(locale, "menu.open"),
              href: `https://wa.me/${(data.general.whatsapp || "").replace(/\D/g, "")}`,
              external: true
            })
          }
        >
          <WhatsappSendIcon className="h-4 w-4 text-primary" />
          <span dir={textDir}>{translate(locale, "menu.whatsapp")}</span>
        </button>
      ) : null}
      {data.general.googleMapsUrl ? (
        <button
          type="button"
          className="focus-ring inline-flex max-w-full items-center gap-2 rounded-full border bg-card px-3 py-1.5 transition-colors hover:bg-muted"
          onClick={() =>
            setContactPrompt({
              title: translate(locale, "menu.mapsConfirmTitle"),
              description: restaurantName,
              confirmLabel: translate(locale, "menu.open"),
              href: data.general.googleMapsUrl || "",
              external: true
            })
          }
        >
          <LocationPinIcon className="h-4 w-4 text-primary" />
          <span dir={textDir}>{translate(locale, "menu.openMaps")}</span>
        </button>
      ) : null}
      <SocialLinks social={data.general.socialLinks} className="ms-1" />
    </div>
  );

  return (
    <main dir="ltr" className="no-select relative min-h-screen" style={menuThemeStyle(appearance)}>
      <MenuBackground appearance={appearance} />
      {/* Branded header */}
      <header className={cn("relative overflow-hidden border-b", headerBgType === "theme" && "bg-gradient-to-b from-accent/55 via-card/95 to-card/90")} style={headerStyle}>
        <div className="glow-primary pointer-events-none absolute -right-16 -top-20 h-64 w-64" aria-hidden />
        <div className={cn("container relative grid", headerCompact ? "gap-3 py-5" : "gap-5 py-7")}>
          {headerAlign === "center" ? (
            <>
              {actionButtons}
              <div className="flex flex-col items-center gap-2 text-center">
                {brandLogo}
                {brandText}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                {brandLogo}
                {brandText}
              </div>
              {actionButtons}
            </div>
          )}

          {showContactRow ? contactRow : null}

          {searchPlacement === "header" ? searchField : null}
        </div>
      </header>

      {/* Region above the category bar (cover / promo / featured), set in /admin. */}
      {aboveCategory === "cover" && coverImageUrl ? (
        <section className="relative h-40 w-full overflow-hidden sm:h-56">
          <Image src={coverImageUrl} alt={restaurantName} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="container absolute inset-x-0 bottom-0 pb-4" dir={textDir}>
            <h2 className="text-2xl font-bold text-white drop-shadow sm:text-3xl">{restaurantName}</h2>
            {description ? <p className="line-clamp-2 max-w-xl text-sm text-white/85">{description}</p> : null}
          </div>
        </section>
      ) : null}
      {aboveCategory === "promo" && promoText ? (
        <div
          className="w-full"
          style={{ backgroundColor: appearance.promoColor || "#0f766e", color: `hsl(${readableForegroundHslVar(appearance.promoColor || "#0f766e") || "0 0% 100%"})` }}
        >
          <div className="container py-2.5 text-center text-sm font-semibold" dir={textDir}>{promoText}</div>
        </div>
      ) : null}
      {aboveCategory === "featured" && data.categories.length ? (
        <section className="border-b bg-background/70">
          <div className="container flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.categories.map((category) => (
              <CategoryNavItem key={category.id} style="cards" active={false} onClick={() => scrollToCategory(category.id)} slug={category.slug} icon={category.icon} textDir={textDir}>
                {localized(category.name, locale)}
              </CategoryNavItem>
            ))}
          </div>
        </section>
      ) : null}

      {/* Sticky category nav. Solid background (no backdrop-blur) — a blurred
          sticky bar re-blurs the page every scroll frame and janks on phones. */}
      <nav className="sticky top-0 z-10 border-b bg-background">
        {searchPlacement === "sticky" && searchField ? (
          <div className="container pt-3">{searchField}</div>
        ) : null}
        <div className="container flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryNavItem style={categoryNavStyle} active={activeCategoryId === "all"} onClick={() => scrollToCategory("all")} slug="all" textDir={textDir}>
            {translate(locale, "menu.all")}
          </CategoryNavItem>
          {data.categories.map((category) => (
            <CategoryNavItem
              key={category.id}
              style={categoryNavStyle}
              active={activeCategoryId === category.id}
              onClick={() => scrollToCategory(category.id)}
              slug={category.slug}
              icon={category.icon}
              textDir={textDir}
            >
              {localized(category.name, locale)}
            </CategoryNavItem>
          ))}
        </div>
      </nav>

      <section className="container grid gap-6 py-6">
        <div className="grid gap-10">
          {sections.map((section, sectionIndex) => {
              return (
                <div
                  key={section.category.id}
                  ref={(el) => { sectionRefs.current[section.category.id] = el; }}
                  className="grid scroll-mt-24 gap-5"
                >
                  <SectionHeader
                    style={sectionHeaderStyle}
                    title={localized(section.category.name, locale)}
                    slug={section.category.slug}
                    icon={section.category.icon}
                    textDir={textDir}
                  />
                  <div className={itemsGridClass}>
                    {section.items.map((item, itemIndex) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        locale={locale}
                        settings={data.menu}
                        appearance={appearance}
                        onViewDetails={setActiveItem}
                        quantity={cart.quantityOf(item.id)}
                        onAdd={() => cart.add(item)}
                        onIncrement={() => cart.increment(item.id)}
                        onDecrement={() => cart.decrement(item.id)}
                        priority={sectionIndex === 0 && itemIndex < 9}
                        lcp={sectionIndex === 0 && itemIndex === 0}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {orphanItems.length ? (
              <div className={itemsGridClass}>
                {orphanItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    settings={data.menu}
                    appearance={appearance}
                    onViewDetails={setActiveItem}
                    quantity={cart.quantityOf(item.id)}
                    onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)}
                    onDecrement={() => cart.decrement(item.id)}
                  />
                ))}
              </div>
            ) : null}
        </div>

        {!visibleItems.length ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/60" aria-hidden />
            <p dir={textDir} className="text-muted-foreground">
              {translate(locale, "menu.empty")}
            </p>
          </div>
        ) : null}
      </section>

      {activeItem ? (
        <MenuItemDetailModal
          item={activeItem}
          category={data.categories.find((category) => category.id === activeItem.categoryId)}
          settings={data.menu}
          locale={locale}
          textDir={textDir}
          cart={cart}
          onClose={() => setActiveItem(null)}
        />
      ) : null}

      {data.menu.showPrices && cart.totalQuantity > 0 ? (
        <CartFab
          count={cart.totalQuantity}
          total={cartGrandTotal}
          currency={cart.currency}
          locale={locale}
          textDir={textDir}
          onClick={() => setCartOpen(true)}
        />
      ) : null}

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        locale={locale}
        textDir={textDir}
        serviceFeePercent={serviceFeePercent}
      />

      <ConfirmDialog
        open={Boolean(contactPrompt)}
        dir={textDir}
        title={contactPrompt?.title || ""}
        description={contactPrompt?.description ? <span dir="auto">{contactPrompt.description}</span> : undefined}
        confirmLabel={contactPrompt?.confirmLabel || ""}
        cancelLabel={translate(locale, "menu.cancel")}
        onCancel={() => setContactPrompt(null)}
        onConfirm={() => {
          if (contactPrompt) {
            if (contactPrompt.external) {
              window.open(contactPrompt.href, "_blank", "noopener,noreferrer");
            } else {
              window.location.href = contactPrompt.href;
            }
          }
          setContactPrompt(null);
        }}
      />

      <footer className="relative z-10 px-4 pb-10 pt-6">
        <BrandCredit />
      </footer>
    </main>
  );
}

// One category button in the sticky nav. Three presentation styles share the
// same behavior (scroll to the section) so the scroll-spy logic is untouched.
function CategoryNavItem({
  style,
  active,
  onClick,
  children,
  slug,
  icon,
  textDir
}: {
  style: CategoryNavStyle;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  slug: string;
  icon?: string;
  textDir: "ltr" | "rtl";
}) {
  if (style === "underline") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "focus-ring inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        <CategoryIcon slug={slug} icon={icon} className="h-4 w-4" />
        <span dir={textDir}>{children}</span>
      </button>
    );
  }

  if (style === "cards") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "focus-ring inline-flex w-20 shrink-0 flex-col items-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
          active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
        )}
      >
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
          <CategoryIcon slug={slug} icon={icon} className="h-5 w-5" />
        </span>
        <span dir={textDir} className="w-full truncate text-center">{children}</span>
      </button>
    );
  }

  // Default: pills.
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground hover:bg-muted"
      )}
    >
      <CategoryIcon slug={slug} icon={icon} className="h-4 w-4" />
      <span dir={textDir}>{children}</span>
    </button>
  );
}

// In-page section heading with four presentation styles.
function SectionHeader({
  style,
  title,
  slug,
  icon,
  textDir
}: {
  style: SectionHeaderStyle;
  title: string;
  slug: string;
  icon?: string;
  textDir: "ltr" | "rtl";
}) {
  const iconChip = (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <CategoryIcon slug={slug} icon={icon} className="h-5 w-5" />
    </span>
  );

  if (style === "centered") {
    return (
      <div dir={textDir} className="flex flex-col items-center gap-2 text-center">
        {iconChip}
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      </div>
    );
  }

  if (style === "divider") {
    return (
      <div dir={textDir} className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
    );
  }

  if (style === "banner") {
    return (
      <div dir={textDir} className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <CategoryIcon slug={slug} icon={icon} className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      </div>
    );
  }

  // Default: plain (icon chip + title + hairline).
  return (
    <div dir={textDir} className="flex items-center gap-3">
      {iconChip}
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

function MenuItemDetailModal({
  item,
  category,
  settings,
  locale,
  textDir,
  cart,
  onClose
}: {
  item: MenuItem;
  category?: Category;
  settings: MenuSettings;
  locale: Locale;
  textDir: "ltr" | "rtl";
  cart: Cart;
  onClose: () => void;
}) {
  const title = localized(item.name, locale);
  const description = localized(item.description, locale);
  const ingredients = localized(item.ingredients, locale);
  const hasDiscount = Boolean(item.discountPrice);
  const variants = item.variants.filter((variant) => variant.isAvailable);
  const canAddToCart = settings.showPrices && !item.isSoldOut;
  const baseQuantity = cart.quantityOf(item.id);
  const effectivePrice = effectiveItemPrice(item);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-background/60 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <article
          dir={textDir}
          className="pop-in relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-lg border bg-card shadow-2xl sm:max-h-none sm:overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={translate(locale, "menu.backToMenu")}
            className={cn(
              "absolute top-3 z-10 rounded-full bg-card/90 shadow-sm backdrop-blur sm:top-4",
              textDir === "rtl" ? "left-3 sm:left-4" : "right-3 sm:right-4"
            )}
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>

          {settings.showImages ? (
            <div className="group relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-accent via-primary/5 to-secondary/10 sm:aspect-[16/10]">
              <FallbackMenuImage src={item.imageUrl} alt={title} />
              {item.isSoldOut ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
                  <span className="rounded-full border border-destructive bg-background/90 px-5 py-2 text-base font-semibold text-destructive">
                    {translate(locale, "menu.soldOut")}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-7">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
              <div className="min-w-0">
                {category ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{localized(category.name, locale)}</p>
                ) : null}
                <h2 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{title}</h2>
              </div>
              {settings.showPrices ? (
                <div className="flex flex-col items-start sm:items-end">
                  {hasDiscount ? (
                    <>
                      <span className="text-2xl font-bold text-secondary sm:text-3xl">
                        {formatMoney(item.discountPrice as number, item.currency, locale)}
                      </span>
                      <span className="text-base text-muted-foreground line-through">
                        {formatMoney(item.basePrice, item.currency, locale)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-primary sm:text-3xl">{formatMoney(item.basePrice, item.currency, locale)}</span>
                  )}
                </div>
              ) : null}
            </div>

            {description ? (
              <p className="text-base leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}

            {settings.showIngredients && ingredients ? (
              <DetailSection title={translate(locale, "menu.ingredients")} textDir={textDir}>
                <p className="text-sm text-muted-foreground">
                  {ingredients}
                </p>
              </DetailSection>
            ) : null}

            {settings.showAllergens && item.allergens.length ? (
              <DetailSection title={translate(locale, "menu.allergens")} textDir={textDir}>
                <div className="flex flex-wrap gap-2">
                  {item.allergens.map((allergen) => (
                    <span key={allergen} className="inline-flex rounded-full border border-border bg-background/70 px-3 py-1 text-sm text-muted-foreground">
                      {allergen}
                    </span>
                  ))}
                </div>
              </DetailSection>
            ) : null}

            {variants.length ? (
              <DetailSection title={translate(locale, "menu.options")} textDir={textDir}>
                <ul className="divide-y rounded-2xl border">
                  {variants.map((variant) => {
                    const variantQuantity = cart.quantityOf(item.id, variant.id);
                    return (
                      <li key={variant.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0 text-sm font-medium">
                          {localized(variant.name, locale)}
                        </span>
                        <div className="flex shrink-0 items-center gap-3">
                          {settings.showPrices ? (
                            <span className="text-sm font-semibold text-primary">{formatMoney(variant.price, item.currency, locale)}</span>
                          ) : null}
                          {canAddToCart ? (
                            variantQuantity > 0 ? (
                              <QuantityStepper
                                size="sm"
                                quantity={variantQuantity}
                                locale={locale}
                                onIncrement={() => cart.increment(`${item.id}::${variant.id}`)}
                                onDecrement={() => cart.decrement(`${item.id}::${variant.id}`)}
                              />
                            ) : (
                              <button
                                type="button"
                                aria-label={translate(locale, "cart.add")}
                                onClick={() => cart.add(item, variant)}
                                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:bg-primary/90 active:scale-90"
                              >
                                <Plus className="h-4 w-4" aria-hidden />
                              </button>
                            )
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </DetailSection>
            ) : null}

          </div>

          {canAddToCart ? (
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-card px-4 py-3 sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{translate(locale, "cart.add")}</p>
                <p className="text-lg font-bold text-primary">{formatMoney(effectivePrice, item.currency, locale)}</p>
              </div>
              {baseQuantity > 0 ? (
                <QuantityStepper
                  quantity={baseQuantity}
                  locale={locale}
                  onIncrement={() => cart.increment(item.id)}
                  onDecrement={() => cart.decrement(item.id)}
                />
              ) : (
                <Button type="button" onClick={() => cart.add(item)} className="rounded-full px-5">
                  <Plus className="h-4 w-4" aria-hidden />
                  <span>{translate(locale, "cart.add")}</span>
                </Button>
              )}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
  textDir
}: {
  title: string;
  children: React.ReactNode;
  textDir: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-2">
      <h3 dir={textDir} className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {title}
      </h3>
      {children}
    </div>
  );
}
