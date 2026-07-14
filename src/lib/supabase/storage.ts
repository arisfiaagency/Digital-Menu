import { SUPABASE_BUCKET, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/client";

export type UploadMediaType = "image" | "video";

const allowedImageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

const allowedVideoTypes: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov"
};

const maxImageBytes = 10 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!allowedImageTypes[file.type]) return "Use a JPG, PNG, WebP, or GIF image.";
  if (file.size > maxImageBytes) return "Images must be 10 MB or smaller.";
  return null;
}

export function validateMediaFile(file: File, { maxBytes = maxImageBytes, maxBytesLabel = "10 MB" }: { maxBytes?: number; maxBytesLabel?: string } = {}) {
  if (!allowedImageTypes[file.type] && !allowedVideoTypes[file.type]) return "Use a JPG, PNG, WebP, GIF, MP4, WebM, or MOV file.";
  if (file.size > maxBytes) return `Files must be ${maxBytesLabel} or smaller.`;
  return null;
}

export function imageExtensionForFile(file: File) {
  return allowedImageTypes[file.type] || file.name.split(".").pop()?.toLowerCase() || "webp";
}

export function mediaExtensionForFile(file: File) {
  return allowedImageTypes[file.type] || allowedVideoTypes[file.type] || file.name.split(".").pop()?.toLowerCase() || "webp";
}

export function mediaTypeForFile(file: File): UploadMediaType {
  return file.type.startsWith("video/") ? "video" : "image";
}

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

/**
 * Uploads an image to Supabase Storage and returns its public URL + storage
 * path. Uses XHR so the caller gets real upload progress.
 */
export async function uploadImage(path: string, file: File, onProgress?: (progress: number) => void) {
  const baseUrl = SUPABASE_URL;
  const key = SUPABASE_KEY;
  if (!baseUrl || !key) throw new Error("Supabase Storage is not configured.");

  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const extension = imageExtensionForFile(file);
  const objectKey = `${path.replace(/^\/+|\/+$/g, "")}/${crypto.randomUUID()}.${extension}`;
  const endpoint = `${baseUrl}/storage/v1/object/${SUPABASE_BUCKET}/${objectKey}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("authorization", `Bearer ${key}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("x-upsert", "true");
    // Filenames are unique per upload (UUID), so the URL changes whenever the image changes —
    // safe to cache for a long time on the CDN + browser so repeat menu views are instant.
    xhr.setRequestHeader("cache-control", "31536000");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(parseError(xhr.responseText) || "Image upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Image upload failed."));
    xhr.send(file);
  });

  return {
    imagePath: `${SUPABASE_BUCKET}/${objectKey}`,
    imageUrl: `${baseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectKey}`,
    mediaType: "image" as const
  };
}

export async function uploadMedia(
  path: string,
  file: File,
  onProgress?: (progress: number) => void,
  options: { maxBytes?: number; maxBytesLabel?: string } = {}
) {
  const baseUrl = SUPABASE_URL;
  const key = SUPABASE_KEY;
  if (!baseUrl || !key) throw new Error("Supabase Storage is not configured.");

  const error = validateMediaFile(file, options);
  if (error) throw new Error(error);

  const extension = mediaExtensionForFile(file);
  const objectKey = `${path.replace(/^\/+|\/+$/g, "")}/${crypto.randomUUID()}.${extension}`;
  const endpoint = `${baseUrl}/storage/v1/object/${SUPABASE_BUCKET}/${objectKey}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("authorization", `Bearer ${key}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "31536000");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(parseError(xhr.responseText) || "File upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("File upload failed."));
    xhr.send(file);
  });

  return {
    imagePath: `${SUPABASE_BUCKET}/${objectKey}`,
    imageUrl: `${baseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectKey}`,
    mediaType: mediaTypeForFile(file)
  };
}

/** Deletes an image previously uploaded via `uploadImage`. `path` is `bucket/objectKey`. */
export async function removeImage(path?: string) {
  const baseUrl = SUPABASE_URL;
  const key = SUPABASE_KEY;
  if (!baseUrl || !key || !path) return;
  const response = await fetch(`${baseUrl}/storage/v1/object/${path}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${key}`, apikey: key }
  });
  if (!response.ok) throw new Error(parseError(await response.text()) || "Image delete failed.");
}

function parseError(body: string) {
  try {
    return (JSON.parse(body) as { message?: string; error?: string }).message ?? null;
  } catch {
    return null;
  }
}
