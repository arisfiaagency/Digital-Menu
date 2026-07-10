import type { Currency } from "@/types/models";

const currencyDecimals: Record<Currency, number> = {
  IQD: 0,
  USD: 2,
  EUR: 2,
  TRY: 2
};

export function formatMoney(minorUnits: number, currency: Currency, locale = "en") {
  const decimals = currencyDecimals[currency];
  const amount = minorUnits / 10 ** decimals;
  const formatted = new Intl.NumberFormat(locale === "ckb" ? "ar-IQ" : locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatNumber(value: number, locale = "en") {
  return new Intl.NumberFormat(locale === "ckb" ? "ar-IQ" : locale).format(value);
}

// The price actually charged for an item. A discount only applies when it's a
// real positive price — a stored `0` (or missing) means "no discount", so we
// must NOT use `?? basePrice` here (`??` keeps 0). Matches the card's
// `Boolean(discountPrice)` display logic so the shown price == the charged price.
export function effectiveItemPrice(item: { basePrice: number; discountPrice?: number }) {
  return item.discountPrice ? item.discountPrice : item.basePrice;
}

// Service fee on a subtotal, matching the POS math: round(subtotal × rate).
export function serviceFeeAmount(subtotal: number, serviceFeePercent: number) {
  if (!serviceFeePercent) return 0;
  return Math.round(subtotal * (serviceFeePercent / 100));
}

// Iraq's smallest cash denomination is 250 IQD, so a payable total can only ever
// be a multiple of 250. Snap a total to the nearest 250 (ties round up, e.g.
// 1,125 → 1,250; 1,100 → 1,000; 1,400 → 1,500). Only IQD is constrained this
// way — currencies with sub-units (USD/EUR/TRY) keep their exact value.
const cashRoundingStep: Partial<Record<Currency, number>> = {
  IQD: 250
};

export function roundCashTotal(value: number, currency: Currency) {
  const step = cashRoundingStep[currency];
  if (!step) return value;
  return Math.round(value / step) * step;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[ك]/g, "ک")
    .replace(/[ي]/g, "ی")
    .replace(/\s+/g, " ")
    .trim();
}
