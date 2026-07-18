let activeClientSlug: string | null = null;

/** Slugs that collide with top-level app routes. */
export const RESERVED_CLIENT_SLUGS = new Set([
  "admin",
  "api",
  "menu",
  "_next",
  "favicon.ico",
  "opengraph-image",
  "robots.txt",
  "sitemap.xml"
]);

/** Offline preview slug used when Firebase Web config is missing. */
export const DEMO_CLIENT_SLUG = "demo";

export function normalizeClientSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isReservedClientSlug(slug: string) {
  return RESERVED_CLIENT_SLUGS.has(normalizeClientSlug(slug));
}

export function setActiveClientSlug(slug: string | null) {
  activeClientSlug = slug ? normalizeClientSlug(slug) : null;
}

export function getActiveClientSlug() {
  return activeClientSlug;
}

export function clientPublicPath(slug: string) {
  return `/${normalizeClientSlug(slug)}`;
}

export function clientAdminPath(slug: string, path = "") {
  const base = `/${normalizeClientSlug(slug)}/admin`;
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}
