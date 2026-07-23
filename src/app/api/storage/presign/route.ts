import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  createR2PresignedUpload,
  hasCloudflareR2ServerConfig
} from "@/lib/storage/cloudflare-r2";
import { ALLOWED_IMAGE_CONTENT_TYPES } from "@/lib/storage/image-utils";
import { normalizeClientSlug } from "@/lib/tenant";

async function requireUploader(request: NextRequest, folder: string) {
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

    const match = folder.match(/^clients\/([^/]+)/);
    const slug = match ? normalizeClientSlug(match[1]) : "";
    if (!slug || slug !== match?.[1]) {
      return {
        error: NextResponse.json({ ok: false, error: "Uploads must use a clients/{slug}/ folder." }, { status: 400 })
      };
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
  if (!hasCloudflareR2ServerConfig()) {
    return NextResponse.json({ ok: false, error: "Cloudflare R2 is not configured." }, { status: 503 });
  }

  let body: { folder?: unknown; contentType?: unknown; extension?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const folder = typeof body.folder === "string" ? body.folder.replace(/^\/+|\/+$/g, "") : "";
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const extension =
    typeof body.extension === "string"
      ? body.extension.replace(/[^a-z0-9]/gi, "").toLowerCase()
      : "webp";

  if (!folder) {
    return NextResponse.json({ ok: false, error: "Missing upload folder." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ ok: false, error: "Unsupported image type." }, { status: 400 });
  }

  const auth = await requireUploader(request, folder);
  if ("error" in auth && auth.error) return auth.error;

  const objectKey = `${folder}/${crypto.randomUUID()}.${extension || "webp"}`;

  try {
    const signed = await createR2PresignedUpload({ objectKey, contentType });
    return NextResponse.json({ ok: true, ...signed });
  } catch (err) {
    console.error("R2 presign failed", err);
    return NextResponse.json({ ok: false, error: "Could not create upload URL." }, { status: 500 });
  }
}
