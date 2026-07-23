import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { clientImageFolder, clientImageFolderMarkerKey } from "@/lib/storage/paths";

function r2AccountId() {
  return process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim() || "";
}

function r2AccessKeyId() {
  return process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() || "";
}

function r2SecretAccessKey() {
  return process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() || "";
}

export function r2Bucket() {
  return process.env.CLOUDFLARE_R2_BUCKET?.trim() || "digital-menu";
}

/** Public base URL for objects (custom domain or r2.dev public bucket URL). No trailing slash. */
export function r2PublicBaseUrl() {
  return (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/+$/, "");
}

export function hasCloudflareR2Config() {
  return Boolean(r2AccountId() && r2AccessKeyId() && r2SecretAccessKey() && r2PublicBaseUrl());
}

/** Server-only: credentials must exist to create/sign/delete. */
export function hasCloudflareR2ServerConfig() {
  return hasCloudflareR2Config();
}

function getR2Client() {
  if (!hasCloudflareR2ServerConfig()) {
    throw new Error("Cloudflare R2 is not configured.");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId(),
      secretAccessKey: r2SecretAccessKey()
    },
    // AWS SDK v3 otherwise signs checksum headers the browser never sends → 403 on PUT.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
  });
}

export function r2PublicUrlForKey(objectKey: string) {
  const base = r2PublicBaseUrl();
  if (!base) throw new Error("NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL is not configured.");
  return `${base}/${objectKey.replace(/^\/+/, "")}`;
}

/** Stored in Firestore as `r2/{objectKey}`. */
export function toR2ImagePath(objectKey: string) {
  return `r2/${objectKey.replace(/^\/+/, "")}`;
}

/**
 * Creates `clients/{slug}/.keep` so each cafe has its own image folder as soon as the client is created.
 * Safe to call repeatedly (upsert).
 */
export async function ensureClientImageFolder(slug: string) {
  if (!hasCloudflareR2ServerConfig()) {
    return { ok: false as const, skipped: true as const, reason: "Cloudflare R2 is not configured." };
  }
  const key = clientImageFolderMarkerKey(slug);
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: new Uint8Array(0),
      ContentType: "application/octet-stream",
      CacheControl: "no-store"
    })
  );
  return { ok: true as const, skipped: false as const, folder: clientImageFolder(slug), markerKey: key };
}

/** Server-side put (same-origin upload API — avoids browser → R2 CORS). */
export async function putR2Object(input: {
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: input.objectKey,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );
  return {
    objectKey: input.objectKey,
    imagePath: toR2ImagePath(input.objectKey),
    imageUrl: r2PublicUrlForKey(input.objectKey)
  };
}

export async function createR2PresignedUpload(input: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const client = getR2Client();
  // Only ContentType is signed — client must send the same Content-Type header.
  // Do not sign CacheControl: browsers often omit it and R2 returns 403.
  const command = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: input.objectKey,
    ContentType: input.contentType
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: input.expiresInSeconds ?? 60 * 10
  });
  return {
    uploadUrl,
    objectKey: input.objectKey,
    imagePath: toR2ImagePath(input.objectKey),
    imageUrl: r2PublicUrlForKey(input.objectKey)
  };
}

/** Allow browser PUT uploads from the admin site (optional; same-origin API is preferred). */
export async function ensureR2Cors(origins: string[]) {
  const client = getR2Client();
  const allowed = [...new Set(origins.map((o) => o.replace(/\/+$/, "")).filter(Boolean))];
  if (!allowed.length) throw new Error("At least one CORS origin is required.");
  await client.send(
    new PutBucketCorsCommand({
      Bucket: r2Bucket(),
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: allowed,
            AllowedMethods: ["GET", "PUT", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "Content-Type"],
            MaxAgeSeconds: 3600
          }
        ]
      }
    })
  );
  return { ok: true as const, origins: allowed };
}

export async function removeR2Object(imagePathOrKey?: string) {
  if (!imagePathOrKey) return { ok: false as const, skipped: true as const };
  if (!hasCloudflareR2ServerConfig()) return { ok: false as const, skipped: true as const };

  const objectKey = imagePathOrKey.startsWith("r2/") ? imagePathOrKey.slice(3) : imagePathOrKey;
  const client = getR2Client();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: objectKey }));
    return { ok: true as const, skipped: false as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image delete failed.";
    return { ok: false as const, skipped: false as const, error: message, status: undefined as number | undefined };
  }
}

/** Deletes every object under `clients/{slug}/` (used when removing a cafe). */
export async function deleteClientImageFolder(slug: string) {
  if (!hasCloudflareR2ServerConfig()) {
    return { ok: false as const, skipped: true as const, deleted: 0 };
  }
  const prefix = `${clientImageFolder(slug)}/`;
  const client = getR2Client();
  let deleted = 0;
  let continuationToken: string | undefined;

  for (;;) {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    );
    const keys = (listed.Contents || []).map((entry) => entry.Key).filter((key): key is string => Boolean(key));
    if (keys.length) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: r2Bucket(),
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true }
        })
      );
      deleted += keys.length;
    }
    if (!listed.IsTruncated) break;
    continuationToken = listed.NextContinuationToken;
  }

  return { ok: true as const, skipped: false as const, deleted };
}
