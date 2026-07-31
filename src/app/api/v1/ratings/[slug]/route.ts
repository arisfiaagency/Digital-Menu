import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { rateLimit } from "@/lib/api/rate-limit";
import { assertRatingsApiKey } from "@/lib/api/ratings-public-api";
import { normalizeClientSlug } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * Public reviews for one cafe.
 * Auth: `Authorization: Bearer <apiKey>` or `X-Api-Key: <apiKey>`
 * Emails are omitted — only safe public fields are returned.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimit(request, "ratings-api-cafe", { limit: 60, windowMs: 60 * 1000 });
  if (limited) return limited;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 503 });
  }

  const authz = await assertRatingsApiKey(db, request);
  if (!authz.ok) {
    return NextResponse.json({ ok: false, error: authz.error }, { status: authz.status });
  }

  const { slug: raw } = await context.params;
  const slug = normalizeClientSlug(raw || "");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing cafe slug." }, { status: 400 });
  }

  const clientSnap = await db.collection("clients").doc(slug).get();
  if (!clientSnap.exists) {
    return NextResponse.json({ ok: false, error: "Cafe not found." }, { status: 404 });
  }

  const data = clientSnap.data() || {};
  if (data.status !== "active" || data.blocked === true || data.ratingEnabled === false) {
    return NextResponse.json({ ok: false, error: "Cafe ratings are not available." }, { status: 403 });
  }

  const reviewsSnap = await db
    .collection("clients")
    .doc(slug)
    .collection("reviews")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const reviews = reviewsSnap.docs.map((doc) => {
    const review = doc.data() || {};
    return {
      id: doc.id,
      rating: typeof review.rating === "number" ? review.rating : 0,
      comment: typeof review.comment === "string" ? review.comment : "",
      name: typeof review.name === "string" ? review.name : "",
      at: typeof review.at === "string" ? review.at : ""
    };
  });

  return NextResponse.json({
    ok: true,
    cafe: {
      slug,
      name: typeof data.name === "string" ? data.name : slug,
      ratingAvg: typeof data.ratingAvg === "number" ? data.ratingAvg : 0,
      ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0
    },
    count: reviews.length,
    reviews
  });
}
