import { normalizeClientSlug } from "@/lib/tenant";

/** Root prefix for one cafe's images: `clients/{slug}` */
export function clientImageFolder(slug: string) {
  const normalized = normalizeClientSlug(slug);
  if (!normalized) throw new Error("Client slug is required for image storage.");
  return `clients/${normalized}`;
}

/** Marker object so the cafe folder exists in object storage before the first upload. */
export function clientImageFolderMarkerKey(slug: string) {
  return `${clientImageFolder(slug)}/.keep`;
}

/**
 * Builds a storage folder path for uploads.
 * When a tenant slug is known: `clients/{slug}/{relativePath}`.
 */
export function resolveUploadFolder(relativePath: string, clientSlug?: string | null) {
  const cleaned = relativePath.replace(/^\/+|\/+$/g, "");
  if (!clientSlug) return cleaned;
  const root = clientImageFolder(clientSlug);
  if (cleaned === root || cleaned.startsWith(`${root}/`)) return cleaned;
  return `${root}/${cleaned}`;
}

/**
 * Turns an item name into a safe object filename base (no extension).
 * Example: "Espresso Latte!" → "espresso-latte"
 */
export function slugifyImageFileBase(name: string, fallback = "image") {
  const cleaned = name
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}
