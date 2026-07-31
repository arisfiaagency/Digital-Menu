import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isFullAdminProfile } from "@/lib/api/admin-authz";
import type { Firestore } from "firebase-admin/firestore";

export type PlatformFullAdminContext = {
  db: Firestore;
  uid: string;
  email?: string;
};

/** Firebase ID token + platform full-admin profile (Admin SDK). */
export async function requirePlatformFullAdmin(
  request: NextRequest
): Promise<PlatformFullAdminContext | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: "Missing token." }, { status: 401 }) };
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return { error: NextResponse.json({ ok: false, error: "Firebase Admin is not configured." }, { status: 503 }) };
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const profile = (await db.collection("adminProfiles").doc(decoded.uid).get()).data();
    if (!isFullAdminProfile(profile)) {
      return { error: NextResponse.json({ ok: false, error: "Platform admin access denied." }, { status: 403 }) };
    }
    return {
      db,
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : undefined
    };
  } catch {
    return { error: NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 }) };
  }
}
