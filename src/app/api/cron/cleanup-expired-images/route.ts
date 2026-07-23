import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { removeStoredImage } from "@/lib/storage/server";
import type { ImageHistoryEntry } from "@/types/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CleanupStats = {
  scannedItems: number;
  updatedItems: number;
  expiredImages: number;
  deletedImages: number;
  failures: Array<{ itemId: string; clientSlug?: string; imagePath: string; error: string }>;
};

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
  const stats: CleanupStats = {
    scannedItems: 0,
    updatedItems: 0,
    expiredImages: 0,
    deletedImages: 0,
    failures: []
  };

  // Prefer multi-tenant paths under clients/{slug}/menuItems. Also clean any leftover
  // root menuItems docs from the pre-tenant layout.
  const clients = await db.collection("clients").get();
  for (const client of clients.docs) {
    const snapshot = await client.ref.collection("menuItems").get();
    await cleanupMenuItemDocs(snapshot.docs, now, stats, client.id);
  }

  const legacyRoot = await db.collection("menuItems").get();
  await cleanupMenuItemDocs(legacyRoot.docs, now, stats);

  return NextResponse.json({
    ok: stats.failures.length === 0,
    clientsScanned: clients.size,
    ...stats
  });
}

async function cleanupMenuItemDocs(
  docs: QueryDocumentSnapshot[],
  now: number,
  stats: CleanupStats,
  clientSlug?: string
) {
  for (const docSnap of docs) {
    stats.scannedItems += 1;
    const data = docSnap.data() as { imageHistory?: ImageHistoryEntry[] };
    const history = Array.isArray(data.imageHistory) ? data.imageHistory : [];
    const active: ImageHistoryEntry[] = [];
    const expired: ImageHistoryEntry[] = [];

    for (const entry of history) {
      if (isExpired(entry.expiresAt, now)) expired.push(entry);
      else active.push(entry);
    }

    if (!expired.length) continue;
    stats.expiredImages += expired.length;

    const results = await Promise.all(expired.map((entry) => removeStoredImage(entry.imagePath)));
    results.forEach((result, index) => {
      const entry = expired[index];
      if (result.ok) stats.deletedImages += 1;
      else if (!result.skipped) {
        stats.failures.push({
          itemId: docSnap.id,
          clientSlug,
          imagePath: entry.imagePath,
          error: result.error || `Delete failed with status ${result.status || "unknown"}`
        });
      }
    });

    await docSnap.ref.update({
      imageHistory: active,
      imageHistoryCleanedAt: FieldValue.serverTimestamp()
    });
    stats.updatedItems += 1;
  }
}

function isExpired(value: string, now: number) {
  return Number.isFinite(Date.parse(value)) && Date.parse(value) <= now;
}
