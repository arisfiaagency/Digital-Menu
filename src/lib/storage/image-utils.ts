const allowedImageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

const maxImageBytes = 10 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!allowedImageTypes[file.type]) return "Use a JPG, PNG, WebP, or GIF image.";
  if (file.size > maxImageBytes) return "Images must be 10 MB or smaller.";
  return null;
}

export function imageExtensionForFile(file: File) {
  return allowedImageTypes[file.type] || file.name.split(".").pop()?.toLowerCase() || "webp";
}

export const ALLOWED_IMAGE_CONTENT_TYPES = Object.keys(allowedImageTypes);
export const MAX_IMAGE_BYTES = maxImageBytes;

// Longest edge we keep for menu photos. Cards render well under this; anything larger is wasted bytes
// on a phone. 1600 keeps it crisp on retina while cutting big camera photos down hard.
const MAX_IMAGE_DIMENSION = 1600;
const RECOMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Downscales oversized photos and re-encodes them to WebP before upload so menu images load fast on
 * mobile. Animated GIFs are left untouched (a canvas would flatten them to one frame). Falls back to
 * the original file if anything goes wrong or compression wouldn't actually save bytes.
 */
export async function compressImage(file: File): Promise<File> {
  if (!RECOMPRESSIBLE_TYPES.has(file.type)) return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    // Only swap in the compressed copy if it's actually smaller (already-tiny images won't benefit).
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^./]+$/, "")}.webp`;
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}
