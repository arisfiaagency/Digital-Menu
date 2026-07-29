/** Strip query/hash so `.gif?v=123` still detects as gif. */
function mediaPath(url: string) {
  return url.split("?")[0].split("#")[0].toLowerCase();
}

export type MenuMediaKind = "image" | "gif" | "video";

/** Classify a menu media URL for the right player (img vs video) and flicker-safe CSS. */
export function mediaKindFromUrl(url?: string | null): MenuMediaKind | "none" {
  if (!url) return "none";
  const path = mediaPath(url);
  if (/\.(mp4|webm|mov)$/.test(path)) return "video";
  if (/\.gif$/.test(path)) return "gif";
  return "image";
}

export function isVideoMediaUrl(url?: string | null) {
  return mediaKindFromUrl(url) === "video";
}

export function isAnimatedMediaUrl(url?: string | null) {
  const kind = mediaKindFromUrl(url);
  return kind === "gif" || kind === "video";
}
