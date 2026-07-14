import { unstable_cache } from "next/cache";
import { defaultAppData } from "@/data/default-data";
import { normalizeClientSlug } from "@/lib/tenant";
import type {
  AppData,
  AppearanceSettings,
  Category,
  ClientAccount,
  GeneralSettings,
  MenuItem,
  MenuSettings,
  QrSettings
} from "@/types/models";

// Public menu data is read on the SERVER via the Firestore REST API (plain
// fetch) instead of the client Firebase SDK. This keeps the ~150 KB Firebase
// bundle off the customer's phone and delivers ready-rendered HTML with no
// client-side round-trip waterfall. Only the public NEXT_PUBLIC_* config is
// needed; unauthenticated reads are governed by the same Firestore security
// rules the browser used (public reads for isActive/isAvailable are allowed).

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// How long a cached snapshot is served before it's refreshed. Admin menu edits
// appear to customers within this window (see revalidatePublicData()).
const REVALIDATE_SECONDS = 20;
export const PUBLIC_DATA_TAG = "public-app-data";

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

// Runs a `field == true` + orderBy query (matches the public menu queries and
// the security rules) and returns decoded plain documents with their id.
async function getRestDocument(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${DOCUMENTS_BASE}/${path}?key=${API_KEY}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get ${path} failed: ${res.status}`);
  const document = (await res.json()) as RestDocument;
  return { id: docIdFromName(document.name), ...decodeFields(document.fields) };
}

async function runBoolQuery(
  parentPath: string,
  collectionId: string,
  field: string,
  orderByField: string,
  max: number
): Promise<Record<string, unknown>[]> {
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: "EQUAL",
          value: { booleanValue: true }
        }
      },
      orderBy: [{ field: { fieldPath: orderByField } }],
      limit: max
    }
  };
  const res = await fetch(`${DOCUMENTS_BASE}/${parentPath}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`runQuery ${collectionId} failed: ${res.status}`);
  const rows = (await res.json()) as Array<{ document?: RestDocument }>;
  return rows
    .filter((row): row is { document: RestDocument } => Boolean(row.document))
    .map((row) => ({ id: docIdFromName(row.document.name), ...decodeFields(row.document.fields) }));
}

async function batchGetSettings(clientSlug: string): Promise<Record<string, Record<string, unknown>>> {
  const names = ["general", "menu", "appearance", "qr"].map(
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

async function fetchPublicAppData(clientSlug: string): Promise<AppData> {
  if (!DOCUMENTS_BASE || !API_KEY) return defaultAppData;
  const slug = normalizeClientSlug(clientSlug);
  if (!slug) return defaultAppData;
  try {
    const client = await getRestDocument(`clients/${slug}`) as ClientAccount | null;
    if (!client || client.status !== "active") return defaultAppData;
    const parentPath = `clients/${slug}`;
    const [categories, menuItemsRaw, settings] = await Promise.all([
      runBoolQuery(parentPath, "categories", "isActive", "displayOrder", 100),
      runBoolQuery(parentPath, "menuItems", "isAvailable", "displayOrder", 200),
      batchGetSettings(slug)
    ]);

    const menuItems = menuItemsRaw.map((item) => {
      const next = { ...item };
      delete next.imageHistory;
      return next as unknown as MenuItem;
    });

    return {
      categories: categories as unknown as Category[],
      menuItems,
      general: { ...defaultAppData.general, ...(settings.general as Partial<GeneralSettings>) },
      menu: { ...defaultAppData.menu, ...(settings.menu as Partial<MenuSettings>) },
      appearance: { ...defaultAppData.appearance, ...(settings.appearance as Partial<AppearanceSettings>) },
      qr: { ...defaultAppData.qr, ...(settings.qr as Partial<QrSettings>) }
    };
  } catch {
    // Never break the page — fall back to the offline defaults and let the next
    // revalidation retry.
    return defaultAppData;
  }
}

async function fetchPublicClient(clientSlug: string): Promise<ClientAccount | null> {
  if (!DOCUMENTS_BASE || !API_KEY) return null;
  const slug = normalizeClientSlug(clientSlug);
  if (!slug) return null;
  try {
    const client = await getRestDocument(`clients/${slug}`) as ClientAccount | null;
    return client && client.status === "active" ? client : null;
  } catch {
    return null;
  }
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

// Shared across every public page so a burst of visitors triggers at most one
// set of Firestore calls per revalidation window.
export const getPublicAppDataRest = unstable_cache(fetchPublicAppData, ["public-app-data"], {
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
