import { Plus, Pointer } from "lucide-react";
import { dirForLocale, localized, translate } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { QuantityStepper } from "@/components/menu/cart";
import type { AppearanceSettings, ImageAspect, Locale, MenuItem, MenuSettings, PriceStyle } from "@/types/models";

type MenuItemCardProps = {
  item: MenuItem;
  locale: Locale;
  settings: MenuSettings;
  appearance?: AppearanceSettings;
  onViewDetails?: (item: MenuItem) => void;
  quantity?: number;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  priority?: boolean;
  lcp?: boolean;
};

// Surface treatment shared by every card design. `cardStyle` controls
// border/shadow; `borderRadius` is applied inline so a cafe's rounding choice
// takes effect. Mirrors the preview mapping in settings-manager.tsx.
function surfaceClasses(appearance?: AppearanceSettings) {
  const cardStyle = appearance?.cardStyle ?? "outlined";
  return cn(
    "bg-card transition-all duration-300",
    cardStyle === "flat" && "border border-transparent shadow-none",
    cardStyle === "outlined" && "border shadow-sm",
    cardStyle === "elevated" && "border shadow-lg"
  );
}

function radiusStyle(appearance?: AppearanceSettings) {
  return { borderRadius: Math.max(0, appearance?.borderRadius ?? 8) };
}

function imageAspectClass(appearance?: AppearanceSettings, fallback = "aspect-[5/4]") {
  const aspect = (appearance?.imageAspect ?? "wide") as ImageAspect;
  if (aspect === "square") return "aspect-square";
  if (aspect === "tall") return "aspect-[4/5]";
  if (aspect === "auto") return "aspect-[5/4]";
  if (aspect === "wide") return "aspect-[5/4]";
  return fallback;
}

export function MenuItemCard(props: MenuItemCardProps) {
  const design = props.appearance?.cardDesign ?? "classic";
  if (design === "compact") return <CompactCard {...props} />;
  if (design === "overlay") return <OverlayCard {...props} />;
  if (design === "minimal") return <MinimalCard {...props} />;
  if (design === "poster") return <PosterCard {...props} />;
  return <ClassicCard {...props} />;
}

// Shared price block (respects the showPrices toggle and discount pricing).
function PriceBlock({
  item,
  locale,
  settings,
  appearance,
  tone = "default"
}: Pick<MenuItemCardProps, "item" | "locale" | "settings" | "appearance"> & { tone?: "default" | "overlay" }) {
  if (!settings.showPrices) return null;
  const hasDiscount = Boolean(item.discountPrice);
  const style = (appearance?.priceStyle ?? "plain") as PriceStyle;
  const price = formatMoney((item.discountPrice ?? item.basePrice) as number, item.currency, locale);
  const original = formatMoney(item.basePrice, item.currency, locale);

  if (style === "badge") {
    return (
      <div className="shrink-0 text-end">
        {hasDiscount ? <p className={cn("mb-1 text-[10px] line-through", tone === "overlay" ? "text-white/60" : "text-muted-foreground")}>{original}</p> : null}
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
            tone === "overlay" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
          )}
        >
          {price}
        </span>
      </div>
    );
  }

  if (style === "large") {
    return (
      <div className="shrink-0 text-end">
        {hasDiscount ? <p className={cn("text-xs line-through", tone === "overlay" ? "text-white/60" : "text-muted-foreground")}>{original}</p> : null}
        <p className={cn("text-lg font-black tracking-tight sm:text-xl", tone === "overlay" ? "text-white" : hasDiscount ? "text-secondary" : "text-primary")}>
          {price}
        </p>
      </div>
    );
  }

  const baseTone = tone === "overlay" ? "text-white/70" : "text-muted-foreground";
  const primaryTone = tone === "overlay" ? "text-white" : "text-primary";
  return (
    <div className="shrink-0 text-end">
      {hasDiscount ? (
        <>
          <p className={cn("text-xs line-through", baseTone)}>{original}</p>
          <p className={cn("text-sm font-bold", tone === "overlay" ? "text-white" : "text-secondary")}>{price}</p>
        </>
      ) : (
        <p className={cn("text-sm font-bold", primaryTone)}>{price}</p>
      )}
    </div>
  );
}

// Shared "view details" + add-to-cart controls.
function CardActions({ item, locale, settings, onViewDetails, quantity = 0, onAdd, onIncrement, onDecrement, tone = "default" }: MenuItemCardProps & { tone?: "default" | "overlay" }) {
  return (
    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
      <button
        type="button"
        onClick={() => onViewDetails?.(item)}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-semibold transition-colors",
          tone === "overlay" ? "text-white hover:text-white/80" : "text-primary hover:text-primary/80"
        )}
      >
        <span>{translate(locale, "menu.viewDetails")}</span>
        <Pointer className="h-4 w-4" aria-hidden />
      </button>

      {settings.showPrices && !item.isSoldOut && onAdd ? (
        quantity > 0 ? (
          <QuantityStepper size="sm" quantity={quantity} locale={locale} onIncrement={() => onIncrement?.()} onDecrement={() => onDecrement?.()} />
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span>{translate(locale, "cart.add")}</span>
          </button>
        )
      ) : null}
    </div>
  );
}

function SoldOutBadge({ locale }: { locale: Locale }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
      <span className="rounded-full border border-destructive bg-background/90 px-4 py-1.5 text-sm font-semibold text-destructive">
        {translate(locale, "menu.soldOut")}
      </span>
    </div>
  );
}

