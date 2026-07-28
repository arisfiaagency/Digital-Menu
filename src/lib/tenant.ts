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

let activeClientSlug: string | null = null;

/**
 * Per-async-operation slug binding. Captures the cafe at operation start so a
 * mid-flight navigation to another cafe cannot retarget Firestore/storage writes.
 * Nested binds stack (concurrent ops in one tab should still avoid overlapping
 * different cafes when possible).
 */
const boundSlugStack: (string | null)[] = [];

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
  if (boundSlugStack.length) return boundSlugStack[boundSlugStack.length - 1]!;
  return activeClientSlug;
}

/** Run `fn` with the current cafe slug frozen for the whole async call. */
export async function runWithClientSlug<T>(fn: () => Promise<T>): Promise<T>;
export async function runWithClientSlug<T>(slug: string | null, fn: () => Promise<T>): Promise<T>;
export async function runWithClientSlug<T>(
  slugOrFn: string | null | (() => Promise<T>),
  maybeFn?: () => Promise<T>
): Promise<T> {
  const slug = typeof slugOrFn === "function" ? activeClientSlug : slugOrFn;
  const fn = typeof slugOrFn === "function" ? slugOrFn : maybeFn!;
  boundSlugStack.push(slug);
  try {
    return await fn();
  } finally {
    boundSlugStack.pop();
  }
}

/** Wrap an async function so it always uses the cafe slug from call-start. */
export function bindClientSlug<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return (...args: A) => runWithClientSlug(() => fn(...args));
}

export function clientAdminPath(slug: string, path = "") {
  const base = `/${normalizeClientSlug(slug)}/admin`;
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}
