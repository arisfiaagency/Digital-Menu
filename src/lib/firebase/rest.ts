import { unstable_cache } from "next/cache";
import { normalizeClientSlug } from "@/lib/tenant";
import type { ClientAccount } from "@/types/models";

// Tenant admin layouts read the client account on the server so blocked or
// disabled cafes return not found before the authenticated admin UI renders.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// How long a cached snapshot is served before it's refreshed.
const REVALIDATE_SECONDS = 20;
const CLIENT_ACCOUNT_TAG = "client-account-data";

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

export const getClientAccountRest = unstable_cache(fetchClientAccount, ["client-account"], {
  revalidate: REVALIDATE_SECONDS,
  tags: [CLIENT_ACCOUNT_TAG]
});
