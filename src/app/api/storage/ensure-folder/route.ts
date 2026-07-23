import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { ensureClientImageFolder, hasCloudflareR2ServerConfig } from "@/lib/storage/cloudflare-r2";
import { isReservedClientSlug, normalizeClientSlug } from "@/lib/tenant";

async function requirePlatformOrTenantAdmin(request: NextRequest, slug: string) {
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
    if (
      platformData?.isAdmin === true &&
      platformData?.disabled !== true &&
      platformData?.role !== "employee"
    ) {
      return { uid: decoded.uid };
    }

    const profile = await db.collection("clients").doc(slug).collection("adminProfiles").doc(decoded.uid).get();
    const data = profile.data();
    if (data && data.disabled !== true && (data.role === "admin" || data.isAdmin === true)) {
      return { uid: decoded.uid };
    }

    return { error: NextResponse.json({ ok: false, error: "Admin access denied." }, { status: 403 }) };
  } catch {
    return { error: NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 }) };
  }
}

/** Creates `clients/{slug}/` in Cloudflare R2 when R2 credentials exist (safe no-op if not). */
export async function POST(request: NextRequest) {
  let slug = "";
  try {
    const body = (await request.json()) as { slug?: unknown };
    slug = typeof body.slug === "string" ? normalizeClientSlug(body.slug) : "";
  } catch {
    slug = "";
  }

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing client slug." }, { status: 400 });
  }
  if (isReservedClientSlug(slug)) {
    return NextResponse.json({ ok: false, error: `Slug "${slug}" is reserved.` }, { status: 400 });
  }

  const auth = await requirePlatformOrTenantAdmin(request, slug);
  if ("error" in auth && auth.error) return auth.error;

  if (!hasCloudflareR2ServerConfig()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Cloudflare R2 is not configured."
    });
  }

  try {
    const result = await ensureClientImageFolder(slug);
    return NextResponse.json({
      ok: true,
      skipped: result.skipped,
      folder: "folder" in result ? result.folder : undefined,
      markerKey: "markerKey" in result ? result.markerKey : undefined,
      reason: "reason" in result ? result.reason : undefined
    });
  } catch (err) {
    console.error("Failed to ensure client image folder", err);
    return NextResponse.json({ ok: false, error: "Could not create client image folder." }, { status: 500 });
  }
}
