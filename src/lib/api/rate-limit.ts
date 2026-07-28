import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

function memoryRateLimit(bucketKey: string, opts: { limit: number; windowMs: number }): NextResponse | null {
  const now = Date.now();
  const current = memoryBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }
  current.count += 1;
  if (current.count > opts.limit) {
    return tooMany(Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
  }
  return null;
}

/**
 * Shared rate limit across serverless instances via Firestore Admin.
 * Falls back to in-memory if Admin SDK is unavailable.
 */
export async function rateLimit(
  request: NextRequest,
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<NextResponse | null> {
  const ip = clientIp(request);
  const bucketKey = `${key}:${ip}`;
  const db = getAdminDb();
  if (!db) return memoryRateLimit(bucketKey, opts);

  const docId = createHash("sha256").update(bucketKey).digest("hex").slice(0, 40);
  const ref = db.collection("_rateLimits").doc(docId);
  const now = Date.now();

  try {
    const decision = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { count?: number; resetAt?: number } | undefined;
      if (!data || typeof data.resetAt !== "number" || data.resetAt <= now) {
        tx.set(ref, {
          key: bucketKey,
          count: 1,
          resetAt: now + opts.windowMs,
          updatedAt: FieldValue.serverTimestamp()
        });
        return { limited: false as const, retryAfter: 0 };
      }
      const nextCount = (typeof data.count === "number" ? data.count : 0) + 1;
      tx.set(
        ref,
        {
          key: bucketKey,
          count: nextCount,
          resetAt: data.resetAt,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      if (nextCount > opts.limit) {
        return {
          limited: true as const,
          retryAfter: Math.max(1, Math.ceil((data.resetAt - now) / 1000))
        };
      }
      return { limited: false as const, retryAfter: 0 };
    });

    if (decision.limited) return tooMany(decision.retryAfter);
    return null;
  } catch (err) {
    console.warn("Durable rate limit failed; using memory fallback", err);
    return memoryRateLimit(bucketKey, opts);
  }
}
