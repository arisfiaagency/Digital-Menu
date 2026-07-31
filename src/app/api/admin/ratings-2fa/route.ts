import { NextRequest, NextResponse } from "next/server";
import { requirePlatformFullAdmin } from "@/lib/api/require-platform-full-admin";
import {
  buildAuthenticatorQr,
  enableRatingsTotp,
  ensureRatingsTotpSecret,
  issueTotpChallenge,
  loadRatingsTotp,
  verifyRatingsTotpCode
} from "@/lib/api/ratings-totp";

export const runtime = "nodejs";

/** QR + setup status for authenticator app (secrets only via Admin SDK). */
export async function GET(request: NextRequest) {
  const authz = await requirePlatformFullAdmin(request);
  if ("error" in authz) return authz.error;

  const record = await ensureRatingsTotpSecret(authz.db, authz.uid);
  const qr = await buildAuthenticatorQr(authz.email, record.secret);

  return NextResponse.json({
    ok: true,
    enabled: record.enabled,
    qrDataUrl: qr.qrDataUrl,
    secret: qr.secret,
    otpauthUrl: qr.otpauthUrl
  });
}

/**
 * Body: `{ action: "confirm" | "verify", code: "123456" }`
 * - confirm: first-time enable after scanning QR
 * - verify: check code when already enabled
 */
export async function POST(request: NextRequest) {
  const authz = await requirePlatformFullAdmin(request);
  if ("error" in authz) return authz.error;

  let body: { action?: string; code?: string } = {};
  try {
    body = (await request.json()) as { action?: string; code?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action === "confirm" || body.action === "verify" ? body.action : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!action) {
    return NextResponse.json({ ok: false, error: "action must be confirm or verify." }, { status: 400 });
  }

  const record = await loadRatingsTotp(authz.db, authz.uid);
  if (!record) {
    return NextResponse.json({ ok: false, error: "2FA is not set up. Reload and scan the QR code." }, { status: 400 });
  }

  if (!verifyRatingsTotpCode(record.secret, code)) {
    return NextResponse.json({ ok: false, error: "Invalid authenticator code." }, { status: 401 });
  }

  if (action === "confirm") {
    if (!record.enabled) {
      await enableRatingsTotp(authz.db, authz.uid, record.secret);
    }
  } else if (!record.enabled) {
    return NextResponse.json(
      { ok: false, error: "Confirm setup with a code from your authenticator first." },
      { status: 400 }
    );
  }

  const challenge = await issueTotpChallenge(authz.db, authz.uid);
  return NextResponse.json({ ok: true, enabled: true, verified: true, challenge });
}
