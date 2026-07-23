/**
 * Shrink existing menu-item photos already stored in Cloudflare R2 (or any public imageUrl).
 *
 * Downloads each item image, downscales to <=1600px / WebP, uploads the smaller copy to R2,
 * updates Firestore, and deletes the old R2 object when the path is `r2/…`.
 *
 * Safe by default: only PRINTS what it would do. Add `--apply` to write.
 *
 *   npm run recompress-images
 *   npm run recompress-images -- --apply
 *
 * Needs Firebase Admin + Cloudflare R2 env vars in .env.local.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;
const APPLY = process.argv.includes("--apply");

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

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing Cloudflare R2 credentials.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });
}

async function main() {
  loadEnvLocal();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars.");
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET || "digital-menu";
  const publicBase = (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (!publicBase) throw new Error("Missing NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL.");

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore();
  const r2 = getR2Client();

  console.log(APPLY ? "APPLY MODE — writing changes.\n" : "DRY RUN — nothing will be written. Re-run with --apply to migrate.\n");

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let savedBytes = 0;

  type ItemDoc = { ref: DocumentReference; id: string; data: () => Record<string, unknown>; labelPrefix: string; clientSlug?: string };

  const itemDocs: ItemDoc[] = [];
  const clients = await db.collection("clients").get();
  for (const client of clients.docs) {
    const snapshot = await client.ref.collection("menuItems").get();
    for (const doc of snapshot.docs) {
      itemDocs.push({
        ref: doc.ref,
        id: doc.id,
        data: () => doc.data(),
        labelPrefix: `${client.id}/`,
        clientSlug: client.id
      });
    }
  }

  const { removeR2Object } = await import("../src/lib/storage/cloudflare-r2");

  for (const doc of itemDocs) {
    const item = doc.data() as { name?: { en?: string }; imageUrl?: string; imagePath?: string };
    const label = `${doc.labelPrefix}${item.name?.en || doc.id}`;
    const imageUrl = item.imageUrl || "";
    const imagePath = item.imagePath || "";

    if (!imageUrl) {
      skipped++;
      continue;
    }
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`download ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      const isGif = /\.gif($|\?)/i.test(imagePath) || /\.gif($|\?)/i.test(imageUrl) || contentType.includes("gif");
      const originalBuffer = Buffer.from(await response.arrayBuffer());

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

      const slug = doc.clientSlug || "unknown";
      const objectKey = `clients/${slug}/menu-items/${doc.id}/${randomUUID()}.webp`;
      const newImagePath = `r2/${objectKey}`;
      const newImageUrl = `${publicBase}/${objectKey}`;

      const saving = originalBuffer.length - webpBuffer.length;
      console.log(
        `${APPLY ? "✓" : "→"} ${label}  ${formatKb(originalBuffer.length)} → ${formatKb(webpBuffer.length)} ` +
          `(-${Math.round((saving / originalBuffer.length) * 100)}%)`
      );

      if (APPLY) {
        await r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: webpBuffer,
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000, immutable"
          })
        );
        await doc.ref.update({
          imageUrl: newImageUrl,
          imagePath: newImagePath,
          updatedAt: FieldValue.serverTimestamp()
        });
        if (imagePath.startsWith("r2/")) {
          const del = await removeR2Object(imagePath);
          if (!del.ok && !del.skipped) {
            console.log(`    (kept old file — delete failed: ${del.error || "unknown"})`);
          }
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
