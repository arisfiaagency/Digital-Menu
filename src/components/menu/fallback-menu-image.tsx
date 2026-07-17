"use client";

import { useEffect, useState } from "react";

const SITE_FALLBACK = "/site-icon.png";

export function FallbackMenuImage({
  src,
  alt,
  fallbackSrc,
  priority = false,
  lcp = false
}: {
  src?: string;
  alt: string;
  /** Client branding logo from Menu Design — used when the item has no photo. */
  fallbackSrc?: string;
  priority?: boolean;
  lcp?: boolean;
}) {
  const placeholder = fallbackSrc || SITE_FALLBACK;
  const [imageSrc, setImageSrc] = useState(src || placeholder);

  useEffect(() => {
    setImageSrc(src || placeholder);
  }, [src, placeholder]);

  const isPlaceholder = imageSrc === placeholder || imageSrc === SITE_FALLBACK;

  // Above-the-fold cards load right away (eager) so they don't wait for scroll. But only the single
  // largest/first image gets high fetch priority — marking many images "high" starves the critical
  // resources and each other, which makes the whole page feel slower.
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = lcp ? "high" : "auto";

  if (isPlaceholder) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 sm:p-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          className="aspect-square h-full max-h-full max-w-full rounded-full object-cover shadow-sm ring-1 ring-border/60 transition-transform duration-500 group-hover:scale-105"
          onError={() => {
            if (imageSrc !== SITE_FALLBACK) setImageSrc(SITE_FALLBACK);
          }}
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setImageSrc(placeholder)}
    />
  );
}
