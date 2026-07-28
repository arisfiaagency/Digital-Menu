/** Allowed public hosts for cafe social links (and common www / mobile variants). */

const HOSTS: Record<string, string[]> = {
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
  snapchat: ["snapchat.com", "www.snapchat.com"]
};

function normalizeHost(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function hostAllowed(network: keyof typeof HOSTS, hostname: string) {
  const host = normalizeHost(hostname);
  return HOSTS[network].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Turn a handle or URL into an https link for a known network, or null if invalid.
 * Accepts full URLs on allowlisted hosts, or bare handles like `@cafe` / `cafe`.
 */
export function normalizeSocialUrl(
  network: "facebook" | "instagram" | "tiktok" | "snapchat",
  value: string
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    const handle = trimmed.replace(/^@/, "").replace(/^\/+/, "");
    if (!handle || /[\s<>"']/.test(handle)) return null;
    if (network === "facebook") candidate = `https://www.facebook.com/${handle}`;
    else if (network === "instagram") candidate = `https://www.instagram.com/${handle}`;
    else if (network === "tiktok") candidate = `https://www.tiktok.com/@${handle.replace(/^@/, "")}`;
    else candidate = `https://www.snapchat.com/add/${handle}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // Force https for public menu links.
  url.protocol = "https:";
  if (!hostAllowed(network, url.hostname)) return null;
  return url.toString();
}

export function sanitizeSocialLinks(input?: {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
}) {
  if (!input) return {};
  const next: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    snapchat?: string;
  } = {};
  for (const key of ["facebook", "instagram", "tiktok", "snapchat"] as const) {
    const raw = input[key];
    if (!raw?.trim()) continue;
    const normalized = normalizeSocialUrl(key, raw);
    if (normalized) next[key] = normalized;
  }
  return next;
}
