import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export const RATINGS_API_DOC = "platformSecrets/ratingsApi";

export type RatingsApiSecret = {
  /** SHA-256 hex of the raw API key. Raw key is only returned at generation time. */
  keyHash: string;
  /** First 8 chars of the raw key for UI display (not enough to authenticate). */
  keyPrefix: string;
  createdAt: string;
  createdByUid?: string;
  createdByEmail?: string;
};

export function generateRatingsApiKey() {
  const apiKey = `rm_${randomBytes(32).toString("base64url")}`;
  return {
    apiKey,
    keyHash: hashRatingsApiKey(apiKey),
    keyPrefix: apiKey.slice(0, 11)
  };
}

export function hashRatingsApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function extractRatingsApiKey(request: Request) {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

export async function loadRatingsApiSecret(db: Firestore): Promise<RatingsApiSecret | null> {
  const snap = await db.doc(RATINGS_API_DOC).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (typeof data.keyHash !== "string" || !data.keyHash) return null;
  return {
    keyHash: data.keyHash,
    keyPrefix: typeof data.keyPrefix === "string" ? data.keyPrefix : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : undefined,
    createdByEmail: typeof data.createdByEmail === "string" ? data.createdByEmail : undefined
  };
}

export async function saveRatingsApiSecret(
  db: Firestore,
  input: {
    keyHash: string;
    keyPrefix: string;
    createdByUid?: string;
    createdByEmail?: string;
  }
) {
  const createdAt = new Date().toISOString();
  await db.doc(RATINGS_API_DOC).set(
    {
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
      createdAt,
      createdByUid: input.createdByUid || null,
      createdByEmail: input.createdByEmail || null,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: false }
  );
  return createdAt;
}

/** Revoke the public ratings API key (public endpoints reject until a new key is minted). */
export async function deleteRatingsApiSecret(db: Firestore) {
  await db.doc(RATINGS_API_DOC).delete();
}

export function apiKeysMatch(provided: string, keyHash: string) {
  if (!provided || !keyHash) return false;
  const a = Buffer.from(hashRatingsApiKey(provided), "utf8");
  const b = Buffer.from(keyHash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function assertRatingsApiKey(db: Firestore, request: Request) {
  const provided = extractRatingsApiKey(request);
  if (!provided) return { ok: false as const, status: 401 as const, error: "Missing API key." };
  const secret = await loadRatingsApiSecret(db);
  if (!secret) return { ok: false as const, status: 503 as const, error: "Ratings API key is not configured." };
  if (!apiKeysMatch(provided, secret.keyHash)) {
    return { ok: false as const, status: 401 as const, error: "Invalid API key." };
  }
  return { ok: true as const, secret };
}
