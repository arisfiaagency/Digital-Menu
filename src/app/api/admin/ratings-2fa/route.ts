import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/rate-limit";
import { requirePlatformFullAdmin } from "@/lib/api/require-platform-full-admin";
import {
  buildAuthenticatorQr,
  clearTotpFailures,
  enableRatingsTotp,
  ensureRatingsTotpSecret,
  getTotpLockStatus,
  issueTotpChallenge,
  loadRatingsTotp,
  recordTotpFailure,
  resetRatingsTotpSecret,
  verifyRatingsTotpCode,
  writeRatingsSecurityAudit
} from "@/lib/api/ratings-totp";

export const runtime = "nodejs";

/** Setup status. QR/secret only when not yet confirmed (first setup or after reset). */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "ratings-2fa-get", { limit: 30, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const authz = await requirePlatformFullAdmin(request, { checkRevoked: true });
  if ("error" in authz) return authz.error;

  const record = await ensureRatingsTotpSecret(authz.db, authz.uid);

  if (record.enabled) {
    return NextResponse.json({ ok: true, enabled: true });
  }

  const qr = await buildAuthenticatorQr(authz.email, record.secret);
  return NextResponse.json({
    ok: true,
    enabled: false,
    qrDataUrl: qr.qrDataUrl,
    secret: qr.secret,
    otpauthUrl: qr.otpauthUrl
  });
}

/**
 * Body: `{ action: "confirm" | "verify" | "reset", code?: "123456" }`
 * - confirm: first-time enable after scanning QR
 * - verify: check code when already enabled
 * - reset: mint a new secret + QR (requires current code when already enabled)
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "ratings-2fa-post", { limit: 20, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  const authz = await requirePlatformFullAdmin(request, {
    checkRevoked: true,
    maxTokenAgeSec: 5 * 60
  });
  if ("error" in authz) return authz.error;

  let body: { action?: string; code?: string } = {};
  try {
    body = (await request.json()) as { action?: string; code?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const action =
    body.action === "confirm" || body.action === "verify" || body.action === "reset" ? body.action : "";
  if (!action) {
    return NextResponse.json({ ok: false, error: "action must be confirm, verify, or reset." }, { status: 400 });
  }

  const lock = await getTotpLockStatus(authz.db, authz.uid);
  if (lock.locked) {
    return NextResponse.json(
      { ok: false, error: "Too many failed codes. Try again later." },
      { status: 429, headers: { "Retry-After": String(lock.retryAfterSec) } }
    );
  }

  if (action === "reset") {
    const existing = await loadRatingsTotp(authz.db, authz.uid);
    if (existing?.enabled) {
      const code = typeof body.code === "string" ? body.code : "";
      if (!verifyRatingsTotpCode(existing.secret, code)) {
        const fail = await recordTotpFailure(authz.db, authz.uid);
        await writeRatingsSecurityAudit(authz.db, {
          action: "totp_reset_failed",
          uid: authz.uid,
          email: authz.email,
          ok: false,
          detail: "invalid_code"
        });
        if (fail.locked) {
          return NextResponse.json(
            { ok: false, error: "Too many failed codes. Try again later." },
            { status: 429, headers: { "Retry-After": String(fail.retryAfterSec) } }
          );
        }
        return NextResponse.json({ ok: false, error: "Invalid authenticator code." }, { status: 401 });
      }
    }

    const record = await resetRatingsTotpSecret(authz.db, authz.uid);
    const qr = await buildAuthenticatorQr(authz.email, record.secret);
    await writeRatingsSecurityAudit(authz.db, {
      action: "totp_reset",
      uid: authz.uid,
      email: authz.email,
      ok: true
    });
    return NextResponse.json({
      ok: true,
      enabled: false,
      qrDataUrl: qr.qrDataUrl,
      secret: qr.secret,
      otpauthUrl: qr.otpauthUrl
    });
  }

  const code = typeof body.code === "string" ? body.code : "";
  const record = await loadRatingsTotp(authz.db, authz.uid);
  if (!record) {
    return NextResponse.json({ ok: false, error: "2FA is not set up. Reload and scan the QR code." }, { status: 400 });
  }

  if (!verifyRatingsTotpCode(record.secret, code)) {
    const fail = await recordTotpFailure(authz.db, authz.uid);
    await writeRatingsSecurityAudit(authz.db, {
      action: action === "confirm" ? "totp_confirm_failed" : "totp_verify_failed",
      uid: authz.uid,
      email: authz.email,
      ok: false,
      detail: "invalid_code"
    });
    if (fail.locked) {
      return NextResponse.json(
        { ok: false, error: "Too many failed codes. Try again later." },
        { status: 429, headers: { "Retry-After": String(fail.retryAfterSec) } }
      );
    }
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

  await clearTotpFailures(authz.db, authz.uid);
  const challenge = await issueTotpChallenge(authz.db, authz.uid);
  await writeRatingsSecurityAudit(authz.db, {
    action: action === "confirm" ? "totp_confirm" : "totp_verify",
    uid: authz.uid,
    email: authz.email,
    ok: true
  });
  return NextResponse.json({ ok: true, enabled: true, verified: true, challenge });
}
