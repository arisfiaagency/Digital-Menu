import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { authorizeStorageWrite } from "@/lib/api/admin-authz";
import { hasCloudflareR2ServerConfig, putR2Object } from "@/lib/storage/cloudflare-r2";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  isVideoContentType,
  maxBytesForContentType
} from "@/lib/storage/image-utils";
import { slugifyImageFileBase } from "@/lib/storage/paths";

export const runtime = "nodejs";

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
    return authorizeStorageWrite(db, decoded, folder);
  } catch {
    return { error: NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 }) };
  }
}

/**
 * Same-origin image upload → Cloudflare R2.
 * Avoids browser CORS against *.r2.cloudflarestorage.com.
 */
export async function POST(request: NextRequest) {
  if (!hasCloudflareR2ServerConfig()) {
    return NextResponse.json({ ok: false, error: "Cloudflare R2 is not configured." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid multipart body." }, { status: 400 });
  }

  const folderRaw = form.get("folder");
  const extensionRaw = form.get("extension");
  const fileNameRaw = form.get("fileName");
  const file = form.get("file");

  const folder = typeof folderRaw === "string" ? folderRaw.replace(/^\/+|\/+$/g, "") : "";
  const extension =
    typeof extensionRaw === "string"
      ? extensionRaw.replace(/[^a-z0-9]/gi, "").toLowerCase()
      : "webp";
  const fileNameHint = typeof fileNameRaw === "string" ? fileNameRaw : "";

  if (!folder) {
    return NextResponse.json({ ok: false, error: "Missing upload folder." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing image file." }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ ok: false, error: "Unsupported image type." }, { status: 400 });
  }
  if (file.size > maxBytesForContentType(contentType)) {
    return NextResponse.json(
      {
        ok: false,
        error: isVideoContentType(contentType)
          ? "Videos must be 30 MB or smaller."
          : "Images must be 10 MB or smaller."
      },
      { status: 400 }
    );
  }

  const auth = await requireUploader(request, folder);
  if ("error" in auth && auth.error) return auth.error;

  // Prefer a readable name from the menu item (espresso.webp). Fall back to UUID only if missing.
  const base = slugifyImageFileBase(fileNameHint, "");
  const objectKey = base
    ? `${folder}/${base}.${extension || "webp"}`
    : `${folder}/${crypto.randomUUID()}.${extension || "webp"}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const stored = await putR2Object({ objectKey, body: bytes, contentType });
    // Named files are overwritten on re-upload — bust CDN/browser cache with a version query.
    const imageUrl = base ? `${stored.imageUrl}?v=${Date.now()}` : stored.imageUrl;
    return NextResponse.json({ ok: true, ...stored, imageUrl });
  } catch (err) {
    console.error("R2 upload failed", err);
    return NextResponse.json({ ok: false, error: "Image upload to Cloudflare R2 failed." }, { status: 500 });
  }
}
