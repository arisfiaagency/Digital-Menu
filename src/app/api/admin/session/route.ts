import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

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
    const data = profile.data();
    const isAdmin = decoded.admin === true || (data?.isAdmin === true && data?.disabled !== true);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 });
    }

    return NextResponse.json({ ok: true, uid: decoded.uid });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 });
  }
}
