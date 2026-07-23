"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CartIconButton, CartSheet } from "@/components/menu/cart";
import { useCart } from "@/hooks/use-cart";
import { OpenStatusBadge } from "@/components/menu/open-status-badge";
import { LanguageGlobe } from "@/components/menu/language-globe";
import { ThemeToggle } from "@/components/menu/theme-toggle";
import { SocialLinks } from "@/components/menu/social-links";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { BrandCredit } from "@/components/brand-credit";
import { MenuItemDetailModal } from "@/components/menu/menu-item-detail-modal";
import { useMenuBrowse } from "@/components/menu/use-menu-browse";
import type { MenuDesignProps } from "@/components/menu/menu-types";
import { DesignBackdrop } from "@/components/menu/design-backdrop";
import { localized, translate, locales } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney, serviceFeeAmount } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { accentStyle } from "@/lib/utils/accent";
import { useLocale } from "@/hooks/use-locale";
import type { Locale, MenuItem } from "@/types/models";

// Serif display stack for the luxury design.
const LUX_DISPLAY = "Georgia, 'Times New Roman', serif";

const ALL_LABEL = { en: "All", ar: "الكل", ckb: "هەموو" } as const;
const VIEW_LABEL = { en: "View", ar: "عرض", ckb: "بینین" } as const;
const ADD_LABEL = { en: "Add", ar: "إضافة", ckb: "زیادکردن" } as const;

