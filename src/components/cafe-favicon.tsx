"use client";

import { useEffect } from "react";
import { applyCafeFavicon } from "@/lib/cafe-favicon";

/** Keeps the browser tab icon in sync with the cafe logo. */
export function CafeFavicon({ logoUrl }: { logoUrl?: string | null }) {
  useEffect(() => {
    applyCafeFavicon(logoUrl);
  }, [logoUrl]);

  return null;
}
