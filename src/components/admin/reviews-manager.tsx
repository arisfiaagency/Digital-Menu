"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLocale } from "@/components/admin/admin-preferences";
import { listReviews } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils/cn";
import type { Review } from "@/types/models";

// The cafe admin's Reviews tab: the average, a star breakdown, and every rating
// customers left from the public menu (newest first). Read-only.
export function ReviewsManager() {
  const { text, dir, locale } = useAdminLocale();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let active = true;
    listReviews()
      .then((list) => {
        if (active) setReviews(list);
      })
      .catch(() => {
        if (active) setReviews([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const list = reviews ?? [];
    const count = list.length;
    const sum = list.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = count ? sum / count : 0;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      n: list.filter((r) => Math.round(r.rating) === star).length
    }));
    return { count, avg, dist };
  }, [reviews]);

  const loading = reviews === null;

  return (
    <div dir={dir} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{text.reviews}</h1>
        <p className="text-muted-foreground">{text.reviewsDesc}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : stats.count === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">{text.reviewsNone}</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-6 pt-6 sm:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center justify-center gap-1 sm:border-e sm:pe-6">
                <span className="text-4xl font-bold tabular-nums">{stats.avg.toFixed(1)}</span>
                <Stars value={stats.avg} />
                <span className="text-sm text-muted-foreground">
                  {stats.count} {text.reviewsTotalWord}
                </span>
              </div>
              <div className="space-y-1.5">
                {stats.dist.map(({ star, n }) => (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-end tabular-nums">{star}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: stats.count ? `${(n / stats.count) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="w-8 text-end tabular-nums text-muted-foreground">{n}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {(reviews ?? []).map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-2 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={review.rating} />
                    <span className="text-xs text-muted-foreground">{formatDate(review.at, locale)}</span>
                  </div>
                  {review.comment ? <p className="text-sm text-foreground">{review.comment}</p> : null}
                  <p className="text-xs font-medium text-muted-foreground">
                    {review.name?.trim() || text.reviewsAnonymous}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex gap-0.5" aria-label={value.toFixed(1)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-4 w-4", n <= rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
          aria-hidden
        />
      ))}
    </div>
  );
}

function formatDate(iso: string | undefined, locale: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
}
