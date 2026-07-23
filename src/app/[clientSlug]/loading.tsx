// Skeleton shown while the welcome page streams in. Neutral (theme accent isn't
// known yet at this stage) but shaped like the real front door: centered logo,
// name, tagline, badges, and the "View Menu" button.
export default function WelcomeLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6"
    >
      <div className="h-28 w-28 animate-pulse rounded-full bg-muted" />
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/70" />
      <div className="mt-3 flex gap-3">
        <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-6 h-12 w-44 animate-pulse rounded-full bg-muted" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