function ClassicCard(props: MenuItemCardProps) {
  const { item, locale, priority = false, lcp = false } = props;
  const title = localized(item.name, locale);
  const description = localized(item.description, locale);
  const textDir = dirForLocale(locale);

  return (
    <article
      dir={textDir}
      style={radiusStyle(props.appearance)}
      className={cn("group relative flex flex-col overflow-hidden hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5", surfaceClasses(props.appearance))}
    >
      {props.settings.showImages !== false ? (
        <div className={cn("relative overflow-hidden bg-gradient-to-br from-accent via-primary/5 to-secondary/10", imageAspectClass(props.appearance))}>
          <FallbackMenuImage src={item.imageUrl} alt={title} priority={priority} lcp={lcp} />
          {item.isSoldOut ? <SoldOutBadge locale={locale} /> : null}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          </div>
          <PriceBlock item={item} locale={locale} settings={props.settings} appearance={props.appearance} />
        </div>
        {description ? <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
        <CardActions {...props} />
      </div>
    </article>
  );
}

function CompactCard(props: MenuItemCardProps) {
  const { item, locale, priority = false, lcp = false } = props;
  const title = localized(item.name, locale);
  const description = localized(item.description, locale);
  const textDir = dirForLocale(locale);

  return (
    <article
      dir={textDir}
      style={radiusStyle(props.appearance)}
      className={cn("group relative flex gap-3 overflow-hidden p-3 hover:border-primary/30 hover:shadow-md sm:gap-4 sm:p-4", surfaceClasses(props.appearance))}
    >
      {props.settings.showImages !== false ? (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-accent via-primary/5 to-secondary/10 sm:h-28 sm:w-28">
          <FallbackMenuImage src={item.imageUrl} alt={title} priority={priority} lcp={lcp} />
          {item.isSoldOut ? <SoldOutBadge locale={locale} /> : null}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-semibold leading-tight sm:text-lg">{title}</h3>
          <PriceBlock item={item} locale={locale} settings={props.settings} appearance={props.appearance} />
        </div>
        {description ? <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
        <CardActions {...props} />
      </div>
    </article>
  );
}

function OverlayCard(props: MenuItemCardProps) {
  const { item, locale, priority = false, lcp = false } = props;
  const title = localized(item.name, locale);
  const description = localized(item.description, locale);
  const textDir = dirForLocale(locale);

  return (
    <article
      dir={textDir}
      style={radiusStyle(props.appearance)}
      className={cn("group relative flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl", surfaceClasses(props.appearance))}
    >
      <div className={cn("relative w-full overflow-hidden bg-gradient-to-br from-accent via-primary/5 to-secondary/10", imageAspectClass(props.appearance, "aspect-[4/5]"))}>
        <FallbackMenuImage src={item.imageUrl} alt={title} priority={priority} lcp={lcp} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        {item.isSoldOut ? <SoldOutBadge locale={locale} /> : null}

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-lg font-semibold leading-tight text-white drop-shadow">{title}</h3>
            <PriceBlock item={item} locale={locale} settings={props.settings} appearance={props.appearance} tone="overlay" />
          </div>
          {description ? <p className="line-clamp-2 text-sm text-white/85">{description}</p> : null}
          <CardActions {...props} tone="overlay" />
        </div>
      </div>
    </article>
  );
}

function MinimalCard(props: MenuItemCardProps) {
  const { item, locale } = props;
  const title = localized(item.name, locale);
  const description = localized(item.description, locale);
  const textDir = dirForLocale(locale);

  return (
    <article
      dir={textDir}
      style={radiusStyle(props.appearance)}
      className={cn("group relative flex flex-col gap-2 overflow-hidden px-4 py-3 hover:border-primary/25", surfaceClasses(props.appearance))}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight sm:text-lg">{title}</h3>
          {description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <PriceBlock item={item} locale={locale} settings={props.settings} appearance={props.appearance} />
      </div>
      <CardActions {...props} />
      {item.isSoldOut ? (
        <span className="absolute end-3 top-3 rounded-full border border-destructive/40 bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-destructive">
          {translate(locale, "menu.soldOut")}
        </span>
      ) : null}
    </article>
  );
}

function PosterCard(props: MenuItemCardProps) {
  const { item, locale, priority = false, lcp = false } = props;
  const title = localized(item.name, locale);
  const description = localized(item.description, locale);
  const textDir = dirForLocale(locale);

  return (
    <article
      dir={textDir}
      style={radiusStyle(props.appearance)}
      className={cn("group relative flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl", surfaceClasses(props.appearance))}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-accent via-primary/5 to-secondary/10">
        <FallbackMenuImage src={item.imageUrl} alt={title} priority={priority} lcp={lcp} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        {item.isSoldOut ? <SoldOutBadge locale={locale} /> : null}
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">{translate(locale, "menu.viewDetails")}</p>
          <h3 className="text-xl font-black leading-tight text-white drop-shadow">{title}</h3>
          {description ? <p className="line-clamp-2 text-sm text-white/80">{description}</p> : null}
          <div className="flex items-end justify-between gap-3 pt-1">
            <PriceBlock item={item} locale={locale} settings={props.settings} appearance={props.appearance} tone="overlay" />
            <CardActions {...props} tone="overlay" />
          </div>
        </div>
      </div>
    </article>
  );
}
