import { unstable_cache } from "next/cache";
import { defaultAppData } from "@/data/default-data";
import { isClientServiceActive } from "@/lib/client-access";
import { normalizeClientSlug, DEMO_CLIENT_SLUG } from "@/lib/tenant";
import type {
  AppearanceSettings,
  ClientAccount,
  GeneralSettings,
  MenuSettings
} from "@/types/models";

// Public welcome data is read on the SERVER via the Firestore REST API (plain
// fetch) instead of the client Firebase SDK. This keeps the ~150 KB Firebase
// bundle off the customer's phone and delivers ready-rendered HTML with no
// client-side round-trip waterfall. Only the public NEXT_PUBLIC_* config is
// needed; unauthenticated reads are governed by the same Firestore security
// rules the browser used (public reads for isActive/isAvailable are allowed).

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// How long a cached snapshot is served before it's refreshed.
const REVALIDATE_SECONDS = 20;
export const PUBLIC_DATA_TAG = "public-welcome-data";

const DOCUMENTS_BASE = PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  : "";

type RestValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: Record<string, RestValue> };
  referenceValue?: string;
};

type RestDocument = { name: string; fields?: Record<string, RestValue> };

function decodeValue(value: RestValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.referenceValue !== undefined) return value.referenceValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decodeValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields);
  return null;
}

function decodeFields(fields?: Record<string, RestValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields) return out;
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

function docIdFromName(name: string): string {
  return name.slice(name.lastIndexOf("/") + 1);
}

async function getRestDocument(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${DOCUMENTS_BASE}/${path}?key=${API_KEY}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get ${path} failed: ${res.status}`);
  const document = (await res.json()) as RestDocument;
  return { id: docIdFromName(document.name), ...decodeFields(document.fields) };
}

async function batchGetSettings(clientSlug: string): Promise<Record<string, Record<string, unknown>>> {
  const names = ["general", "menu", "appearance"].map(
    (id) => `projects/${PROJECT_ID}/databases/(default)/documents/clients/${clientSlug}/settings/${id}`
  );
  const res = await fetch(`${DOCUMENTS_BASE}:batchGet?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents: names })
  });
  if (!res.ok) throw new Error(`batchGet settings failed: ${res.status}`);
  const rows = (await res.json()) as Array<{ found?: RestDocument }>;
  const map: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    if (row.found) map[docIdFromName(row.found.name)] = decodeFields(row.found.fields);
  }
  return map;
}

type PublicWelcomeData = Pick<typeof defaultAppData, "general" | "menu" | "appearance">;

function defaultPublicWelcomeData(): PublicWelcomeData {
  return {
    general: defaultAppData.general,
    menu: defaultAppData.menu,
    appearance: defaultAppData.appearance
  };
}

async function fetchPublicWelcomeData(clientSlug: string): Promise<PublicWelcomeData> {
  if (!DOCUMENTS_BASE || !API_KEY) return defaultPublicWelcomeData();
  const slug = normalizeClientSlug(clientSlug);
  if (!slug) return defaultPublicWelcomeData();
  try {
    const client = await getRestDocument(`clients/${slug}`) as ClientAccount | null;
    if (!isClientServiceActive(client)) return defaultPublicWelcomeData();
    const settings = await batchGetSettings(slug);

    return {
      general: { ...defaultAppData.general, ...(settings.general as Partial<GeneralSettings>) },
      menu: { ...defaultAppData.menu, ...(settings.menu as Partial<MenuSettings>) },
      appearance: { ...defaultAppData.appearance, ...(settings.appearance as Partial<AppearanceSettings>) }
    };
  } catch {
    // Never break the page — fall back to the offline defaults and let the next
    // revalidation retry.
    return defaultPublicWelcomeData();
  }
}

async function fetchPublicClient(clientSlug: string): Promise<ClientAccount | null> {
  const slug = normalizeClientSlug(clientSlug);
  if (!slug) return null;
  // Without Firebase config, serve local sample data at /demo for local/e2e previews.
  if (!DOCUMENTS_BASE || !API_KEY) {
    return slug === DEMO_CLIENT_SLUG ? offlineDemoClient() : null;
  }
  try {
    const client = await getRestDocument(`clients/${slug}`) as ClientAccount | null;
    if (isClientServiceActive(client)) return client;
    // Keep /demo usable even when the tenant has not been seeded yet.
    return slug === DEMO_CLIENT_SLUG ? offlineDemoClient() : null;
  } catch {
    return slug === DEMO_CLIENT_SLUG ? offlineDemoClient() : null;
  }
}

function offlineDemoClient(): ClientAccount {
  return {
    id: DEMO_CLIENT_SLUG,
    name: defaultAppData.general.restaurantName.en || "Demo Cafe",
    slug: DEMO_CLIENT_SLUG,
    status: "active",
    defaultCurrency: defaultAppData.general.defaultCurrency,
    defaultLanguage: defaultAppData.general.defaultLanguage
  };
}

async function fetchClientAccount(clientSlug: string): Promise<ClientAccount | null> {
  if (!DOCUMENTS_BASE || !API_KEY) return null;
  const slug = normalizeClientSlug(clientSlug);
  if (!slug) return null;
  try {
    return await getRestDocument(`clients/${slug}`) as ClientAccount | null;
  } catch {
    return null;
  }
}

// Shared across public welcomes so a burst of visitors triggers at most one set
// of Firestore calls per revalidation window.
export const getPublicWelcomeDataRest = unstable_cache(fetchPublicWelcomeData, ["public-welcome-data"], {
  revalidate: REVALIDATE_SECONDS,
  tags: [PUBLIC_DATA_TAG]
});

export const getPublicClientRest = unstable_cache(fetchPublicClient, ["public-client"], {
  revalidate: REVALIDATE_SECONDS,
  tags: [PUBLIC_DATA_TAG]
});

export const getClientAccountRest = unstable_cache(fetchClientAccount, ["client-account"], {
  revalidate: REVALIDATE_SECONDS,
  tags: [PUBLIC_DATA_TAG]
});
