import type { Metadata } from "next";

export const DEFAULT_CAFE_FAVICON = "/site-icon.png";

/** Resolve the tab/favicon URL from cafe settings (falls back to the platform icon). */
export function resolveCafeFaviconUrl(logoUrl?: string | null) {
  const trimmed = logoUrl?.trim();
  return trimmed || DEFAULT_CAFE_FAVICON;
}

/** Next.js `metadata.icons` for a cafe's logo. */
export function cafeMetadataIcons(logoUrl?: string | null): NonNullable<Metadata["icons"]> {
  const url = resolveCafeFaviconUrl(logoUrl);
  return {
    icon: [{ url }],
    shortcut: [{ url }],
    apple: [{ url }]
  };
}

/**
 * Imperatively update the browser tab icon (and apple-touch icon).
 * Used when the cafe logo changes in settings so the tab updates without a full reload.
 */
export function applyCafeFavicon(logoUrl?: string | null) {
  if (typeof document === "undefined") return;
  const href = resolveCafeFaviconUrl(logoUrl);

  ensureLink("icon", href);
  ensureLink("shortcut icon", href);
  ensureLink("apple-touch-icon", href);
}

function ensureLink(rel: string, href: string) {
  const nodes = document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (nodes.length) {
    nodes.forEach((link) => {
      link.href = href;
    });
    return;
  }
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}
