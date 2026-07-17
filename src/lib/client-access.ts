import type { ClientAccount } from "@/types/models";

export type AccessExpiryState = "live" | "near_expiry" | "expired" | "unknown";

const NEAR_EXPIRY_DAYS = 5;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Add calendar months to a date (clamped for short months). */
export function addCalendarMonths(from: Date, months: number): Date {
  const next = new Date(from.getTime());
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  // If month rolled over (e.g. Jan 31 + 1 month), clamp to last day of target month.
  if (next.getDate() < day) next.setDate(0);
  return next;
}

/**
 * Extend paid access: if still valid, stack months onto current expiry;
 * if already expired (or missing), start from now.
 */
export function extendSubscriptionExpiry(currentExpiresAt: string | undefined, months: number): string {
  const monthsToAdd = Math.max(1, Math.floor(months) || 1);
  const current = parseIsoDate(currentExpiresAt);
  const base = current && current.getTime() > Date.now() ? current : new Date();
  return addCalendarMonths(base, monthsToAdd).toISOString();
}

/** Paid period end, else trial end — whichever is later when both exist. */
export function getServiceExpiresAt(client: ClientAccount | null | undefined): string | null {
  if (!client) return null;
  const sub = parseIsoDate(client.subscription?.expiresAt);
  const trial = parseIsoDate(client.trial?.endAt);
  if (sub && trial) return (sub.getTime() >= trial.getTime() ? sub : trial).toISOString();
  if (sub) return sub.toISOString();
  if (trial) return trial.toISOString();
  return null;
}

export function daysUntilExpiry(expiresAt?: string | null): number | null {
  const end = parseIsoDate(expiresAt);
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / MS_PER_DAY);
}

export function getAccessExpiryState(client: ClientAccount | null | undefined): AccessExpiryState {
  if (!client) return "unknown";
  const expiresAt = getServiceExpiresAt(client);
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= NEAR_EXPIRY_DAYS) return "near_expiry";
  return "live";
}

export function accessExpiryLabel(client: ClientAccount): string {
  const state = getAccessExpiryState(client);
  const days = daysUntilExpiry(getServiceExpiresAt(client));
  if (state === "expired") return "Expired";
  if (state === "near_expiry") {
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `Near expiry · ${days}d left`;
  }
  if (state === "live" && days !== null) return `Expires in ${days}d`;
  return "No expiry set";
}

export function formatExpiryDate(expiresAt?: string | null): string {
  const end = parseIsoDate(expiresAt);
  if (!end) return "—";
  return end.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Public menu + cafe admin stay available when active and not manually blocked. Expiry is informational only. */
export function isClientServiceActive(client: ClientAccount | null | undefined): boolean {
  if (!client) return false;
  if (client.status !== "active") return false;
  if (client.blocked) return false;
  return true;
}

export function trialDaysRemaining(client: ClientAccount): number | null {
  return daysUntilExpiry(client.trial?.endAt);
}

export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}
