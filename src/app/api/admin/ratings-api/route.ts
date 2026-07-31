import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { isFullAdminProfile } from "@/lib/api/admin-authz";
import {
  generateRatingsApiKey,
  loadRatingsApiSecret,
  saveRatingsApiSecret
} from "@/lib/api/ratings-public-api";

export const runtime = "nodejs";

async function requirePlatformFullAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) return { error: NextResponse.json({ ok: false, error: "Missing token." }, { status: 401 }) };

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

/** Current key metadata (never returns the full secret again). */
export async function GET(request: NextRequest) {
  const authz = await requirePlatformFullAdmin(request);
  if ("error" in authz && authz.error) return authz.error;

  const secret = await loadRatingsApiSecret(authz.db);
  return NextResponse.json({
    ok: true,
    configured: Boolean(secret),
    keyPrefix: secret?.keyPrefix || "",
    createdAt: secret?.createdAt || "",
    createdByEmail: secret?.createdByEmail || ""
  });
}

/** Generate or rotate the public ratings API key. Returns the raw key once. */
export async function POST(request: NextRequest) {
  const authz = await requirePlatformFullAdmin(request);
  if ("error" in authz && authz.error) return authz.error;

  const generated = generateRatingsApiKey();
  const createdAt = await saveRatingsApiSecret(authz.db, {
    keyHash: generated.keyHash,
    keyPrefix: generated.keyPrefix,
    createdByUid: authz.uid,
    createdByEmail: authz.email
  });

  return NextResponse.json({
    ok: true,
    apiKey: generated.apiKey,
    keyPrefix: generated.keyPrefix,
    createdAt,
    endpoints: {
      list: "/api/v1/ratings",
      cafe: "/api/v1/ratings/{slug}"
    }
  });
}
