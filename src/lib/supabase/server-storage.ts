import { SUPABASE_BUCKET, SUPABASE_URL } from "@/lib/supabase/client";

function supabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

export async function removeStoredImage(path?: string) {
  const baseUrl = SUPABASE_URL;
  const key = supabaseServerKey();
  if (!baseUrl || !key || !path) return { ok: false, skipped: true };

  const storagePath = path.includes("/") ? path : `${SUPABASE_BUCKET}/${path}`;
  const response = await fetch(`${baseUrl}/storage/v1/object/${storagePath}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${key}`, apikey: key }
  });

  if (response.ok || response.status === 404) return { ok: true, skipped: false };

  let error = "Image delete failed.";
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    error = body.message || body.error || error;
  } catch {
    // Keep the generic error when Supabase does not return JSON.
  }
  return { ok: false, skipped: false, error, status: response.status };
}
