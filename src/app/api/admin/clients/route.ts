import { NextRequest, NextResponse } from "next/server";
import type { CollectionReference, Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { deleteClientImageFolder } from "@/lib/storage/cloudflare-r2";
import { isReservedClientSlug, normalizeClientSlug } from "@/lib/tenant";

const CLIENT_SUBCOLLECTIONS = [
  "categories",
  "menuItems",
  "settings",
  "adminProfiles",
  "usernames",
  "completedOrders",
  "expenses",
  "auditLogs"
] as const;

// Fully delete a cafe tenant: staff Auth logins under the client, then every
// Firestore document under clients/{slug} (and the client doc itself).
// Caller must present a platform full-admin ID token.
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 401 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return NextResponse.json({ ok: false, error: "Firebase Admin is not configured." }, { status: 503 });
  }

  let slug = "";
  try {
    const body = (await request.json()) as { slug?: unknown };
    slug = typeof body.slug === "string" ? normalizeClientSlug(body.slug) : "";
  } catch {
    slug = "";
  }
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing client slug." }, { status: 400 });
  }
  if (isReservedClientSlug(slug)) {
    return NextResponse.json({ ok: false, error: `Slug "${slug}" is reserved.` }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const platformCallerProfile = (await db.collection("adminProfiles").doc(decoded.uid).get()).data();
    const isPlatformFullAdmin =
      decoded.admin === true ||
      (platformCallerProfile?.isAdmin === true &&
        platformCallerProfile?.disabled !== true &&
        platformCallerProfile?.role !== "employee");
    if (!isPlatformFullAdmin) {
      return NextResponse.json({ ok: false, error: "Platform admin access denied." }, { status: 403 });
    }

    const clientRef = db.collection("clients").doc(slug);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) {
      return NextResponse.json({ ok: false, error: "Client not found." }, { status: 404 });
    }

    // Remove tenant staff Auth accounts before wiping profiles.
    const staffSnap = await clientRef.collection("adminProfiles").get();
    for (const profile of staffSnap.docs) {
      await auth.deleteUser(profile.id).catch((err: { code?: string }) => {
        if (err?.code !== "auth/user-not-found") throw err;
      });
    }

    // Prefer recursive delete when available; fall back to known subcollections.
    if (typeof db.recursiveDelete === "function") {
      await db.recursiveDelete(clientRef);
    } else {
      for (const name of CLIENT_SUBCOLLECTIONS) {
        await deleteCollection(db, clientRef.collection(name));
      }
      await clientRef.delete();
    }

    // Best-effort wipe of that cafe's R2 image folder (no-op if R2 is not configured).
    await deleteClientImageFolder(slug).catch((err) => {
      console.error("Failed to delete client image folder", err);
    });

    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    if (err instanceof Error && /token|auth/i.test(err.message)) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 });
    }
    console.error("Failed to delete client", err);
    return NextResponse.json({ ok: false, error: "Failed to delete client." }, { status: 500 });
  }
}

async function deleteCollection(db: Firestore, collectionRef: CollectionReference) {
  const pageSize = 400;
  for (;;) {
    const snap = await collectionRef.limit(pageSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const entry of snap.docs) batch.delete(entry.ref);
    await batch.commit();
    if (snap.size < pageSize) break;
  }
}
