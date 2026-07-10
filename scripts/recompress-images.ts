/**
 * One-time migration: shrink existing menu-item photos already stored in Supabase.
 *
 * For every menu item whose image lives in the Supabase `menu-images` bucket, this downloads the
 * current file, downscales it to <=1600px and re-encodes it as WebP (same settings the upload form
 * now uses), uploads the smaller copy, points the Firestore doc at it, and deletes the old object.
 * Animated GIFs are skipped (a static re-encode would kill the animation). Files that wouldn't get
 * smaller are left as-is.
 *
 * Safe by default: it only PRINTS what it would do. Add `--apply` to actually write.
 *
 *   npm run recompress-images            # dry run (preview)
 *   npm run recompress-images -- --apply # perform the migration
 *
 * Needs these in .env.local (same ones the app/seed use):
 *   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL, (optional NEXT_PUBLIC_SUPABASE_BUCKET)
 *   SUPABASE_SERVICE_ROLE_KEY  (falls back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import sharp from "sharp";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;
const APPLY = process.argv.includes("--apply");

/** Populate process.env from .env.local for any key not already set (no dotenv dependency). */
function loadEnvLocal() {
  let content: string;
  try {
    content = readFileSync(`${process.cwd()}/.env.local`, "utf8");
  } catch {
    return;
  }
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function formatKb(bytes: number) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function main() {
  loadEnvLocal();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars (FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY).");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "menu-images";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore();

  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;

  console.log(APPLY ? "APPLY MODE — writing changes.\n" : "DRY RUN — nothing will be written. Re-run with --apply to migrate.\n");

  const snapshot = await db.collection("menuItems").get();
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let savedBytes = 0;

  for (const doc of snapshot.docs) {
    const item = doc.data() as { name?: { en?: string }; imageUrl?: string; imagePath?: string };
    const label = item.name?.en || doc.id;
    const imageUrl = item.imageUrl || "";
    const imagePath = item.imagePath || "";

    if (!imageUrl || !imagePath || !imageUrl.startsWith(publicPrefix)) {
      skipped++;
      continue;
    }
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`download ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      const isGif = /\.gif($|\?)/i.test(imagePath) || /\.gif($|\?)/i.test(imageUrl) || contentType.includes("gif");
      const originalBuffer = Buffer.from(await response.arrayBuffer());

      // GIFs are read with every frame ({ animate: true }) and written as animated WebP so the
      // animation is preserved — animated WebP plays in a plain <img> and is far smaller than a GIF.
      // (Skip .rotate() for animated: EXIF orientation doesn't apply to GIFs.)
      const pipeline = isGif ? sharp(originalBuffer, { animated: true }) : sharp(originalBuffer).rotate();
      const webpBuffer = await pipeline
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .webp(isGif ? { quality: 65, effort: 4 } : { quality: WEBP_QUALITY })
        .toBuffer();

      if (webpBuffer.length >= originalBuffer.length) {
        console.log(`• skip (no gain)    ${label}  (${formatKb(originalBuffer.length)})`);
        skipped++;
        continue;
      }

      const folder = imagePath.replace(`${bucket}/`, "").split("/").slice(0, -1).join("/") || `menu-items/${doc.id}`;
      const objectKey = `${folder}/${randomUUID()}.webp`;
      const newImagePath = `${bucket}/${objectKey}`;
      const newImageUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectKey}`;

      const saving = originalBuffer.length - webpBuffer.length;
      console.log(
        `${APPLY ? "✓" : "→"} ${label}  ${formatKb(originalBuffer.length)} → ${formatKb(webpBuffer.length)} ` +
          `(-${Math.round((saving / originalBuffer.length) * 100)}%)`
      );

      if (APPLY) {
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectKey}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            "content-type": "image/webp",
            "cache-control": "31536000",
            "x-upsert": "true"
          },
          body: new Uint8Array(webpBuffer)
        });
        if (!uploadResponse.ok) throw new Error(`upload ${uploadResponse.status}: ${await uploadResponse.text()}`);

        await doc.ref.update({ imageUrl: newImageUrl, imagePath: newImagePath, updatedAt: FieldValue.serverTimestamp() });

        // Delete the old object last, best-effort — the doc already points at the new one.
        const deleteResponse = await fetch(`${supabaseUrl}/storage/v1/object/${imagePath}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey }
        });
        if (!deleteResponse.ok) {
          console.log(`    (kept old file — delete returned ${deleteResponse.status})`);
        }
      }

      processed++;
      savedBytes += saving;
    } catch (error) {
      failed++;
      console.log(`✗ FAILED            ${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(
    `\nDone. ${APPLY ? "Migrated" : "Would migrate"} ${processed} image(s), skipped ${skipped}, failed ${failed}. ` +
      `${APPLY ? "Saved" : "Would save"} ~${formatKb(savedBytes)}.`
  );
  if (!APPLY && processed > 0) console.log("Re-run with `-- --apply` to perform the migration.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
