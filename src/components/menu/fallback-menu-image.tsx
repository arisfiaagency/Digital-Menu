"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { isAnimatedMediaUrl, isVideoMediaUrl } from "@/lib/storage/media-url";

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
  const [useVideo, setUseVideo] = useState(() => isVideoMediaUrl(src));

  const animated = isAnimatedMediaUrl(imageSrc) || useVideo;
  // Above-the-fold / animated media load eagerly so GIFs/MP4s aren't unloaded
  // by lazy loading (which flashes white when they re-enter the viewport).
  const loading = priority || animated ? "eager" : "lazy";
  const fetchPriority = lcp ? "high" : "auto";

  useEffect(() => {
    const next = src || DEFAULT_ITEM_IMAGE;
    setImageSrc(next);
    setUseVideo(isVideoMediaUrl(src));
    setLoaded(!src);
  }, [src]);

  return (
    <span
      className={cn(
        "relative block h-full w-full overflow-hidden bg-muted",
        // Keep parent hover scales from compositing GIFs/videos into white flashes.
        animated && "!transform-none"
      )}
    >
      {/* Static photos get a pulse; animated media stays solid (no white overlay). */}
      {!loaded && !animated ? <span className="absolute inset-0 animate-pulse bg-muted" aria-hidden /> : null}
      {useVideo ? (
        <video
          key={imageSrc}
          src={imageSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={alt}
          className="h-full w-full object-cover"
          onLoadedData={() => setLoaded(true)}
          onError={() => {
            setLoaded(true);
            setUseVideo(false);
            setImageSrc(DEFAULT_ITEM_IMAGE);
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          // sync decode avoids a blank frame while animated GIFs start
          decoding={animated ? "sync" : "async"}
          className={cn(
            "h-full w-full object-cover",
            // CSS transforms re-rasterize GIF frames and cause white "shooting" flashes.
            !animated && "transition-transform duration-500 group-hover:scale-105"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(true);
            if (imageSrc !== DEFAULT_ITEM_IMAGE) setImageSrc(DEFAULT_ITEM_IMAGE);
          }}
        />
      )}
    </span>
  );
}
