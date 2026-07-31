import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import QRCode from "qrcode";
import { generateSecret, generateURI, verifySync } from "otplib";

const ISSUER = "Digital Menu Ratings";
const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const MAX_TOTP_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type RatingsTotpRecord = {
  secret: string;
  enabled: boolean;
  updatedAt: string;
};

function totpDocId(uid: string) {
  return `ratingsTotp_${uid}`;
}

function challengeDocId(uid: string) {
  return `ratingsTotpChallenge_${uid}`;
}

function lockDocId(uid: string) {
  return `ratingsTotpLock_${uid}`;
}

function hashChallengeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashesEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function loadRatingsTotp(db: Firestore, uid: string): Promise<RatingsTotpRecord | null> {
  const snap = await db.collection("platformSecrets").doc(totpDocId(uid)).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const secret = typeof data.secret === "string" ? data.secret : "";
  if (!secret) return null;
  return {
    secret,
    enabled: data.enabled === true,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : ""
  };
}

export async function ensureRatingsTotpSecret(db: Firestore, uid: string): Promise<RatingsTotpRecord> {
  const existing = await loadRatingsTotp(db, uid);
  if (existing) return existing;

  const secret = generateSecret();
  const updatedAt = new Date().toISOString();
  const record: RatingsTotpRecord = { secret, enabled: false, updatedAt };
  await db.collection("platformSecrets").doc(totpDocId(uid)).set(record);
  return record;
}

export async function enableRatingsTotp(db: Firestore, uid: string, secret: string) {
  const updatedAt = new Date().toISOString();
  await db.collection("platformSecrets").doc(totpDocId(uid)).set(
    { secret, enabled: true, updatedAt },
    { merge: true }
  );
  return updatedAt;
}

/** Issue a new secret and disable until confirmed with a fresh QR scan. */
export async function resetRatingsTotpSecret(db: Firestore, uid: string): Promise<RatingsTotpRecord> {
  const secret = generateSecret();
  const updatedAt = new Date().toISOString();
  const record: RatingsTotpRecord = { secret, enabled: false, updatedAt };
  await db.collection("platformSecrets").doc(totpDocId(uid)).set(record);
  await clearTotpChallenge(db, uid);
  await clearTotpFailures(db, uid);
  return record;
}

export function verifyRatingsTotpCode(secret: string, code: string) {
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const result = verifySync({ secret, token });
    return result.valid === true;
  } catch {
    return false;
  }
}

export async function buildAuthenticatorQr(email: string | undefined, secret: string) {
  const label = email?.trim() || "platform-admin";
  const otpauthUrl = generateURI({ issuer: ISSUER, label, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" }
  });
  return { otpauthUrl, qrDataUrl, secret };
}

export async function getTotpLockStatus(db: Firestore, uid: string) {
  const snap = await db.collection("platformSecrets").doc(lockDocId(uid)).get();
  if (!snap.exists) return { locked: false as const, retryAfterSec: 0, failures: 0 };
  const data = snap.data() || {};
  const lockedUntil = typeof data.lockedUntil === "number" ? data.lockedUntil : 0;
  const failures = typeof data.failures === "number" ? data.failures : 0;
  const now = Date.now();
  if (lockedUntil > now) {
    return {
      locked: true as const,
      retryAfterSec: Math.max(1, Math.ceil((lockedUntil - now) / 1000)),
      failures
    };
  }
  return { locked: false as const, retryAfterSec: 0, failures };
}

export async function recordTotpFailure(db: Firestore, uid: string) {
  const ref = db.collection("platformSecrets").doc(lockDocId(uid));
  const snap = await ref.get();
  const data = snap.data() || {};
  const now = Date.now();
  const lockedUntil = typeof data.lockedUntil === "number" ? data.lockedUntil : 0;
  let failures = typeof data.failures === "number" ? data.failures : 0;
  if (lockedUntil && lockedUntil <= now) failures = 0;
  failures += 1;
  const nextLockedUntil = failures >= MAX_TOTP_FAILURES ? now + LOCKOUT_MS : 0;
  await ref.set({
    failures,
    lockedUntil: nextLockedUntil,
    updatedAt: new Date().toISOString()
  });
  return {
    locked: nextLockedUntil > now,
    retryAfterSec: nextLockedUntil > now ? Math.ceil(LOCKOUT_MS / 1000) : 0,
    failures
  };
}

export async function clearTotpFailures(db: Firestore, uid: string) {
  await db.collection("platformSecrets").doc(lockDocId(uid)).delete().catch(() => undefined);
}

/** Short-lived one-time proof that TOTP succeeded; required to mint the API key. */
export async function issueTotpChallenge(db: Firestore, uid: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  await db.collection("platformSecrets").doc(challengeDocId(uid)).set({
    tokenHash: hashChallengeToken(token),
    expiresAt,
    createdAt: new Date().toISOString()
  });
  return token;
}

/**
 * Atomically validates and deletes the challenge so it can be used only once.
 * Supports legacy plaintext `token` docs from earlier builds.
 */
export async function consumeTotpChallenge(db: Firestore, uid: string, token: string) {
  if (!token || typeof token !== "string") return false;
  const ref = db.collection("platformSecrets").doc(challengeDocId(uid));
  const providedHash = hashChallengeToken(token);

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return false;
      const data = snap.data() || {};
      const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : 0;
      if (Date.now() > expiresAt) {
        tx.delete(ref);
        return false;
      }
      const storedHash = typeof data.tokenHash === "string" ? data.tokenHash : "";
      const legacyToken = typeof data.token === "string" ? data.token : "";
      const ok = storedHash
        ? hashesEqual(storedHash, providedHash)
        : Boolean(legacyToken) && hashesEqual(hashChallengeToken(legacyToken), providedHash);
      if (!ok) return false;
      tx.delete(ref);
      return true;
    });
  } catch {
    return false;
  }
}

export async function clearTotpChallenge(db: Firestore, uid: string) {
  await db.collection("platformSecrets").doc(challengeDocId(uid)).delete().catch(() => undefined);
}

export async function writeRatingsSecurityAudit(
  db: Firestore,
  entry: {
    action: string;
    uid: string;
    email?: string;
    ok: boolean;
    detail?: string;
  }
) {
  await db.collection("platformAuditLogs").add({
    area: "ratings_api_key",
    action: entry.action,
    uid: entry.uid,
    email: entry.email || null,
    ok: entry.ok,
    detail: entry.detail || null,
    createdAt: new Date().toISOString()
  });
}
