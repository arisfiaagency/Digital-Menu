// Supabase Storage config (image uploads). Only the public URL + publishable
// ("anon") key are used client-side; both are safe to expose to the browser.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "menu-images";

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
