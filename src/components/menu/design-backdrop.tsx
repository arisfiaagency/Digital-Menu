import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { MenuDesign } from "@/types/models";

// A per-design "signature" background. Each menu design and its matching welcome
// page render the SAME backdrop for a given design, which is what visually ties
// the front door to the menu. Every motif carries symbols that echo the design's
// NAME (chalk doodles for chalkboard, an enso + leaves for zen, neon bolts for
// neon, bento compartments + chopsticks, kraft stamps + twine, a retro sunburst,
// luxury sparkles, …) so no two designs look alike.
//
// It sits as a `-z-10` layer inside a root that has `isolate` (so it paints above
// the root's own background but below all content). Symbols use `currentColor`
// (set by the tint class) and accent glows use `hsl(var(--primary)/…)`, so the
// whole thing recolors with the cafe's accent in both light and dark.

// Absolutely-positioned full-bleed layer. `tint` sets the color the SVG symbols
// inherit via currentColor.
function Layer({ tint, children }: { tint: string; children: ReactNode }) {
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

// A tiled SVG pattern of symbols that repeats down the whole page.
function Tiles({
  id,
  w,
  h,
  opacity = 0.08,
  rotate = 0,
  glow = false,
  children
}: {
  id: string;
  w: number;
  h: number;
  opacity?: number;
  rotate?: number;
  glow?: boolean;
  children: ReactNode;
}) {
  const style: CSSProperties = { opacity };
  if (glow) style.filter = "drop-shadow(0 0 6px hsl(var(--primary) / 0.7))";
  return (
    <svg className="absolute inset-0 h-full w-full" style={style} aria-hidden>
      <defs>
        <pattern
          id={id}
          width={w}
          height={h}
          patternUnits="userSpaceOnUse"
          patternTransform={rotate ? `rotate(${rotate})` : undefined}
        >
          {children}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function DesignBackdrop({ design }: { design: MenuDesign }) {
  switch (design) {
    case "luxury":
      return (
        <Layer tint="text-primary">
          <Glow at="50% -5%" strength={0.2} />
          <Glow at="92% 100%" size="45% 40%" strength={0.12} />
          <Tiles id="bd-luxury" w={74} h={74} opacity={0.1}>
            <path d="M37 10 L41 31 L62 35 L41 39 L37 60 L33 39 L12 35 L33 31 Z" fill="currentColor" />
            <circle cx="6" cy="6" r="1.6" fill="currentColor" />
            <circle cx="68" cy="68" r="1.6" fill="currentColor" />
          </Tiles>
        </Layer>
      );

    case "modern":
      return (
        <Layer tint="text-primary">
          <Glow at="12% 0%" strength={0.16} />
          <Tiles id="bd-modern" w={92} h={92} opacity={0.08}>
            <circle cx="20" cy="22" r="12" fill="none" stroke="currentColor" strokeWidth={3} />
            <rect x="54" y="12" width="24" height="24" rx="7" fill="none" stroke="currentColor" strokeWidth={3} />
            <path d="M22 60 v20 M12 70 h20" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
            <circle cx="68" cy="68" r="6" fill="currentColor" />
          </Tiles>
        </Layer>
      );

    case "classic":
      return (
        <Layer tint="text-foreground">
          <Tiles id="bd-classic" w={124} h={92} opacity={0.06}>
            {/* fork */}
            <path d="M24 18 v16 a4 4 0 0 0 8 0 v-16 M28 18 v56" stroke="currentColor" strokeWidth={2.4} fill="none" strokeLinecap="round" />
            {/* knife */}
            <path d="M46 18 c9 3 9 20 0 28 v28" stroke="currentColor" strokeWidth={2.4} fill="none" strokeLinecap="round" />
            {/* dotted price leader */}
            <path d="M74 46 h40" stroke="currentColor" strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" />
          </Tiles>
        </Layer>
      );

    case "minimal":
      return (
        <Layer tint="text-foreground">
          <Tiles id="bd-minimal" w={26} h={26} opacity={0.06}>
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </Tiles>
        </Layer>
      );

    case "neon":
      return (
        <Layer tint="text-primary">
          <Glow at="50% 0%" size="72% 52%" strength={0.32} />
          <Glow at="0% 100%" size="52% 46%" strength={0.22} />
          <Tiles id="bd-neon-grid" w={46} h={46} opacity={0.16}>
            <path d="M46 0 H0 V46" fill="none" stroke="currentColor" strokeWidth={1} />
          </Tiles>
          <Tiles id="bd-neon-sym" w={150} h={150} opacity={0.22} glow>
            {/* lightning bolt */}
            <path d="M62 20 L46 76 H64 L56 122 L100 56 H78 L88 20 Z" fill="currentColor" />
            {/* spark star */}
            <path d="M122 98 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 Z" fill="currentColor" />
          </Tiles>
        </Layer>
      );

    case "gallery":
      return (
        <Layer tint="text-foreground">
          <Tiles id="bd-gallery" w={116} h={116} opacity={0.07}>
            {/* framed picture */}
            <rect x="16" y="16" width="58" height="46" rx="3" fill="none" stroke="currentColor" strokeWidth={2.4} />
            <circle cx="30" cy="30" r="4" fill="currentColor" />
            <path d="M20 58 l14 -15 10 8 12 -16 10 23 Z" fill="currentColor" opacity={0.55} />
            {/* corner crop marks */}
            <path d="M92 22 h14 M99 15 v14" stroke="currentColor" strokeWidth={2} />
            <path d="M40 96 h14 M47 89 v14" stroke="currentColor" strokeWidth={2} />
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
              backgroundImage:
                "radial-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1.4px)",
              backgroundSize: "7px 7px"
            }}
          />
          <Tiles id="bd-chalk" w={154} h={122} opacity={0.16}>
            {/* swirl */}
            <path d="M20 60 c0 -20 30 -20 30 0 s-20 22 -20 -2" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
            {/* hand star */}
            <path d="M104 24 l4 11 11 2 -8 8 2 11 -9 -6 -9 6 2 -11 -8 -8 11 -2 Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
            {/* curved arrow */}
            <path d="M92 84 q22 -12 44 0 M124 74 l14 10 -14 8" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            {/* wavy underline */}
            <path d="M18 104 q9 -9 18 0 t18 0 t18 0" fill="none" stroke="currentColor" strokeWidth={2} />
          </Tiles>
        </Layer>
      );

    case "tabs":
      return (
        <Layer tint="text-primary">
          <Tiles id="bd-tabs" w={134} h={72} opacity={0.07}>
            {/* file-folder tab */}
            <path d="M14 42 v-14 a4 4 0 0 1 4 -4 h26 l6 8 h30 a4 4 0 0 1 4 4 v6" fill="none" stroke="currentColor" strokeWidth={2.4} />
            <path d="M14 42 h74" stroke="currentColor" strokeWidth={2.4} />
            {/* index rules */}
            <path d="M102 30 h22 M102 40 h15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </Tiles>
        </Layer>
      );

    case "retro":
      return (
        <Layer tint="text-primary">
          {/* corner sunburst */}
          <div
            className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-[0.12]"
            style={{
              backgroundImage:
                "repeating-conic-gradient(from 0deg, hsl(var(--primary)) 0deg 5deg, transparent 5deg 12deg)",
              WebkitMaskImage: "radial-gradient(circle, black 42%, transparent 72%)",
              maskImage: "radial-gradient(circle, black 42%, transparent 72%)"
            }}
          />
          <Tiles id="bd-retro" w={124} h={124} opacity={0.09}>
            {/* boomerang */}
            <path d="M20 42 q22 -22 44 0 q-22 -9 -44 0 Z" fill="currentColor" />
            {/* ring */}
            <circle cx="92" cy="86" r="10" fill="none" stroke="currentColor" strokeWidth={4} />
            {/* wave */}
            <path d="M16 92 q9 -9 18 0 t18 0" fill="none" stroke="currentColor" strokeWidth={3} />
          </Tiles>
        </Layer>
      );

    case "pastel":
      return (
        <Layer tint="text-primary">
          <Glow at="18% 0%" strength={0.14} />
          <Glow at="86% 92%" size="45% 42%" strength={0.12} />
          <Tiles id="bd-pastel" w={104} h={104} opacity={0.1}>
            {/* heart */}
            <path d="M30 42 c-6 -11 -23 -4 -23 8 c0 11 23 23 23 23 s23 -12 23 -23 c0 -12 -17 -19 -23 -8 Z" fill="currentColor" />
            {/* sprinkles */}
            <circle cx="78" cy="20" r="3" fill="currentColor" />
            <circle cx="92" cy="62" r="2.5" fill="currentColor" />
            {/* tiny star */}
            <path d="M76 80 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="currentColor" />
          </Tiles>
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
          <Tiles id="bd-kraft" w={124} h={124} opacity={0.07}>
            {/* rubber stamp */}
            <circle cx="40" cy="40" r="22" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="3 4" />
            <path d="M28 40 h24 M40 28 v24" stroke="currentColor" strokeWidth={1.5} />
            {/* twine cross-tie */}
            <path d="M80 80 l26 26 M106 80 l-26 26" stroke="currentColor" strokeWidth={2} />
            {/* small star */}
            <path d="M96 20 l2 6 6 1 -5 4 2 6 -5 -3 -5 3 2 -6 -5 -4 6 -1 Z" fill="currentColor" />
          </Tiles>
        </Layer>
      );

    case "bento":
      return (
        <Layer tint="text-primary">
          <Tiles id="bd-bento" w={124} h={124} opacity={0.08}>
            {/* compartments */}
            <rect x="14" y="14" width="44" height="44" rx="8" fill="none" stroke="currentColor" strokeWidth={2.4} />
            <rect x="66" y="14" width="44" height="20" rx="6" fill="none" stroke="currentColor" strokeWidth={2.4} />
            <rect x="66" y="40" width="44" height="18" rx="6" fill="none" stroke="currentColor" strokeWidth={2.4} />
            <circle cx="36" cy="36" r="6" fill="currentColor" opacity={0.6} />
            {/* chopsticks */}
            <path d="M16 78 l84 24 M16 90 l84 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
          </Tiles>
        </Layer>
      );

    case "elegant":
      return (
        <Layer tint="text-primary">
          <Glow at="50% 0%" strength={0.1} />
          <Tiles id="bd-elegant" w={144} h={92} opacity={0.09}>
            {/* filigree flourish */}
            <path d="M18 46 c22 -28 44 28 66 0 c15 -20 -9 -37 -20 -20 c-8 13 11 20 20 6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            {/* thin diamond */}
            <path d="M116 34 l8 12 -8 12 -8 -12 Z" fill="none" stroke="currentColor" strokeWidth={1.3} />
          </Tiles>
        </Layer>
      );

    case "magazine":
      return (
        <Layer tint="text-foreground">
          {/* halftone dots */}
          <Tiles id="bd-magazine" w={16} h={16} opacity={0.05}>
            <circle cx="3" cy="3" r="1.4" fill="currentColor" />
          </Tiles>
          {/* column rules */}
          <div className="absolute inset-y-0 left-1/3 w-px bg-foreground/[0.05]" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-foreground/[0.05]" />
          {/* oversized editorial quote */}
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
          {/* hazard stripe */}
          <div
            className="absolute inset-x-0 top-0 h-6 opacity-[0.08]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0 10px, transparent 10px 20px)"
            }}
          />
          <Tiles id="bd-brutalist" w={124} h={124} opacity={0.07}>
            <rect x="14" y="16" width="34" height="34" fill="currentColor" />
            <path d="M66 16 l28 28 M94 16 l-28 28" stroke="currentColor" strokeWidth={4} />
            {/* asterisk */}
            <path d="M30 74 v34 M14 90 h34 M18 78 l24 24 M42 78 l-24 24" stroke="currentColor" strokeWidth={3} />
            <rect x="76" y="76" width="32" height="16" fill="currentColor" />
          </Tiles>
        </Layer>
      );

    case "zen":
      return (
        <Layer tint="text-primary">
          <Glow at="50% 8%" strength={0.1} />
          <Tiles id="bd-zen" w={152} h={132} opacity={0.09}>
            {/* enso (open ink ring) */}
            <path d="M42 22 a26 26 0 1 0 9 7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
            {/* leaf */}
            <path d="M98 30 c19 0 31 12 31 31 c-19 0 -31 -12 -31 -31 Z" fill="none" stroke="currentColor" strokeWidth={2} />
            <path d="M102 34 q14 14 23 23" stroke="currentColor" strokeWidth={1.4} fill="none" />
            {/* ripples */}
            <path d="M24 102 q17 -11 34 0 M20 112 q21 -13 42 0" fill="none" stroke="currentColor" strokeWidth={1.5} />
            {/* stone */}
            <ellipse cx="114" cy="106" rx="12" ry="8" fill="currentColor" opacity={0.5} />
          </Tiles>
        </Layer>
      );

    default:
      return (
        <Layer tint="text-foreground">
          <Tiles id="bd-default" w={26} h={26} opacity={0.05}>
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </Tiles>
        </Layer>
      );
  }
}
