const allowedImageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm"
};

const videoTypes = new Set(["video/mp4", "video/webm"]);
const maxImageBytes = 10 * 1024 * 1024;
const maxVideoBytes = 30 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!allowedImageTypes[file.type]) return "Use a JPG, PNG, WebP, GIF, or MP4 file.";
  const max = videoTypes.has(file.type) ? maxVideoBytes : maxImageBytes;
  if (file.size > max) {
    return videoTypes.has(file.type)
      ? "Videos must be 30 MB or smaller."
      : "Images must be 10 MB or smaller.";
  }
  return null;
}

export function imageExtensionForFile(file: File) {
  return allowedImageTypes[file.type] || file.name.split(".").pop()?.toLowerCase() || "webp";
}

export const ALLOWED_IMAGE_CONTENT_TYPES = Object.keys(allowedImageTypes);
export const MAX_IMAGE_BYTES = maxImageBytes;
export const MAX_VIDEO_BYTES = maxVideoBytes;

export function maxBytesForContentType(contentType: string) {
  return videoTypes.has(contentType) ? maxVideoBytes : maxImageBytes;
}

export function isVideoContentType(contentType: string) {
  return videoTypes.has(contentType);
}

/** Full / detail view longest edge. */
const MAX_FULL_DIMENSION = 1600;
/** Menu card thumb longest edge — small on purpose to cut R2 traffic. */
const MAX_THUMB_DIMENSION = 480;
const RECOMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type MenuImageVariants = {
  full: File;
  /** Static WebP for cards. Null for video (cards fall back to the full URL). */
  thumb: File | null;
};

/**
 * Downscales oversized photos and re-encodes them to WebP before upload so menu images load fast on
 * mobile. Animated GIFs and videos are left untouched (a canvas would flatten GIFs to one frame).
 * Falls back to the original file if anything goes wrong or compression wouldn't actually save bytes.
 */
export async function compressImage(file: File): Promise<File> {
  if (!RECOMPRESSIBLE_TYPES.has(file.type)) return file;
  const encoded = await encodeWebpVariant(file, MAX_FULL_DIMENSION, 0.82);
  if (!encoded || encoded.size >= file.size) return file;
  return encoded;
}

/**
 * One admin pick → full image for detail + small thumb for menu cards.
 * GIFs keep the animated file as full and get a still WebP thumb (cards stay light).
 * Videos are uploaded as-is with no separate thumb.
 */
export async function prepareMenuImageVariants(file: File): Promise<MenuImageVariants> {
  if (videoTypes.has(file.type)) {
    return { full: file, thumb: null };
  }

  if (file.type === "image/gif") {
    const thumb = await encodeWebpVariant(file, MAX_THUMB_DIMENSION, 0.78);
    return { full: file, thumb };
  }

  const encodedFull = await encodeWebpVariant(file, MAX_FULL_DIMENSION, 0.82);
  // Keep the original when WebP wouldn't save bytes (tiny camera exports, etc.).
  const full = encodedFull && encodedFull.size < file.size ? encodedFull : file;
  // Prefer encoding the thumb from the already-resized full when it's WebP.
  const thumbSource = full.type === "image/webp" ? full : file;
  const thumb = await encodeWebpVariant(thumbSource, MAX_THUMB_DIMENSION, 0.78);
  return { full, thumb };
}

async function encodeWebpVariant(file: File, maxDimension: number, quality: number): Promise<File | null> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return null;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      return null;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) return null;

    const name = `${file.name.replace(/\.[^./]+$/, "")}${maxDimension <= MAX_THUMB_DIMENSION ? "-thumb" : ""}.webp`;
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return null;
  }
}
