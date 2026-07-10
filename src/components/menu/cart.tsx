"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { FallbackMenuImage } from "@/components/menu/fallback-menu-image";
import { localized, translate, type LocaleDirection } from "@/lib/i18n/config";
import { formatMoney, formatNumber, serviceFeeAmount } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Cart } from "@/hooks/use-cart";
import type { Currency, Locale } from "@/types/models";

// Bump the cart icon whenever the item count goes up — a little "added!" nudge.
// Only on increase (not on load or when removing), and it self-clears.
function useBumpOnIncrease(value: number) {
  const [bump, setBump] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (value > previous.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 450);
      previous.current = value;
      return () => clearTimeout(timer);
    }
    previous.current = value;
  }, [value]);
  return bump;
}

// Shared − value + control used on cards, in the detail modal, and in the sheet.
export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  locale,
  size = "md"
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  locale: Locale;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 p-1">
      <button
        type="button"
        aria-label={translate(locale, "cart.decrease")}
        onClick={onDecrement}
        className={cn(
          "focus-ring inline-flex items-center justify-center rounded-full text-primary transition-transform hover:bg-primary/10 active:scale-90",
          dim
        )}
      >
        {quantity <= 1 ? <Trash2 className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums">
        {formatNumber(quantity, locale)}
      </span>
      <button
        type="button"
        aria-label={translate(locale, "cart.increase")}
        onClick={onIncrement}
        className={cn(
          "focus-ring inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:bg-primary/90 active:scale-90",
          dim
        )}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

// Header trigger — a cart icon with a live count badge (always visible).
export function CartIconButton({
  count,
  onClick,
  locale
}: {
  count: number;
  onClick: () => void;
  locale: Locale;
}) {
  const bump = useBumpOnIncrease(count);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={translate(locale, "cart.viewCart")}
      className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-muted"
    >
      <ShoppingCart className={cn("h-5 w-5", bump && "cart-bump")} aria-hidden />
      {count > 0 ? (
        <span
          key={count}
          className="cart-badge-pop absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"
        >
          {formatNumber(count, locale)}
        </span>
      ) : null}
    </button>
  );
}

// Floating pill — appears once there's something in the cart, always reachable
// while scrolling. Tapping it opens the slide-down sheet.
export function CartFab({
  count,
  total,
  currency,
  locale,
  textDir,
  onClick
}: {
  count: number;
  total: number;
  currency?: Currency;
  locale: Locale;
  textDir: LocaleDirection;
  onClick: () => void;
}) {
  const bump = useBumpOnIncrease(count);
  return (
    <button
      type="button"
      onClick={onClick}
      className="cart-fab-in focus-ring fixed bottom-5 right-4 z-40 inline-flex items-center gap-3 rounded-full bg-primary py-3 pe-5 ps-4 text-primary-foreground shadow-xl shadow-primary/25 transition-transform active:scale-95"
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <span className="relative inline-flex">
        <ShoppingCart className={cn("h-6 w-6", bump && "cart-bump")} aria-hidden />
        <span
          key={count}
          className="cart-badge-pop absolute -right-2 -top-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold text-primary"
        >
          {formatNumber(count, locale)}
        </span>
      </span>
      <span dir={textDir} className="text-sm font-semibold">
        {translate(locale, "cart.viewCart")}
      </span>
      {currency ? (
        <span className="text-sm font-bold tabular-nums">{formatMoney(total, currency, locale)}</span>
      ) : null}
    </button>
  );
}

// The slide-down sheet: dims the page, drops in from the top, lists every line
// with a stepper + line total, and shows the grand total.
export function CartSheet({
  open,
  onClose,
  cart,
  locale,
  textDir,
  serviceFeePercent
}: {
  open: boolean;
  onClose: () => void;
  cart: Cart;
  locale: Locale;
  textDir: LocaleDirection;
  serviceFeePercent: number;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const { lines, currency, totalPrice, totalQuantity } = cart;
  const subtotal = totalPrice;
  const serviceFee = serviceFeeAmount(subtotal, serviceFeePercent);
  const grandTotal = subtotal + serviceFee;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={translate(locale, "cart.title")}>
      <div className="dialog-backdrop absolute inset-0" onMouseDown={onClose} />
      <div
        dir={textDir}
        className="cart-sheet absolute inset-x-0 top-0 mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col rounded-b-3xl border-x border-b bg-card shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-bold">{translate(locale, "cart.title")}</h2>
            {totalQuantity > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {formatNumber(totalQuantity, locale)}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={translate(locale, "cart.close")}
            onClick={onClose}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {lines.length ? (
          <>
            <ul className="flex-1 overflow-y-auto px-3 py-3">
              {lines.map((line) => (
                <li key={line.key} className="mb-2 flex items-center gap-3 rounded-2xl border bg-background/60 p-2.5 last:mb-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <FallbackMenuImage src={line.imageUrl} alt={localized(line.name, locale)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{localized(line.name, locale)}</p>
                    {line.variantName ? (
                      <p className="truncate text-xs text-muted-foreground">{localized(line.variantName, locale)}</p>
                    ) : null}
                    <p className="text-xs font-medium text-primary">
                      {formatMoney(line.unitPrice, line.currency, locale)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <QuantityStepper
                      size="sm"
                      quantity={line.quantity}
                      locale={locale}
                      onIncrement={() => cart.increment(line.key)}
                      onDecrement={() => cart.decrement(line.key)}
                    />
                    <span className="text-sm font-bold tabular-nums">
                      {formatMoney(line.unitPrice * line.quantity, line.currency, locale)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t px-5 py-4">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{translate(locale, "cart.subtotal")}</span>
                  <span className="font-medium tabular-nums">
                    {currency ? formatMoney(subtotal, currency, locale) : ""}
                  </span>
                </div>
                {serviceFee > 0 ? (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {translate(locale, "cart.serviceFee")} ({formatNumber(serviceFeePercent, locale)}%)
                    </span>
                    <span className="font-medium tabular-nums">
                      {currency ? formatMoney(serviceFee, currency, locale) : ""}
                    </span>
                  </div>
                ) : null}
                <div className="mt-1 flex items-center justify-between gap-3 border-t pt-2">
                  <span className="text-sm font-semibold">{translate(locale, "cart.total")}</span>
                  <span className="text-xl font-extrabold tabular-nums text-primary">
                    {currency ? formatMoney(grandTotal, currency, locale) : ""}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={cart.clear}
                className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-destructive transition-colors hover:text-destructive/80"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {translate(locale, "cart.clear")}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/50" aria-hidden />
            <p className="font-semibold">{translate(locale, "cart.empty")}</p>
            <p className="text-sm text-muted-foreground">{translate(locale, "cart.emptyHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
