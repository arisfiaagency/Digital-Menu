"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Star, X } from "lucide-react";
import { useMenuChrome } from "@/components/menu/menu-chrome";
import { translate } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/types/models";
import type { LocaleDirection } from "@/lib/i18n/config";

// One rating per device per cafe every 5 hours (enforced via localStorage — the
// natural "per device" store; a determined user clearing storage can bypass it).
const RATE_LIMIT_MS = 5 * 60 * 60 * 1000;

function ratedRecently(slug: string): boolean {
  try {
    const last = Number(localStorage.getItem(`mdm-rated-${slug}`) || 0);
    return last > 0 && Date.now() - last < RATE_LIMIT_MS;
  } catch {
    return false;
  }
}

// The "Rate us" control shown in every design's top bar (via MenuTopControls).
// It only opens the rating FORM — the public menu never shows the cafe's current
// average/score (that lives in the admin Reviews tab). Submissions POST to
// /api/reviews, which updates the aggregate behind the scenes.
export function RatingButton({ locale, textDir }: { locale: Locale; textDir: LocaleDirection }) {
  const chrome = useMenuChrome();
  const slug = chrome.slug;
  const [open, setOpen] = useState(false);

  // No slug (welcome page context) or the platform admin turned ratings off.
  if (!slug || chrome.ratingEnabled === false) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={translate(locale, "menu.rateUs")}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-muted"
      >
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
        <span>{translate(locale, "menu.rateUs")}</span>
      </button>
      {open ? <RatingDialog slug={slug} locale={locale} textDir={textDir} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function RatingDialog({
  slug,
  locale,
  textDir,
  onClose
}: {
  slug: string;
  locale: Locale;
  textDir: LocaleDirection;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [mounted, setMounted] = useState(false);
  const [limited, setLimited] = useState(false);

  // Lock scroll + close on Escape; only render the portal after mount so it
  // targets document.body (and escapes any transformed/overflow-clipped header).
  useEffect(() => {
    setMounted(true);
    setLimited(ratedRecently(slug));
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
  }, [onClose, slug]);

  async function submit() {
    if (rating < 1 || status === "sending" || limited) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rating, comment, name })
      });
      const json = (await res.json()) as { ok?: boolean };
      if (!res.ok || !json.ok) throw new Error("failed");
      try {
        // Stamp this device so it can't rate this cafe again for 5 hours.
        localStorage.setItem(`mdm-rated-${slug}`, String(Date.now()));
      } catch {
        /* storage may be unavailable */
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center p-4 pt-[8vh] sm:pt-[10vh]">
        <div
          dir={textDir}
          className="drop-in mb-8 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">{translate(locale, "menu.rateTitle")}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={translate(locale, "menu.cancel")}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {status === "done" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn("h-6 w-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="font-medium text-foreground">{translate(locale, "menu.ratingThanks")}</p>
            </div>
          ) : limited ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Star className="h-8 w-8 fill-amber-400 text-amber-400" aria-hidden />
              <p className="font-medium text-foreground">{translate(locale, "menu.ratingAlready")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n}`}
                    onClick={() => setRating(n)}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Star
                      className={cn(
                        "h-9 w-9",
                        n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-300"
                      )}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>

              <textarea
                dir={textDir}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={translate(locale, "menu.ratingComment")}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <input
                dir={textDir}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder={translate(locale, "menu.ratingName")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />

              {status === "error" ? (
                <p className="text-sm text-destructive">{translate(locale, "menu.ratingError")}</p>
              ) : null}

              <button
                type="button"
                onClick={submit}
                disabled={rating < 1 || status === "sending"}
                className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {status === "sending" ? translate(locale, "menu.ratingSending") : translate(locale, "menu.ratingSubmit")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
