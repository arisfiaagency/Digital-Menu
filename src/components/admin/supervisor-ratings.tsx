"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Check, ChevronRight, Copy, KeyRound, Search, ShieldCheck, Star, X } from "lucide-react";
import { useAdminLocale } from "@/components/admin/admin-preferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getFirebaseAuth } from "@/lib/firebase/client";
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <RatingsApiButton text={text} />
          <label className="relative block w-full sm:w-64">
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

function RatingsApiButton({ text }: { text: Record<string, string> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" aria-hidden />
        {text.supervisorRatingsApiGenerate}
      </Button>
      {open ? <RatingsApiDialog text={text} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function RatingsApiDialog({ text, onClose }: { text: Record<string, string>; onClose: () => void }) {
  const [step, setStep] = useState<"2fa" | "key">("2fa");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [configured, setConfigured] = useState(false);
  const [keyPrefix, setKeyPrefix] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [freshKey, setFreshKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"key" | "list" | "cafe" | "secret" | "">("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const listUrl = `${origin}/api/v1/ratings`;
  const cafeUrl = `${origin}/api/v1/ratings/{slug}`;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getFirebaseAuth()?.currentUser?.getIdToken();
        if (!token) throw new Error(text.supervisorRatingsApiAuth);
        const res = await fetch("/api/admin/ratings-2fa", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = (await res.json()) as {
          ok?: boolean;
          enabled?: boolean;
          qrDataUrl?: string;
          secret?: string;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.qrDataUrl) {
          throw new Error(json.error || text.supervisorRatingsApi2faLoadFailed);
        }
        if (!active) return;
        setTotpEnabled(Boolean(json.enabled));
        setQrDataUrl(json.qrDataUrl);
        setTotpSecret(json.secret || "");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : text.supervisorRatingsApi2faLoadFailed);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [text.supervisorRatingsApiAuth, text.supervisorRatingsApi2faLoadFailed]);

  async function verifyTwoFactor() {
    setWorking(true);
    setError("");
    try {
      const token = await getFirebaseAuth()?.currentUser?.getIdToken();
      if (!token) throw new Error(text.supervisorRatingsApiAuth);
      const res = await fetch("/api/admin/ratings-2fa", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: totpEnabled ? "verify" : "confirm",
          code: totpCode
        })
      });
      const json = (await res.json()) as {
        ok?: boolean;
        challenge?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.challenge) {
        throw new Error(json.error || text.supervisorRatingsApi2faFailed);
      }
      setChallenge(json.challenge);
      setTotpEnabled(true);
      setTotpCode("");

      const statusRes = await fetch("/api/admin/ratings-api", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const status = (await statusRes.json()) as {
        ok?: boolean;
        configured?: boolean;
        keyPrefix?: string;
        createdAt?: string;
        error?: string;
      };
      if (statusRes.ok && status.ok) {
        setConfigured(Boolean(status.configured));
        setKeyPrefix(status.keyPrefix || "");
        setCreatedAt(status.createdAt || "");
      }
      setStep("key");
    } catch (err) {
      setError(err instanceof Error ? err.message : text.supervisorRatingsApi2faFailed);
    } finally {
      setWorking(false);
    }
  }

  async function generateKey() {
    if (!challenge) {
      setStep("2fa");
      setError(text.supervisorRatingsApi2faRequired);
      return;
    }
    setWorking(true);
    setError("");
    try {
      const token = await getFirebaseAuth()?.currentUser?.getIdToken();
      if (!token) throw new Error(text.supervisorRatingsApiAuth);
      const res = await fetch("/api/admin/ratings-api", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ challenge })
      });
      const json = (await res.json()) as {
        ok?: boolean;
        apiKey?: string;
        keyPrefix?: string;
        createdAt?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.apiKey) {
        if (res.status === 403) {
          setChallenge("");
          setStep("2fa");
        }
        throw new Error(json.error || text.supervisorRatingsApiGenerateFailed);
      }
      setFreshKey(json.apiKey);
      setConfigured(true);
      setKeyPrefix(json.keyPrefix || json.apiKey.slice(0, 11));
      setCreatedAt(json.createdAt || "");
      setChallenge("");
    } catch (err) {
      setError(err instanceof Error ? err.message : text.supervisorRatingsApiGenerateFailed);
    } finally {
      setWorking(false);
    }
  }

  async function copyText(value: string, which: "key" | "list" | "cafe" | "secret") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError(text.supervisorRatingsApiCopyFailed);
    }
  }

  function requestRegenerate() {
    setFreshKey("");
    setChallenge("");
    setTotpCode("");
    setError("");
    setStep("2fa");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={text.supervisorRatingsApiTitle}
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold">
              {step === "2fa" ? (
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              ) : (
                <KeyRound className="h-4 w-4 text-primary" aria-hidden />
              )}
              {step === "2fa" ? text.supervisorRatingsApi2faTitle : text.supervisorRatingsApiTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "2fa" ? text.supervisorRatingsApi2faDesc : text.supervisorRatingsApiDesc}
            </p>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label={text.cancel || "Close"} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {step === "2fa" ? (
            <>
              {loading ? <Skeleton className="mx-auto h-48 w-48 rounded-lg" /> : null}
              {!loading && qrDataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={text.supervisorRatingsApi2faQrAlt}
                    className="h-48 w-48 rounded-lg border bg-white p-2"
                  />
                  <p className="text-center text-sm text-muted-foreground">{text.supervisorRatingsApi2faScan}</p>
                  {totpSecret ? (
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                      <code dir="ltr" className="min-w-0 flex-1 break-all rounded-md border bg-muted/30 px-3 py-2 text-xs">
                        {totpSecret}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => void copyText(totpSecret, "secret")}
                      >
                        {copied === "secret" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                        {copied === "secret" ? text.supervisorRatingsApiCopied : text.supervisorRatingsApi2faCopySecret}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="ratings-totp-code" className="text-sm font-medium">
                  {text.supervisorRatingsApi2faCodeLabel}
                </label>
                <Input
                  id="ratings-totp-code"
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading || working}
                />
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={() => void verifyTwoFactor()}
                disabled={loading || working || totpCode.length !== 6}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                {working
                  ? text.supervisorRatingsApi2faVerifying
                  : totpEnabled
                    ? text.supervisorRatingsApi2faContinue
                    : text.supervisorRatingsApi2faConfirm}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => void (challenge ? generateKey() : requestRegenerate())}
                disabled={working}
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                {working
                  ? text.supervisorRatingsApiGenerating
                  : configured
                    ? text.supervisorRatingsApiRegenerate
                    : text.supervisorRatingsApiGenerate}
              </Button>

              {configured ? (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">{text.supervisorRatingsApiStatus}: </span>
                    <span className="font-medium text-primary">{text.supervisorRatingsApiActive}</span>
                    {keyPrefix ? (
                      <span className="ms-2 font-mono text-xs text-muted-foreground">{keyPrefix}…</span>
                    ) : null}
                  </p>
                  {createdAt ? (
                    <p className="text-xs text-muted-foreground">
                      {text.supervisorRatingsApiCreated}: {formatDate(createdAt, "en")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {freshKey ? (
                <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm font-medium text-primary">{text.supervisorRatingsApiKeyOnce}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code dir="ltr" className="min-w-0 flex-1 break-all rounded-md border bg-background px-3 py-2 text-xs">
                      {freshKey}
                    </code>
                    <Button type="button" variant="outline" size="sm" onClick={() => void copyText(freshKey, "key")}>
                      {copied === "key" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      {copied === "key" ? text.supervisorRatingsApiCopied : text.supervisorRatingsApiCopyKey}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 text-sm">
                <p className="font-medium">{text.supervisorRatingsApiEndpoints}</p>
                <EndpointRow
                  label={text.supervisorRatingsApiList}
                  value={listUrl}
                  copied={copied === "list"}
                  copyLabel={text.supervisorRatingsApiCopyUrl}
                  copiedLabel={text.supervisorRatingsApiCopied}
                  onCopy={() => void copyText(listUrl, "list")}
                />
                <EndpointRow
                  label={text.supervisorRatingsApiCafe}
                  value={cafeUrl}
                  copied={copied === "cafe"}
                  copyLabel={text.supervisorRatingsApiCopyUrl}
                  copiedLabel={text.supervisorRatingsApiCopied}
                  onCopy={() => void copyText(cafeUrl, "cafe")}
                />
                <p className="text-xs text-muted-foreground">{text.supervisorRatingsApiAuthHint}</p>
              </div>
            </>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EndpointRow({
  label,
  value,
  copied,
  copyLabel,
  copiedLabel,
  onCopy
}: {
  label: string;
  value: string;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-background p-2.5 sm:flex-row sm:items-center sm:gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <code dir="ltr" className="min-w-0 flex-1 break-all text-xs">
        {value}
      </code>
      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onCopy}>
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? copiedLabel : copyLabel}
      </Button>
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
