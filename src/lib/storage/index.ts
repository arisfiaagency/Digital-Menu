import { getFirebaseAuth } from "@/lib/firebase/client";
import { compressImage, imageExtensionForFile, validateImageFile } from "@/lib/storage/image-utils";
import { resolveUploadFolder } from "@/lib/storage/paths";
import { isCloudflareR2Path } from "@/lib/storage/provider";
import { getActiveClientSlug } from "@/lib/tenant";

export { compressImage, validateImageFile, imageExtensionForFile } from "@/lib/storage/image-utils";
export { isCloudflareR2Path } from "@/lib/storage/provider";
export { resolveUploadFolder, clientImageFolder, slugifyImageFileBase } from "@/lib/storage/paths";

export type UploadImageResult = { imageUrl: string; imagePath: string };

export function hasStorageConfig() {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL);
}

async function authBearer() {
  const auth = getFirebaseAuth();
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("You must be signed in to upload images.");
  return token;
}

/**
 * Uploads an image to Cloudflare R2 via the same-origin API (no browser→R2 CORS).
 * Paths are namespaced under `clients/{slug}/…` when a tenant is active.
 * When `fileName` is set (e.g. "espresso"), the object is stored as `espresso.webp` (not a UUID).
 */
export async function uploadImage(
  path: string,
  file: File,
  onProgress?: (progress: number) => void,
  fileName?: string
): Promise<UploadImageResult> {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  if (!hasStorageConfig()) throw new Error("Cloudflare R2 is not configured.");

  const folder = resolveUploadFolder(path, getActiveClientSlug());
  const extension = imageExtensionForFile(file);
  const token = await authBearer();

  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  form.append("extension", extension);
  if (fileName?.trim()) form.append("fileName", fileName.trim());

  const result = await new Promise<UploadImageResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/storage/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let payload: { ok?: boolean; error?: string; imageUrl?: string; imagePath?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.ok && payload.imageUrl && payload.imagePath) {
        onProgress?.(100);
        resolve({ imageUrl: payload.imageUrl, imagePath: payload.imagePath });
        return;
      }
      reject(new Error(payload.error || `Image upload to Cloudflare R2 failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Image upload to Cloudflare R2 failed (network)."));
    xhr.send(form);
  });

  return result;
}

/** Deletes an R2 image (`r2/…`). Non-R2 legacy paths are skipped. */
export async function removeImage(path?: string) {
  if (!path) return;
  if (!isCloudflareR2Path(path)) return;

  const token = await authBearer();
  const response = await fetch("/api/storage/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ path })
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Image delete failed.");
  }
}
