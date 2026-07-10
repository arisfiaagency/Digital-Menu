"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/menu/theme-toggle";
import { LanguageGlobe } from "@/components/menu/language-globe";
import { MenuBackground } from "@/components/menu/menu-background";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { defaultAppData } from "@/data/default-data";
import { localized, translate } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/utils/format";
import { useLocale } from "@/hooks/use-locale";
import type { AppData } from "@/types/models";

export function MenuItemDetail({ itemId, initialData }: { itemId: string; initialData?: AppData }) {
  const { locale, setLocale, dir: textDir } = useLocale(defaultAppData.general.defaultLanguage, {
    documentDirection: "ltr"
  });
  const [data] = useState<AppData>(initialData ?? defaultAppData);

  const item = useMemo(() => data.menuItems.find((entry) => entry.id === itemId), [data.menuItems, itemId]);
  const category = useMemo(
    () => (item ? data.categories.find((entry) => entry.id === item.categoryId) : undefined),
    [data.categories, item]
  );

  const settings = data.menu;
  const title = item ? localized(item.name, locale) : "";
  const description = item ? localized(item.description, locale) : "";
  const ingredients = item ? localized(item.ingredients, locale) : "";
  const hasDiscount = Boolean(item?.discountPrice);
  const variants = (item?.variants || []).filter((variant) => variant.isAvailable);

  return (
    <main dir="ltr" className="relative min-h-screen">
      <MenuBackground />

      <header className="container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-5">
        <Link
          href="/menu"
          className="focus-ring inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span dir={textDir} className="truncate">{translate(locale, "menu.backToMenu")}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LanguageGlobe locale={locale} onChange={setLocale} />
        </div>
      </header>

      <section className="container max-w-3xl pb-16">
        {!item ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center">
            <p dir={textDir} className="text-muted-foreground">
              {translate(locale, "menu.itemNotFound")}
            </p>
            <Link href="/menu" className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span dir={textDir}>{translate(locale, "menu.backToMenu")}</span>
            </Link>
          </div>
        ) : (
          <article dir={textDir} className="overflow-hidden rounded-lg border bg-card shadow-sm">
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
                  <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
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
                <Section title={translate(locale, "menu.ingredients")} textDir={textDir}>
                  <p className="text-sm text-muted-foreground">
                    {ingredients}
                  </p>
                </Section>
              ) : null}

              {settings.showAllergens && item.allergens.length ? (
                <Section title={translate(locale, "menu.allergens")} textDir={textDir}>
                  <div className="flex flex-wrap gap-2">
                    {item.allergens.map((allergen) => (
                      <span key={allergen} className="inline-flex rounded-full border border-border bg-background/70 px-3 py-1 text-sm text-muted-foreground">
                        {allergen}
                      </span>
                    ))}
                  </div>
                </Section>
              ) : null}

              {variants.length ? (
                <Section title={translate(locale, "menu.options")} textDir={textDir}>
                  <ul className="divide-y rounded-2xl border">
                    {variants.map((variant) => (
                      <li key={variant.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm font-medium">
                          {localized(variant.name, locale)}
                        </span>
                        {settings.showPrices ? (
                          <span className="text-sm font-semibold text-primary">{formatMoney(variant.price, item.currency, locale)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

            </div>
          </article>
        )}
      </section>
    </main>
  );
}

function Section({
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
      <h2 dir={textDir} className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {title}
      </h2>
      {children}
    </div>
  );
}
