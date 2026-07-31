import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { rateLimit } from "@/lib/api/rate-limit";
import { assertRatingsApiKey } from "@/lib/api/ratings-public-api";

export const runtime = "nodejs";

/**
 * Public ratings catalog for future apps.
 * Auth: `Authorization: Bearer <apiKey>` or `X-Api-Key: <apiKey>`
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "ratings-api-list", { limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 503 });
  }

  const authz = await assertRatingsApiKey(db, request);
  if (!authz.ok) {
    return NextResponse.json({ ok: false, error: authz.error }, { status: authz.status });
  }

  const snap = await db.collection("clients").limit(500).get();
  const cafes = snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      const slug = typeof data.slug === "string" && data.slug ? data.slug : doc.id;
      return {
        slug,
        name: typeof data.name === "string" ? data.name : slug,
        status: data.status === "active" ? "active" : "inactive",
        blocked: data.blocked === true,
        ratingEnabled: data.ratingEnabled !== false,
        ratingAvg: typeof data.ratingAvg === "number" ? data.ratingAvg : 0,
        ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0
      };
    })
    .filter((cafe) => cafe.status === "active" && !cafe.blocked && cafe.ratingEnabled)
    .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount || a.name.localeCompare(b.name));

  return NextResponse.json({
    ok: true,
    count: cafes.length,
    cafes
  });
}
