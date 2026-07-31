import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isFullAdminProfile } from "@/lib/api/admin-authz";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

export type PlatformFullAdminContext = {
  db: Firestore;
  uid: string;
  email?: string;
  decoded: DecodedIdToken;
};

type Options = {
  /** Reject revoked sessions (Firebase Auth). */
  checkRevoked?: boolean;
  /** Require a freshly minted ID token (seconds since `iat`). Use with client `getIdToken(true)`. */
  maxTokenAgeSec?: number;
};

/** Firebase ID token + platform full-admin profile (Admin SDK). */
export async function requirePlatformFullAdmin(
  request: NextRequest,
  opts: Options = {}
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
    const decoded = await auth.verifyIdToken(token, opts.checkRevoked === true);
    if (typeof opts.maxTokenAgeSec === "number" && opts.maxTokenAgeSec > 0) {
      const issuedAt = typeof decoded.iat === "number" ? decoded.iat : 0;
      const ageSec = Math.floor(Date.now() / 1000) - issuedAt;
      if (!issuedAt || ageSec > opts.maxTokenAgeSec) {
        return {
          error: NextResponse.json(
            { ok: false, error: "Refresh your session and try again." },
            { status: 401 }
          )
        };
      }
    }

    const profile = (await db.collection("adminProfiles").doc(decoded.uid).get()).data();
    if (!isFullAdminProfile(profile)) {
      return { error: NextResponse.json({ ok: false, error: "Platform admin access denied." }, { status: 403 }) };
    }
    return {
      db,
      uid: decoded.uid,
      email: typeof decoded.email === "string" ? decoded.email : undefined,
      decoded
    };
  } catch {
    return { error: NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 }) };
  }
}
