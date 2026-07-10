"use client";

import { useEffect, useState } from "react";

const defaultMenuImage = "/stone-cafe-logo.jpg";

export function FallbackMenuImage({
  src,
  alt,
  priority = false,
  lcp = false
}: {
  src?: string;
  alt: string;
  priority?: boolean;
  lcp?: boolean;
}) {
  const [imageSrc, setImageSrc] = useState(src || defaultMenuImage);
  const isDefaultImage = imageSrc === defaultMenuImage;

  useEffect(() => {
    setImageSrc(src || defaultMenuImage);
  }, [src]);

  // Above-the-fold cards load right away (eager) so they don't wait for scroll. But only the single
  // largest/first image gets high fetch priority — marking many images "high" starves the critical
  // resources and each other, which makes the whole page feel slower.
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = lcp ? "high" : "auto";

  if (isDefaultImage) {
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
          onError={() => setImageSrc(defaultMenuImage)}
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
      onError={() => setImageSrc(defaultMenuImage)}
    />
  );
}
