import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { removeStoredImage } from "@/lib/supabase/server-storage";
import type { ImageHistoryEntry } from "@/types/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Firebase Admin is not configured." }, { status: 503 });
  }

  const now = Date.now();
  const snapshot = await db.collection("menuItems").get();
  let scannedItems = 0;
  let updatedItems = 0;
  let expiredImages = 0;
  let deletedImages = 0;
  const failures: Array<{ itemId: string; imagePath: string; error: string }> = [];

  for (const doc of snapshot.docs) {
    scannedItems += 1;
    const data = doc.data() as { imageHistory?: ImageHistoryEntry[] };
    const history = Array.isArray(data.imageHistory) ? data.imageHistory : [];
    const active: ImageHistoryEntry[] = [];
    const expired: ImageHistoryEntry[] = [];

    for (const entry of history) {
      if (isExpired(entry.expiresAt, now)) expired.push(entry);
      else active.push(entry);
    }

    if (!expired.length) continue;
    expiredImages += expired.length;

    const results = await Promise.all(expired.map((entry) => removeStoredImage(entry.imagePath)));
    results.forEach((result, index) => {
      const entry = expired[index];
      if (result.ok) deletedImages += 1;
      else if (!result.skipped) {
        failures.push({
          itemId: doc.id,
          imagePath: entry.imagePath,
          error: result.error || `Delete failed with status ${result.status || "unknown"}`
        });
      }
    });

    await doc.ref.update({
      imageHistory: active,
      imageHistoryCleanedAt: FieldValue.serverTimestamp()
    });
    updatedItems += 1;
  }

  return NextResponse.json({
    ok: failures.length === 0,
    scannedItems,
    updatedItems,
    expiredImages,
    deletedImages,
    failures
  });
}

function isExpired(value: string, now: number) {
  return Number.isFinite(Date.parse(value)) && Date.parse(value) <= now;
}
