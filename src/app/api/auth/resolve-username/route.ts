import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { rateLimit } from "@/lib/api/rate-limit";
import { normalizeClientSlug } from "@/lib/tenant";

/**
 * Resolves a username to an email for the login form.
 * Username docs are no longer world-readable in Firestore; this rate-limited
 * Admin-SDK endpoint is the only anonymous path.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "resolve-username", { limit: 20, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  let body: { username?: unknown; clientSlug?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const username =
    typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const clientSlug =
    typeof body.clientSlug === "string" ? normalizeClientSlug(body.clientSlug) : "";

  if (!username || username.length < 3 || username.length > 40) {
    return NextResponse.json({ ok: false, error: "Invalid username." }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 503 });
  }

  try {
    const ref = clientSlug
      ? db.collection("clients").doc(clientSlug).collection("usernames").doc(username)
      : db.collection("usernames").doc(username);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    const email = snap.data()?.email;
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error("resolve-username failed", err);
    return NextResponse.json({ ok: false, error: "Lookup failed." }, { status: 500 });
  }
}
