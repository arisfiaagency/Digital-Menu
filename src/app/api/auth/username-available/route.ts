import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isFullAdminProfile } from "@/lib/api/admin-authz";
import { normalizeClientSlug } from "@/lib/tenant";

/** Authenticated username availability check (Firestore username gets are closed). */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 401 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 503 });
  }

  let body: { username?: unknown; clientSlug?: unknown; exceptUid?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const clientSlug =
    typeof body.clientSlug === "string" ? normalizeClientSlug(body.clientSlug) : "";
  const exceptUid = typeof body.exceptUid === "string" ? body.exceptUid.trim() : "";

  if (!username || username.length < 3 || username.length > 40) {
    return NextResponse.json({ ok: false, error: "Invalid username." }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    if (clientSlug) {
      const profile = (
        await db.collection("clients").doc(clientSlug).collection("adminProfiles").doc(decoded.uid).get()
      ).data();
      if (!isFullAdminProfile(profile)) {
        return NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 });
      }
    } else {
      const profile = (await db.collection("adminProfiles").doc(decoded.uid).get()).data();
      if (!isFullAdminProfile(profile)) {
        return NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 });
      }
    }

    const ref = clientSlug
      ? db.collection("clients").doc(clientSlug).collection("usernames").doc(username)
      : db.collection("usernames").doc(username);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: true, available: true });
    }
    const uid = snap.data()?.uid;
    const available = typeof uid === "string" && exceptUid && uid === exceptUid;
    return NextResponse.json({ ok: true, available: Boolean(available) });
  } catch (err) {
    if (err instanceof Error && /token|auth/i.test(err.message)) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 });
    }
    console.error("username-available failed", err);
    return NextResponse.json({ ok: false, error: "Lookup failed." }, { status: 500 });
  }
}
