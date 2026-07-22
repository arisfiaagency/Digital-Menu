"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { QuantityStepper } from "@/components/menu/cart";
import { localized, translate } from "@/lib/i18n/config";
import { effectiveItemPrice, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Cart } from "@/hooks/use-cart";
import type { Category, Locale, MenuItem, MenuSettings } from "@/types/models";

// Shared item detail sheet used by every menu design. Opens over the current
// design, shows the photo, description, ingredients, allergens, variants, and a
// sticky add-to-cart bar. Self-contained (no design/appearance dependency).
export function MenuItemDetailModal({
  item,
  category,
  settings,
  locale,
  textDir,
  cart,
  logoUrl,
  onClose
}: {
  item: MenuItem;
  category?: Category;
  settings: MenuSettings;
  locale: Locale;
  textDir: "ltr" | "rtl";
  cart: Cart;
  logoUrl?: string;
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
              <FallbackMenuImage src={item.imageUrl} alt={title} fallbackSrc={logoUrl} />
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
