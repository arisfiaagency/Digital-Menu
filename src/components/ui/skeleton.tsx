import { cn } from "@/lib/utils/cn";

/**
 * Low-level shimmer block used to build loading placeholders. Matches the menu
 * card skeletons (muted fill + pulse) so admin and public loaders feel the same.
 * Honors reduced motion because `animate-pulse` is disabled by Tailwind under
 * `prefers-reduced-motion: reduce`.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
