/** Card grids use the small thumb when present; older items fall back to the full image. */
export function menuItemCardImageUrl(item: { imageUrl?: string; thumbUrl?: string } | null | undefined) {
  if (!item) return "";
  return item.thumbUrl || item.imageUrl || "";
}

/** Detail / preview always prefers the full-resolution (or animated / video) asset. */
export function menuItemDetailImageUrl(item: { imageUrl?: string; thumbUrl?: string } | null | undefined) {
  if (!item) return "";
  return item.imageUrl || item.thumbUrl || "";
}
