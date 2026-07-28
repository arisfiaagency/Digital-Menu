import type { ClientAccount } from "@/types/models";

/** Fields safe to expose on the public menu / unauthenticated surfaces. */
export function toPublicClientAccount(client: ClientAccount): ClientAccount {
  return {
    id: client.id,
    name: client.name,
    slug: client.slug,
    status: client.status,
    defaultCurrency: client.defaultCurrency,
    defaultLanguage: client.defaultLanguage,
    menuDesign: client.menuDesign,
    menuAccent: client.menuAccent,
    menuBackdrop: client.menuBackdrop,
    menuMascot: client.menuMascot,
    menuMascotSpeed: client.menuMascotSpeed,
    qrEnabled: client.qrEnabled,
    ratingEnabled: client.ratingEnabled,
    demoMenuEnabled: client.demoMenuEnabled,
    ratingCount: client.ratingCount,
    ratingSum: client.ratingSum,
    ratingAvg: client.ratingAvg,
    blocked: client.blocked
    // Intentionally omit: ownerEmail, billing, subscription, trial,
    // blockedReason, blockedAt, createdAt, updatedAt
  };
}
