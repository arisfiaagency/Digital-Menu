"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, ChevronRight, Search, Star } from "lucide-react";
import { useAdminLocale } from "@/components/admin/admin-preferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listClientReviews, listClients } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils/cn";
import type { ClientAccount, Review } from "@/types/models";

/** Platform supervisor: all cafes’ rating averages, drill into each cafe’s reviews. */
export function SupervisorRatings() {
  const { text, dir, locale } = useAdminLocale();
  const [clients, setClients] = useState<ClientAccount[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClientAccount | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewsError, setReviewsError] = useState("");

  useEffect(() => {
    let active = true;
    listClients()
      .then((list) => {
        if (active) setClients(list);
      })
      .catch(() => {
        if (active) setClients([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setReviews(null);
      setReviewsError("");
      return;
    }
    let active = true;
    setReviews(null);
    setReviewsError("");
    listClientReviews(selected.slug)
      .then((list) => {
        if (active) setReviews(list);
      })
      .catch((err) => {
        if (active) {
          setReviews([]);
          setReviewsError(err instanceof Error ? err.message : text.supervisorRatingsLoadFailed);
        }
      });
    return () => {
      active = false;
    };
  }, [selected, text.supervisorRatingsLoadFailed]);

  const ranked = useMemo(() => {
    const list = clients ?? [];
    const filtered = query.trim()
      ? list.filter((client) => {
          const hay = `${client.name} ${client.slug}`.toLowerCase();
          return hay.includes(query.trim().toLowerCase());
        })
      : list;
    return [...filtered].sort((a, b) => {
      const avgDiff = (b.ratingAvg || 0) - (a.ratingAvg || 0);
      if (avgDiff !== 0) return avgDiff;
      const countDiff = (b.ratingCount || 0) - (a.ratingCount || 0);
      if (countDiff !== 0) return countDiff;
      return a.name.localeCompare(b.name);
    });
  }, [clients, query]);

  const loading = clients === null;

  if (selected) {
    return (
      <div dir={dir} className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {text.supervisorRatingsBack}
            </Button>
            <h2 className="mt-3 truncate text-xl font-semibold">{selected.name}</h2>
            <p className="text-sm text-muted-foreground">/{selected.slug}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{(selected.ratingAvg || 0).toFixed(1)}</p>
              <Stars value={selected.ratingAvg || 0} />
            </div>
            <p className="text-sm text-muted-foreground">
              {selected.ratingCount || 0} {text.reviewsTotalWord}
            </p>
          </div>
        </div>

        {reviewsError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {reviewsError}
          </p>
        ) : null}

        {reviews === null ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-muted-foreground">
              {text.supervisorRatingsNoneForCafe}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-2 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={review.rating} />
                    <span className="text-xs text-muted-foreground">{formatDate(review.at, locale)}</span>
                  </div>
                  {review.comment?.trim() ? (
                    <p className="text-sm text-foreground">{review.comment.trim()}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">{text.supervisorRatingsNoComment}</p>
                  )}
                  <div className="space-y-0.5 text-xs">
                    <p className="font-medium text-muted-foreground">
                      {text.supervisorRatingsSender}:{" "}
                      <span className="text-foreground">{review.name?.trim() || text.reviewsAnonymous}</span>
                    </p>
                    {review.email?.trim() ? (
                      <p className="font-medium text-muted-foreground">
                        {text.supervisorRatingsEmail}:{" "}
                        <a
                          dir="ltr"
                          href={`mailto:${review.email.trim()}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {review.email.trim()}
                        </a>
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-muted-foreground">{text.supervisorRatingsDesc}</p>
        <label className="relative block w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="ps-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.supervisorRatingsSearch}
          />
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            {clients?.length ? text.supervisorRatingsNoMatch : text.supervisorRatingsEmpty}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ranked.map((client) => {
            const count = client.ratingCount || 0;
            const avg = client.ratingAvg || 0;
            return (
              <button
                key={client.slug}
                type="button"
                onClick={() => setSelected(client)}
                className="focus-ring flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-start transition-colors hover:bg-muted/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{client.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">/{client.slug}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-lg font-bold tabular-nums">{count ? avg.toFixed(1) : "—"}</span>
                    <Star
                      className={cn(
                        "h-4 w-4",
                        count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                      )}
                      aria-hidden
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {count} {text.reviewsTotalWord}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            );
          })}
        </div>
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
