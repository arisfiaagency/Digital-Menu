import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { DesignMotion, FloatingSymbols } from "@/components/menu/design-motion";
import type { MenuDesign } from "@/types/models";

// A per-design "signature" background. Each menu design and its matching welcome
// page render the SAME backdrop, which is what visually ties the front door to the
// menu. The character now comes from a FEW name-themed symbols that slowly roam the
// page (FloatingSymbols) plus a mascot that drifts across (DesignMotion) — instead
// of a dense repeating tile. This static layer only paints the base, a subtle glow,
// and a light non-repetitive texture where it suits the design.
//
// It sits as a `-z-10` layer inside a root that has `isolate` (so it paints above
// the root's own background but below all content). Accent glows use
// `hsl(var(--primary)/…)`, so it recolors with the cafe's accent in light and dark.

// Absolutely-positioned full-bleed layer. `tint` sets the color descendants inherit.
function Layer({ tint, children }: { tint: string; children?: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background",
        tint
      )}
    >
      {children}
    </div>
  );
}

// A soft radial glow in the accent color.
function Glow({
  at = "50% 0%",
  size = "60% 45%",
  strength = 0.16
}: {
  at?: string;
  size?: string;
  strength?: number;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(${size} at ${at}, hsl(var(--primary) / ${strength}), transparent 70%)`
      }}
    />
  );
}

// A light tiled texture (dots / grid) — used sparingly for a couple of designs.
function Tiles({
  id,
  w,
  h,
  opacity = 0.06,
  children
}: {
  id: string;
  w: number;
  h: number;
  opacity?: number;
  children: ReactNode;
}) {
  return (
    <svg className="absolute inset-0 h-full w-full" style={{ opacity }} aria-hidden>
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">
          {children}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// Public entry: static base/texture + roaming symbols + the drifting mascot.
export function DesignBackdrop({ design }: { design: MenuDesign }) {
  return (
    <>
      <StaticBackdrop design={design} />
      <FloatingSymbols design={design} />
      <DesignMotion design={design} />
    </>
  );
}

function StaticBackdrop({ design }: { design: MenuDesign }) {
  switch (design) {
    case "neon":
      return (
        <Layer tint="text-primary">
          <Glow at="50% 0%" size="72% 52%" strength={0.3} />
          <Glow at="0% 100%" size="52% 46%" strength={0.2} />
          {/* a faint grid is part of the neon look; the bolts now float */}
          <Tiles id="bd-neon-grid" w={56} h={56} opacity={0.09}>
            <path d="M56 0 H0 V56" fill="none" stroke="currentColor" strokeWidth={1} />
          </Tiles>
        </Layer>
      );

    case "luxury":
      return (
        <Layer tint="text-primary">
          <Glow at="50% -5%" strength={0.2} />
          <Glow at="92% 100%" size="45% 40%" strength={0.12} />
        </Layer>
      );

    case "minimal":
      return (
        <Layer tint="text-foreground">
          <Tiles id="bd-min" w={30} h={30} opacity={0.05}>
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </Tiles>
        </Layer>
      );

    case "chalkboard":
      return (
        <Layer tint="text-foreground">
          {/* faint chalk dust */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1.4px)",
              backgroundSize: "7px 7px"
            }}
          />
        </Layer>
      );

    case "retro":
      return (
        <Layer tint="text-primary">
          {/* corner sunburst */}
          <div
            className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-[0.1]"
            style={{
              backgroundImage:
                "repeating-conic-gradient(from 0deg, hsl(var(--primary)) 0deg 5deg, transparent 5deg 12deg)",
              WebkitMaskImage: "radial-gradient(circle, black 42%, transparent 72%)",
              maskImage: "radial-gradient(circle, black 42%, transparent 72%)"
            }}
          />
        </Layer>
      );

    case "kraft":
      return (
        <Layer tint="text-foreground">
          {/* paper grain */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, hsl(var(--foreground) / 0.02) 0 2px, transparent 2px 5px)"
            }}
          />
        </Layer>
      );

    case "magazine":
      return (
        <Layer tint="text-foreground">
          {/* column rules + one oversized editorial quote (both non-repetitive) */}
          <div className="absolute inset-y-0 left-1/3 w-px bg-foreground/[0.05]" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-foreground/[0.05]" />
          <div
            className="absolute -top-10 left-4 select-none font-serif leading-none text-foreground/[0.05]"
            style={{ fontSize: "16rem" }}
          >
            &rdquo;
          </div>
        </Layer>
      );

    case "brutalist":
      return (
        <Layer tint="text-foreground">
          {/* single hazard stripe up top */}
          <div
            className="absolute inset-x-0 top-0 h-6 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0 10px, transparent 10px 20px)"
            }}
          />
        </Layer>
      );

    case "pastel":
      return (
        <Layer tint="text-primary">
          <Glow at="18% 0%" strength={0.14} />
          <Glow at="86% 92%" size="45% 42%" strength={0.12} />
        </Layer>
      );

    case "modern":
      return (
        <Layer tint="text-primary">
          <Glow at="12% 0%" strength={0.14} />
        </Layer>
      );

    case "gallery":
      return (
        <Layer tint="text-foreground">
          <Glow at="50% 0%" size="70% 40%" strength={0.06} />
        </Layer>
      );

    case "tabs":
      return (
        <Layer tint="text-primary">
          <Glow at="50% 0%" size="70% 35%" strength={0.07} />
        </Layer>
      );

    case "elegant":
      return (
        <Layer tint="text-primary">
          <Glow at="50% 0%" strength={0.08} />
        </Layer>
      );

    case "bento":
      return (
        <Layer tint="text-primary">
          <Glow at="20% 0%" size="60% 40%" strength={0.08} />
        </Layer>
      );

    case "classic":
      return (
        <Layer tint="text-foreground">
          <Glow at="50% 0%" size="60% 30%" strength={0.05} />
        </Layer>
      );

    case "zen":
    default:
      return (
        <Layer tint="text-primary">
          <Glow at="50% 8%" strength={0.1} />
        </Layer>
      );
  }
}
