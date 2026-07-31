import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/rate-limit";
import { requirePlatformFullAdmin } from "@/lib/api/require-platform-full-admin";
import {
  deleteRatingsApiSecret,
  generateRatingsApiKey,
  loadRatingsApiSecret,
  saveRatingsApiSecret
} from "@/lib/api/ratings-public-api";
import { consumeTotpChallenge, writeRatingsSecurityAudit } from "@/lib/api/ratings-totp";

export const runtime = "nodejs";

async function requireUnlockedAdmin(request: NextRequest, challenge: string, deniedAction: string) {
  const authz = await requirePlatformFullAdmin(request, {
    checkRevoked: true,
    maxTokenAgeSec: 5 * 60
  });
  if ("error" in authz) return authz;

  const okChallenge = await consumeTotpChallenge(authz.db, authz.uid, challenge);
  if (!okChallenge) {
    await writeRatingsSecurityAudit(authz.db, {
      action: deniedAction,
      uid: authz.uid,
      email: authz.email,
      ok: false,
      detail: "missing_or_invalid_challenge"
    });
    return {
      error: NextResponse.json(
        { ok: false, error: "Unlock the API key generator with an authenticator code first." },
        { status: 403 }
      )
    };
  }
  return authz;
}

/** Current key metadata (never returns the full secret again). */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "ratings-api-get", { limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const authz = await requirePlatformFullAdmin(request, { checkRevoked: true });
  if ("error" in authz) return authz.error;

  const secret = await loadRatingsApiSecret(authz.db);
  return NextResponse.json({
    ok: true,
    configured: Boolean(secret),
    keyPrefix: secret?.keyPrefix || "",
    createdAt: secret?.createdAt || "",
    createdByEmail: secret?.createdByEmail || ""
  });
}

/** Generate or rotate the public ratings API key. Requires a one-time TOTP challenge. */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "ratings-api-post", { limit: 8, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  let body: { challenge?: string } = {};
  try {
    body = (await request.json()) as { challenge?: string };
  } catch {
    body = {};
  }

  const challenge = typeof body.challenge === "string" ? body.challenge : "";
  const authz = await requireUnlockedAdmin(request, challenge, "api_key_generate_denied");
  if ("error" in authz) return authz.error;

  const generated = generateRatingsApiKey();
  const createdAt = await saveRatingsApiSecret(authz.db, {
    keyHash: generated.keyHash,
    keyPrefix: generated.keyPrefix,
    createdByUid: authz.uid,
    createdByEmail: authz.email
  });

  await writeRatingsSecurityAudit(authz.db, {
    action: "api_key_generated",
    uid: authz.uid,
    email: authz.email,
    ok: true,
    detail: generated.keyPrefix
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

/** Revoke/delete the public ratings API key. Requires a one-time TOTP challenge. */
export async function DELETE(request: NextRequest) {
  const limited = await rateLimit(request, "ratings-api-delete", { limit: 8, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  let body: { challenge?: string } = {};
  try {
    body = (await request.json()) as { challenge?: string };
  } catch {
    body = {};
  }

  const challenge = typeof body.challenge === "string" ? body.challenge : "";
  const authz = await requireUnlockedAdmin(request, challenge, "api_key_revoke_denied");
  if ("error" in authz) return authz.error;

  const existing = await loadRatingsApiSecret(authz.db);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "No API key is configured." }, { status: 404 });
  }

  const previousPrefix = existing.keyPrefix;
  await deleteRatingsApiSecret(authz.db);

  await writeRatingsSecurityAudit(authz.db, {
    action: "api_key_revoked",
    uid: authz.uid,
    email: authz.email,
    ok: true,
    detail: previousPrefix
  });

  return NextResponse.json({ ok: true, revoked: true });
}
