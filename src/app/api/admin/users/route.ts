import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isFullAdminProfile } from "@/lib/api/admin-authz";
import { normalizeClientSlug } from "@/lib/tenant";

// Fully delete a staff account: the Firebase Auth login, the username -> email
// mapping, and the adminProfiles document. The client SDK can only delete the
// Firestore docs (not another user's Auth login), so this runs server-side with
// the Admin SDK. Caller must present a valid admin ID token.
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 401 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    // Admin SDK isn't configured (e.g. missing env vars) — let the client fall
    // back to deleting just the Firestore records.
    return NextResponse.json({ ok: false, error: "Firebase Admin is not configured." }, { status: 503 });
  }

  let targetUid = "";
  let clientSlug = "";
  try {
    const body = (await request.json()) as { uid?: unknown; clientSlug?: unknown };
    targetUid = typeof body.uid === "string" ? body.uid.trim() : "";
    clientSlug = typeof body.clientSlug === "string" ? normalizeClientSlug(body.clientSlug) : "";
  } catch {
    targetUid = "";
    clientSlug = "";
  }
  if (!targetUid) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);

    // Only a full admin may delete accounts. Never trust JWT admin alone.
    const clientRoot = clientSlug ? db.collection("clients").doc(clientSlug) : null;
    const clientCallerProfile = clientRoot
      ? (await clientRoot.collection("adminProfiles").doc(decoded.uid).get()).data()
      : null;
    const platformCallerProfile = (await db.collection("adminProfiles").doc(decoded.uid).get()).data();

    const callerIsCafeFullAdmin = Boolean(clientSlug) && isFullAdminProfile(clientCallerProfile);
    const callerIsPlatformFullAdmin = !clientSlug && isFullAdminProfile(platformCallerProfile);
    if (!callerIsCafeFullAdmin && !callerIsPlatformFullAdmin) {
      return NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 });
    }

    if (decoded.uid === targetUid) {
      return NextResponse.json({ ok: false, error: "You cannot delete your own account." }, { status: 400 });
    }

    // Target must belong to the caller's scope — never delete an Auth user by UID alone.
    const profileRef = clientRoot
      ? clientRoot.collection("adminProfiles").doc(targetUid)
      : db.collection("adminProfiles").doc(targetUid);
    const targetSnap = await profileRef.get();
    if (!targetSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "User is not a member of this cafe." },
        { status: 404 }
      );
    }

    const username = targetSnap.data()?.username;
    if (typeof username === "string" && username) {
      const usernameRef = clientRoot
        ? clientRoot.collection("usernames").doc(username)
        : db.collection("usernames").doc(username);
      await usernameRef.delete().catch(() => {});
    }

    await auth.deleteUser(targetUid).catch((err: { code?: string }) => {
      if (err?.code !== "auth/user-not-found") throw err;
    });

    await profileRef.delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("token")) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "Failed to delete user." }, { status: 500 });
  }
}
