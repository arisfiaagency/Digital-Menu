import { NextRequest, NextResponse } from "next/server";
import type { CollectionReference, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Activity log rows older than this are permanently removed. */
const AUDIT_RETENTION_DAYS = 60;
const BATCH_LIMIT = 400;

type CleanupStats = {
  clientsScanned: number;
  scannedLogs: number;
  deletedLogs: number;
  failures: Array<{ clientSlug?: string; logId: string; error: string }>;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Firebase Admin is not configured." }, { status: 503 });
  }

  const cutoffIso = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const stats: CleanupStats = {
    clientsScanned: 0,
    scannedLogs: 0,
    deletedLogs: 0,
    failures: []
  };

  const clients = await db.collection("clients").get();
  for (const client of clients.docs) {
    stats.clientsScanned += 1;
    await deleteExpiredAuditLogs(client.ref.collection("auditLogs"), cutoffIso, stats, client.id);
  }

  // Pre-tenant / accidental root collection, if any.
  await deleteExpiredAuditLogs(db.collection("auditLogs"), cutoffIso, stats);

  return NextResponse.json({
    ok: stats.failures.length === 0,
    retentionDays: AUDIT_RETENTION_DAYS,
    cutoffIso,
    ...stats
  });
}

async function deleteExpiredAuditLogs(
  collectionRef: CollectionReference,
  cutoffIso: string,
  stats: CleanupStats,
  clientSlug?: string
) {
  // Prefer the client-captured ISO `at` field (string compare works for ISO-8601).
  let snap = await collectionRef
    .where("at", "<", cutoffIso)
    .limit(BATCH_LIMIT)
    .get()
    .catch(() => null);

  if (!snap) {
    // Fallback if the query fails (e.g. rules/index edge cases): bounded scan + filter.
    const recent = await collectionRef
      .orderBy("createdAt", "asc")
      .limit(BATCH_LIMIT)
      .get()
      .catch(() => null);
    if (!recent) return;
    const expired = recent.docs.filter((docSnap) => isOlderThanCutoff(docSnap, cutoffIso));
    stats.scannedLogs += recent.size;
    await deleteDocs(expired, stats, clientSlug);
    return;
  }

  while (!snap.empty) {
    stats.scannedLogs += snap.size;
    await deleteDocs(snap.docs, stats, clientSlug);
    if (snap.size < BATCH_LIMIT) break;
    snap = await collectionRef
      .where("at", "<", cutoffIso)
      .limit(BATCH_LIMIT)
      .get()
      .catch(() => null);
    if (!snap) break;
  }
}

function isOlderThanCutoff(docSnap: QueryDocumentSnapshot, cutoffIso: string) {
  const data = docSnap.data() as { at?: string; createdAt?: { toDate?: () => Date } };
  if (typeof data.at === "string" && data.at) return data.at < cutoffIso;
  const created = data.createdAt?.toDate?.();
  if (created) return created.toISOString() < cutoffIso;
  return false;
}

async function deleteDocs(docs: QueryDocumentSnapshot[], stats: CleanupStats, clientSlug?: string) {
  if (!docs.length) return;
  const db = docs[0].ref.firestore;
  for (let i = 0; i < docs.length; i += 450) {
    const chunk = docs.slice(i, i + 450);
    const batch = db.batch();
    for (const docSnap of chunk) batch.delete(docSnap.ref);
    try {
      await batch.commit();
      stats.deletedLogs += chunk.length;
    } catch (err) {
      for (const docSnap of chunk) {
        stats.failures.push({
          clientSlug,
          logId: docSnap.id,
          error: err instanceof Error ? err.message : "Delete failed"
        });
      }
    }
  }
}
