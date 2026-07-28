import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isApprovedStaffProfile } from "@/lib/api/admin-authz";

export async function POST(request: NextRequest) {
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

  try {
    const decoded = await auth.verifyIdToken(token);
    const profile = await db.collection("adminProfiles").doc(decoded.uid).get();
    if (!isApprovedStaffProfile(profile.data())) {
      return NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 });
    }

    return NextResponse.json({ ok: true, uid: decoded.uid });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 });
  }
}
