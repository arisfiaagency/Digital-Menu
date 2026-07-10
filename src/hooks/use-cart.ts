"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { effectiveItemPrice } from "@/lib/utils/format";
import type { Currency, LocalizedText, MenuItem, MenuVariant } from "@/types/models";

// The customer's cart is kept per-browser so a refresh (or the iOS in-app
// browser reloading the page) doesn't lose what they picked. Namespaced like the
// other public keys (`stone-cafe-menu-*`).
const CART_STORAGE_KEY = "stone-cafe-menu-cart";

export type CartLine = {
  key: string;
  itemId: string;
  variantId?: string;
  // Store the full localized name so the cart re-localizes live when the visitor
  // switches language, and still reads correctly after a reload.
  name: LocalizedText;
  variantName?: LocalizedText;
  imageUrl?: string;
  unitPrice: number;
  currency: Currency;
  quantity: number;
};

// A cart line is a menu item + optional variant. Same item with two different
// variants are two separate lines.
export function cartLineKey(itemId: string, variantId?: string) {
  return variantId ? `${itemId}::${variantId}` : itemId;
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.key === "string" &&
    typeof line.itemId === "string" &&
    typeof line.unitPrice === "number" &&
    typeof line.quantity === "number" &&
    line.quantity > 0 &&
    typeof line.name === "object" &&
    line.name !== null
  );
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Skip the very first save so the initial empty state (before the stored cart
  // is read on mount) can't overwrite a saved cart.
  const skipSave = useRef(true);

  // Restore on mount (client only — keeps SSR/hydration rendering an empty cart,
  // then fills it in after mount so there's no hydration mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const restored = parsed.filter(isCartLine);
          if (restored.length) setLines(restored);
        }
      }
    } catch {
      // ignore corrupted cart storage
    }
  }, []);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // ignore quota / private-mode write errors
    }
  }, [lines]);

  const add = useCallback((item: MenuItem, variant?: MenuVariant) => {
    const key = cartLineKey(item.id, variant?.id);
    const unitPrice = variant ? variant.price : effectiveItemPrice(item);
    setLines((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...current,
        {
          key,
          itemId: item.id,
          variantId: variant?.id,
          name: item.name,
          variantName: variant?.name,
          imageUrl: item.imageUrl,
          unitPrice,
          currency: item.currency,
          quantity: 1
        }
      ];
    });
  }, []);

  const increment = useCallback((key: string) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line))
    );
  }, []);

  // Dropping to zero removes the line.
  const decrement = useCallback((key: string) => {
    setLines((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const quantityOf = useCallback(
    (itemId: string, variantId?: string) => {
      const key = cartLineKey(itemId, variantId);
      return lines.find((line) => line.key === key)?.quantity ?? 0;
    },
    [lines]
  );

  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalPrice = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [lines]
  );
  // Menus use a single currency; the total follows the lines' currency.
  const currency = lines[0]?.currency;

  return {
    lines,
    add,
    increment,
    decrement,
    remove,
    clear,
    quantityOf,
    totalQuantity,
    totalPrice,
    currency
  };
}

export type Cart = ReturnType<typeof useCart>;
