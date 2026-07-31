import { randomBytes } from "crypto";
import type { Firestore } from "firebase-admin/firestore";
import QRCode from "qrcode";
import { generateSecret, generateURI, verifySync } from "otplib";

const ISSUER = "Digital Menu Ratings";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type RatingsTotpRecord = {
  secret: string;
  enabled: boolean;
  updatedAt: string;
};

function totpDocId(uid: string) {
  return `ratingsTotp_${uid}`;
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

function challengeDocId(uid: string) {
  return `ratingsTotpChallenge_${uid}`;
}

/** Short-lived proof that TOTP succeeded; required to mint the API key. */
export async function issueTotpChallenge(db: Firestore, uid: string) {
  const token = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  await db.collection("platformSecrets").doc(challengeDocId(uid)).set({ token, expiresAt });
  return token;
}

export async function assertTotpChallenge(db: Firestore, uid: string, token: string) {
  if (!token || typeof token !== "string") return false;
  const snap = await db.collection("platformSecrets").doc(challengeDocId(uid)).get();
  if (!snap.exists) return false;
  const data = snap.data() || {};
  const stored = typeof data.token === "string" ? data.token : "";
  const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : 0;
  if (!stored || stored !== token) return false;
  if (Date.now() > expiresAt) return false;
  return true;
}

export async function clearTotpChallenge(db: Firestore, uid: string) {
  await db.collection("platformSecrets").doc(challengeDocId(uid)).delete().catch(() => undefined);
}
