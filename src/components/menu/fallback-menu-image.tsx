"use client";

import { useEffect, useState } from "react";

// Shown whenever an item has no photo, or its photo fails to load. A warm cafe
// tabletop illustration (public/default-menu-item.svg) so every card stays
// filled and consistent instead of showing an empty box or a repeated logo.
const DEFAULT_ITEM_IMAGE = "/default-menu-item.svg";

export function FallbackMenuImage({
  src,
  alt,
  // Accepted for backwards-compatibility with existing call sites, but the item
  // fallback is now always the default menu illustration (never the cafe logo).
  fallbackSrc: _fallbackSrc,
  priority = false,
  lcp = false
}: {
  src?: string;
  alt: string;
  fallbackSrc?: string;
  priority?: boolean;
  lcp?: boolean;
}) {
  const hasRealImage = Boolean(src);
  const [imageSrc, setImageSrc] = useState(src || DEFAULT_ITEM_IMAGE);
  // Skeleton stays up until the real image decodes. The local SVG placeholder
  // needs no skeleton, so start "loaded" when there's no real photo.
  const [loaded, setLoaded] = useState(!hasRealImage);

  useEffect(() => {
    setImageSrc(src || DEFAULT_ITEM_IMAGE);
    setLoaded(!src);
  }, [src]);

  // Above-the-fold cards load right away (eager); everything else waits for
  // scroll. Only the single largest/first image gets high fetch priority.
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = lcp ? "high" : "auto";

  return (
    <span className="relative block h-full w-full overflow-hidden bg-muted">
      {/* Skeleton shimmer while the real photo loads. */}
      {!loaded ? <span className="absolute inset-0 animate-pulse bg-muted" aria-hidden /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true);
          if (imageSrc !== DEFAULT_ITEM_IMAGE) setImageSrc(DEFAULT_ITEM_IMAGE);
        }}
      />
    </span>
  );
}
