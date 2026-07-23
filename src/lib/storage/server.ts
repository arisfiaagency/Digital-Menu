import { removeR2Object } from "@/lib/storage/cloudflare-r2";
import { isCloudflareR2Path } from "@/lib/storage/provider";

/**
 * Server-side delete used by cron / Admin routes.
 * Only Cloudflare R2 paths (`r2/…`) are deleted; legacy non-R2 paths are skipped.
 */
export async function removeStoredImage(path?: string): Promise<{
  ok: boolean;
  skipped: boolean;
  error?: string;
  status?: number;
}> {
  if (!path) return { ok: false, skipped: true };
  if (!isCloudflareR2Path(path)) return { ok: false, skipped: true };

  const result = await removeR2Object(path);
  return {
    ok: result.ok,
    skipped: result.skipped,
    error: "error" in result ? result.error : undefined,
    status: "status" in result ? result.status : undefined
  };
}
