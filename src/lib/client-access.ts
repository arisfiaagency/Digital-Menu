import type { ClientAccount } from "@/types/models";

/** Public menu + cafe admin stay available only when the cafe is active, not blocked, and trial/sub allows it. */
export function isClientServiceActive(client: ClientAccount | null | undefined): boolean {
  if (!client) return false;
  if (client.status !== "active") return false;
  if (client.blocked) return false;

  const subStatus = client.subscription?.status ?? "none";
  if (subStatus === "active") return true;
  if (subStatus === "canceled" || subStatus === "past_due") return false;

  const endAt = client.trial?.endAt;
  if (endAt) {
    const end = Date.parse(endAt);
    if (!Number.isNaN(end)) return Date.now() <= end;
  }

  // Legacy cafes with no subscription/trial stay online until blocked.
  return true;
}

export function trialDaysRemaining(client: ClientAccount): number | null {
  const endAt = client.trial?.endAt;
  if (!endAt) return null;
  const end = Date.parse(endAt);
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}
