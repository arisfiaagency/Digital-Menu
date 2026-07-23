// Skeleton shown while the menu page streams in: a top bar, a header, a row of
// category pills, and a grid of item-card placeholders with shimmering images.
export default function MenuLoading() {
  return (
    <div role="status" aria-label="Loading" className="min-h-dvh bg-background">
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <div className="h-9 w-52 animate-pulse rounded-lg bg-muted" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-muted/70" />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 px-4 pb-24 pt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
