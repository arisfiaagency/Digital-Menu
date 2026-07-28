import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isFullAdminProfile } from "@/lib/api/admin-authz";
import { deleteAuthUserIfOrphaned } from "@/lib/api/auth-cleanup";
import { normalizeClientSlug } from "@/lib/tenant";

// Fully delete a staff account: the Firebase Auth login (only if unused elsewhere),
// the username -> email mapping, and the adminProfiles document.
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

    // Remove the profile first so orphan detection sees other cafes/platform.
    await profileRef.delete();
    const authResult = await deleteAuthUserIfOrphaned(auth, db, targetUid);

    return NextResponse.json({ ok: true, auth: authResult });
  } catch (err) {
    if (err instanceof Error && err.message.includes("token")) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "Failed to delete user." }, { status: 500 });
  }
}
