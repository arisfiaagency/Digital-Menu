import { NextRequest, NextResponse } from "next/server";
import { requirePlatformFullAdmin } from "@/lib/api/require-platform-full-admin";
import {
  generateRatingsApiKey,
  loadRatingsApiSecret,
  saveRatingsApiSecret
} from "@/lib/api/ratings-public-api";
import { assertTotpChallenge, clearTotpChallenge } from "@/lib/api/ratings-totp";

export const runtime = "nodejs";

/** Current key metadata (never returns the full secret again). */
export async function GET(request: NextRequest) {
  const authz = await requirePlatformFullAdmin(request);
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

/** Generate or rotate the public ratings API key. Requires a valid TOTP code. */
export async function POST(request: NextRequest) {
  const authz = await requirePlatformFullAdmin(request);
  if ("error" in authz) return authz.error;

  let body: { challenge?: string } = {};
  try {
    body = (await request.json()) as { challenge?: string };
  } catch {
    body = {};
  }

  const challenge = typeof body.challenge === "string" ? body.challenge : "";
  const okChallenge = await assertTotpChallenge(authz.db, authz.uid, challenge);
  if (!okChallenge) {
    return NextResponse.json(
      { ok: false, error: "Unlock the API key generator with an authenticator code first." },
      { status: 403 }
    );
  }

  const generated = generateRatingsApiKey();
  const createdAt = await saveRatingsApiSecret(authz.db, {
    keyHash: generated.keyHash,
    keyPrefix: generated.keyPrefix,
    createdByUid: authz.uid,
    createdByEmail: authz.email
  });
  await clearTotpChallenge(authz.db, authz.uid);

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
