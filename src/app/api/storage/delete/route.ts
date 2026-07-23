import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { removeR2Object } from "@/lib/storage/cloudflare-r2";
import { isCloudflareR2Path, stripR2PathPrefix } from "@/lib/storage/provider";
import { normalizeClientSlug } from "@/lib/tenant";

async function requireDeleter(request: NextRequest, imagePath: string) {
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
    if (decoded.admin === true) return { uid: decoded.uid };

    const platform = await db.collection("adminProfiles").doc(decoded.uid).get();
    const platformData = platform.data();
    if (platformData?.isAdmin === true && platformData?.disabled !== true) {
      return { uid: decoded.uid };
    }

    const objectKey = stripR2PathPrefix(imagePath);
    const match = objectKey.match(/^clients\/([^/]+)/);
    const slug = match ? normalizeClientSlug(match[1]) : "";
    if (!slug || slug !== match?.[1]) {
      return { error: NextResponse.json({ ok: false, error: "Invalid image path." }, { status: 400 }) };
    }

    const profile = await db.collection("clients").doc(slug).collection("adminProfiles").doc(decoded.uid).get();
    const data = profile.data();
    if (data && data.disabled !== true) return { uid: decoded.uid };

    return { error: NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 }) };
  } catch {
    return { error: NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 }) };
  }
}

export async function POST(request: NextRequest) {
  let path = "";
  try {
    const body = (await request.json()) as { path?: unknown };
    path = typeof body.path === "string" ? body.path : "";
  } catch {
    path = "";
  }

  if (!path) {
    return NextResponse.json({ ok: false, error: "Missing image path." }, { status: 400 });
  }
  if (!isCloudflareR2Path(path)) {
    return NextResponse.json({ ok: false, error: "Not a Cloudflare R2 image path." }, { status: 400 });
  }

  const auth = await requireDeleter(request, path);
  if ("error" in auth && auth.error) return auth.error;

  const result = await removeR2Object(path);
  if (!result.ok && !result.skipped) {
    return NextResponse.json({ ok: false, error: result.error || "Image delete failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