// The "Luxury" design: an editorial, gallery-style menu — full hero, centered
// letter-spaced index nav, hairline-ruled sections, and refined item rows with
// reveal-on-scroll motion.
export function LuxuryMenu({ data, accent }: MenuDesignProps) {
  const { locale, setLocale, dir: textDir } = useLocale(data.general.defaultLanguage, { documentDirection: "ltr" });
  const general = data.general;

  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const { query, setQuery, sections, orphanItems, visibleItems } = useMenuBrowse(data);

  const restaurantName = localized(general.restaurantName, locale);
  const description = localized(general.description, locale);
  const logoUrl = general.logoUrl;
  const serviceFeePercent = general.serviceFeePercent ?? 10;
  const cartGrandTotal = cart.totalPrice + serviceFeeAmount(cart.totalPrice, serviceFeePercent);
  const darkModeEnabled = data.menu.enableDarkMode !== false;
  const enabledLocales = general.enabledLanguages?.length ? general.enabledLanguages : locales;
  const showPrices = data.menu.showPrices;
  const showImages = data.menu.showImages;
  const showCart = showPrices;
  const searchEnabled = data.menu.enableSearch;

  // Lock scroll while the item modal is open.
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

  // Scroll-spy: highlight the index link for the section currently on screen.
  useEffect(() => {
    function onScroll() {
      const offset = 160;
      let current = "all";
      for (const section of sections) {
        const el = sectionRefs.current[section.category.id];
        if (el && el.getBoundingClientRect().top <= offset) current = section.category.id;
      }
      setActiveCategoryId(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  function scrollToCategory(id: string) {
    if (id === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const displayStyle = { fontFamily: LUX_DISPLAY } as const;

  return (
    <main dir="ltr" className="menu-theme-root no-select relative isolate min-h-dvh bg-background text-foreground" style={accentStyle(accent)}>
      <DesignBackdrop design="luxury" />

      {/* Minimal top controls */}
      <div className="relative z-20">
        <div dir={textDir} className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <span dir={textDir} className="truncate text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">{restaurantName}</span>
          <div className="flex items-center gap-2">
            {showCart ? <CartIconButton count={cart.totalQuantity} locale={locale} onClick={() => setCartOpen(true)} /> : null}
            {darkModeEnabled ? <ThemeToggle presentation="circle" iconStyle="sunMoon" /> : null}
            <LanguageGlobe locale={locale} onChange={setLocale} availableLocales={enabledLocales} />
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="relative z-10 px-5">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-12 text-center sm:py-16">
          <div className="relative h-24 w-24 overflow-hidden rounded-full ring-1 ring-primary/25 shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.5)]">
            {logoUrl ? (
              <Image src={logoUrl} alt={restaurantName} width={160} height={160} className="h-full w-full object-cover" priority />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-primary text-2xl font-bold text-primary-foreground" style={displayStyle}>
                {restaurantName.slice(0, 2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-primary/70">
            <span className="h-px w-10 bg-current" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">{translate(locale, "menu.title")}</span>
            <span className="h-px w-10 bg-current" />
          </div>
          <h1 dir={textDir} className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl" style={displayStyle}>
            {restaurantName}
          </h1>
          {description ? <p dir={textDir} className="max-w-xl text-sm text-muted-foreground">{description}</p> : null}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <OpenStatusBadge locale={locale} textDir={textDir} openHour={general.openHour} closeHour={general.closeHour} style="outline" />
            <SocialLinks social={general.socialLinks} style="outline" />
          </div>
          {searchEnabled ? (
            <label className="relative mt-2 block w-full max-w-md">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                dir={textDir}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={translate(locale, "menu.search")}
                className="h-12 rounded-full border-primary/20 bg-card/70 ps-11 text-center shadow-sm backdrop-blur"
              />
            </label>
          ) : null}
        </div>
      </header>

      {/* Sticky editorial index */}
      {sections.length ? (
        <nav className="sticky top-0 z-20 border-y border-primary/10 bg-background/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl gap-6 overflow-x-auto px-5 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <IndexLink active={activeCategoryId === "all"} onClick={() => scrollToCategory("all")}>
              {ALL_LABEL[locale] ?? ALL_LABEL.en}
            </IndexLink>
            {sections.map((section) => (
              <IndexLink
                key={section.category.id}
                active={activeCategoryId === section.category.id}
                onClick={() => scrollToCategory(section.category.id)}
              >
                <span dir={textDir}>{localized(section.category.name, locale)}</span>
              </IndexLink>
            ))}
          </div>
        </nav>
      ) : null}

      {/* Sections */}
      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-24 pt-10">
        <div className="grid gap-16">
          {sections.map((section) => (
            <section
              key={section.category.id}
              ref={(el) => { sectionRefs.current[section.category.id] = el; }}
              className="scroll-mt-24"
            >
              <Reveal className="mb-6 flex items-center justify-center gap-4 text-center">
                <span className="h-px flex-1 bg-primary/20" />
                <h2 dir={textDir} className="text-xl font-semibold uppercase tracking-[0.2em] sm:text-2xl" style={displayStyle}>
                  {localized(section.category.name, locale)}
                </h2>
                <span className="h-px flex-1 bg-primary/20" />
              </Reveal>
              <div className="divide-y divide-border/70">
                {section.items.map((item, index) => (
                  <LuxuryItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    locale={locale}
                    textDir={textDir}
                    showPrices={showPrices}
                    showImages={showImages}
                    showCart={showCart}
                    logoUrl={logoUrl}
                    quantity={cart.quantityOf(item.id)}
                    onOpen={() => setActiveItem(item)}
                    onAdd={() => cart.add(item)}
                    onIncrement={() => cart.increment(item.id)}
                    onDecrement={() => cart.decrement(item.id)}
                    displayStyle={displayStyle}
                  />
                ))}
              </div>
            </section>
          ))}

          {orphanItems.length ? (
            <section className="divide-y divide-border/70">
              {orphanItems.map((item, index) => (
                <LuxuryItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  locale={locale}
                  textDir={textDir}
                  showPrices={showPrices}
                  showImages={showImages}
                  showCart={showCart}
                  logoUrl={logoUrl}
                  quantity={cart.quantityOf(item.id)}
                  onOpen={() => setActiveItem(item)}
                  onAdd={() => cart.add(item)}
                  onIncrement={() => cart.increment(item.id)}
                  onDecrement={() => cart.decrement(item.id)}
                  displayStyle={displayStyle}
                />
              ))}
            </section>
          ) : null}

          {!visibleItems.length ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" aria-hidden />
              <p dir={textDir} className="text-muted-foreground">{translate(locale, "menu.empty")}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating luxury cart pill */}
      {showCart && cart.totalQuantity > 0 ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          dir={textDir}
          className="pop-in fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[0_16px_40px_-12px_hsl(var(--primary)/0.7)] ring-1 ring-primary/30 transition-transform hover:-translate-x-1/2 hover:-translate-y-0.5"
        >
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs font-semibold">{cart.totalQuantity}</span>
          <span className="tracking-wide">{formatMoney(cartGrandTotal, cart.currency ?? data.general.defaultCurrency, locale)}</span>
          <span className="text-xs uppercase tracking-[0.2em] opacity-80">{VIEW_LABEL[locale] ?? VIEW_LABEL.en}</span>
        </button>
      ) : null}

      {activeItem ? (
        <MenuItemDetailModal
          item={activeItem}
          category={data.categories.find((category) => category.id === activeItem.categoryId)}
          settings={data.menu}
          locale={locale}
          textDir={textDir}
          cart={cart}
          logoUrl={logoUrl}
          onClose={() => setActiveItem(null)}
        />
      ) : null}

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        locale={locale}
        textDir={textDir}
        serviceFeePercent={serviceFeePercent}
        logoUrl={logoUrl}
      />

      <footer className="relative z-10 px-4 pb-10 pt-2">
        <BrandCredit />
      </footer>
    </main>
  );
}

function IndexLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 whitespace-nowrap pb-1 text-[11px] font-semibold uppercase tracking-[0.25em] transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      <span className={cn("absolute inset-x-0 -bottom-[15px] mx-auto h-px transition-all", active ? "w-full bg-primary" : "w-0 bg-transparent")} />
    </button>
  );
}

function LuxuryItemRow({
  item,
  index,
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
  onDecrement,
  displayStyle
}: {
  item: MenuItem;
  index: number;
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
  displayStyle: { fontFamily: string };
}) {
  const name = localized(item.name, locale);
  const description = localized(item.description, locale);
  const price = effectiveItemPrice(item);
  const hasDiscount = Boolean(item.discountPrice);

  return (
    <Reveal delay={Math.min(index, 6) * 60} className="group py-6 first:pt-0">
      <div dir={textDir} className="flex items-start gap-5">
        {showImages ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={name}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-border transition-transform duration-500 group-hover:scale-[1.03] sm:h-24 sm:w-24"
          >
            <FallbackMenuImage src={item.imageUrl} alt={name} fallbackSrc={logoUrl} />
          </button>
        ) : null}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
          <div className="flex items-baseline gap-3">
            <h3 className="truncate text-lg font-semibold tracking-tight" style={displayStyle}>{name}</h3>
            <span className="mb-1 hidden h-px flex-1 self-end border-b border-dotted border-border sm:block" aria-hidden />
            {showPrices ? (
              <span className="shrink-0 text-base font-semibold text-primary" style={displayStyle}>
                {formatMoney(price, item.currency, locale)}
                {hasDiscount ? (
                  <span className="ms-2 align-middle text-xs font-normal text-muted-foreground line-through">
                    {formatMoney(item.basePrice, item.currency, locale)}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
          {description ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
          {item.isSoldOut ? (
            <span className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-widest text-destructive">{translate(locale, "menu.soldOut")}</span>
          ) : null}
        </button>
        {showCart && !item.isSoldOut ? (
          <div className="shrink-0 self-center">
            {quantity > 0 ? (
              <div className="flex items-center gap-2 rounded-full border border-primary/30 px-1 py-1">
                <button type="button" aria-label="Decrease" onClick={onDecrement} className="flex h-7 w-7 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10">
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="min-w-4 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                <button type="button" aria-label="Increase" onClick={onIncrement} className="flex h-7 w-7 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`${ADD_LABEL[locale] ?? ADD_LABEL.en} ${name}`}
                onClick={onAdd}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 text-primary transition-all hover:bg-primary hover:text-primary-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </Reveal>
  );
}

// Fade + rise as each block scrolls into view (respects reduced-motion via CSS).
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("lux-reveal", shown && "is-in", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
