let activeClientSlug: string | null = null;

export function normalizeClientSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function setActiveClientSlug(slug: string | null) {
  activeClientSlug = slug ? normalizeClientSlug(slug) : null;
}

export function getActiveClientSlug() {
  return activeClientSlug;
}

export function clientMenuPath(slug: string) {
  return `/${normalizeClientSlug(slug)}/menu`;
}

export function clientAdminPath(slug: string, path = "") {
  const base = `/${normalizeClientSlug(slug)}/admin`;
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}
