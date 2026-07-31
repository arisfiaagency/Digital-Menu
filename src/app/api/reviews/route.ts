import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { rateLimit } from "@/lib/api/rate-limit";
import { normalizeClientSlug } from "@/lib/tenant";

// Public endpoint: a customer submits a rating (+ optional comment/name) from the
// menu page. Writes go through the Admin SDK — not the client — so we can
// atomically update the cafe's rating aggregate on its account doc while keeping
// Firestore rules closed to anonymous writes.
const MAX_COMMENT = 500;
const MAX_NAME = 60;
const MAX_EMAIL = 120;

function normalizeReviewEmail(value: string) {
  const email = value.trim().slice(0, MAX_EMAIL);
  if (!email) return "";
  // Lightweight check — keep optional contact field lenient.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.toLowerCase();
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "reviews", { limit: 8, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  let body: { slug?: unknown; rating?: unknown; comment?: unknown; name?: unknown; email?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? normalizeClientSlug(body.slug) : "";
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, MAX_COMMENT) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
  const emailRaw = typeof body.email === "string" ? body.email : "";
  const email = normalizeReviewEmail(emailRaw);

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing cafe." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "Rating must be 1–5." }, { status: 400 });
  }
  if (email === null) {
    return NextResponse.json({ ok: false, error: "Enter a valid email or leave it blank." }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 503 });
  }

  try {
    const clientRef = db.collection("clients").doc(slug);
    const reviewRef = clientRef.collection("reviews").doc();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(clientRef);
      if (!snap.exists) return { status: 404 as const };
      const data = snap.data() || {};
      if (data.status !== "active" || data.blocked === true) return { status: 403 as const };
      if (data.ratingEnabled === false) return { status: 403 as const };

      const count = (typeof data.ratingCount === "number" ? data.ratingCount : 0) + 1;
      const sum = (typeof data.ratingSum === "number" ? data.ratingSum : 0) + rating;
      const avg = Math.round((sum / count) * 10) / 10;

      tx.set(reviewRef, {
        rating,
        comment: comment || null,
        name: name || null,
        email: email || null,
        at: new Date().toISOString(),
        createdAt: FieldValue.serverTimestamp()
      });
      tx.set(
        clientRef,
        { ratingCount: count, ratingSum: sum, ratingAvg: avg, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return { status: 200 as const, ratingCount: count, ratingAvg: avg };
    });

    if (result.status === 404) {
      return NextResponse.json({ ok: false, error: "Cafe not found." }, { status: 404 });
    }
    if (result.status === 403) {
      return NextResponse.json({ ok: false, error: "This cafe is not accepting reviews." }, { status: 403 });
    }
    return NextResponse.json({ ok: true, ratingCount: result.ratingCount, ratingAvg: result.ratingAvg });
  } catch (err) {
    console.error("Failed to save review", err);
    return NextResponse.json({ ok: false, error: "Could not save your review." }, { status: 500 });
  }
}
