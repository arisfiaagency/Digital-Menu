import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

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
  try {
    const body = (await request.json()) as { uid?: unknown };
    targetUid = typeof body.uid === "string" ? body.uid.trim() : "";
  } catch {
    targetUid = "";
  }
  if (!targetUid) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);

    // Only a full admin may delete accounts. Employees are stored with
    // isAdmin:true for data access, so we check the role explicitly.
    const callerProfile = (await db.collection("adminProfiles").doc(decoded.uid).get()).data();
    const isFullAdmin =
      decoded.admin === true ||
      (callerProfile?.isAdmin === true && callerProfile?.disabled !== true && callerProfile?.role !== "employee");
    if (!isFullAdmin) {
      return NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 });
    }

    if (decoded.uid === targetUid) {
      return NextResponse.json({ ok: false, error: "You cannot delete your own account." }, { status: 400 });
    }

    // Free the username mapping (best effort) before removing the profile.
    const profileRef = db.collection("adminProfiles").doc(targetUid);
    const username = (await profileRef.get()).data()?.username;
    if (typeof username === "string" && username) {
      await db.collection("usernames").doc(username).delete().catch(() => {});
    }

    // Delete the Firebase Auth login. Ignore "user not found" so a missing login
    // doesn't block cleaning up the Firestore records.
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
