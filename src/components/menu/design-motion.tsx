import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { MenuDesign } from "@/types/models";

// Per-design animated "mascots" — a layer of moving, name-themed decoration that
// plays on BOTH the menu and the welcome page (it lives inside DesignBackdrop).
// Examples: a dragon soaring across the Zen menu with drifting sakura petals, a
// paper plane gliding over Kraft, a spinning boomerang on Retro, neon light
// streaks, luxury comets, rising pastel hearts. It sits behind the content
// (-z-10) and never captures pointer events; `prefers-reduced-motion` hides it
// entirely (see globals.css .menu-motion).

// Inline style that also allows CSS custom properties (--drift, --tilt, --fade).
type Vars = CSSProperties & Record<string, string | number>;

// The fixed, behind-content stage. `tint` sets the color the SVG mascots inherit.
function Stage({ tint = "text-primary", children }: { tint?: string; children: ReactNode }) {
  return (
    <div aria-hidden className={cn("menu-motion -z-10", tint)}>
      {children}
    </div>
  );
}

/* ── Mascot artwork ─────────────────────────────────────────────────────────── */

function Koi() {
  return (
    <svg width="132" height="70" viewBox="0 0 132 70" fill="none" aria-hidden>
      {/* flowing tail */}
      <path d="M42 35 C25 20 12 16 5 23 C14 29 19 32 27 35 C19 38 14 41 5 47 C12 54 25 50 42 35 Z" fill="currentColor" opacity="0.85" />
      {/* body */}
      <path d="M40 35 C54 14 92 12 114 25 C123 30 123 40 114 45 C92 58 54 56 40 35 Z" fill="currentColor" />
      {/* dorsal fin */}
      <path d="M64 17 C73 5 86 6 92 16 C82 17 72 18 64 17 Z" fill="currentColor" opacity="0.85" />
      {/* pectoral fin */}
      <path d="M82 43 C86 54 77 60 68 56 C74 51 78 47 82 43 Z" fill="currentColor" opacity="0.85" />
      {/* koi markings + eye (punched out in the background colour) */}
      <ellipse cx="74" cy="28" rx="8" ry="5.5" fill="hsl(var(--background))" opacity="0.5" />
      <ellipse cx="97" cy="36" rx="5.5" ry="4" fill="hsl(var(--background))" opacity="0.45" />
      <circle cx="109" cy="31" r="2.4" fill="hsl(var(--background))" />
    </svg>
  );
}

function BurstStar() {
  // A chunky 6-spoke asterisk-star for the Brutalist mascot.
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="6">
        <path d="M21 4 V38 M6 12.5 L36 29.5 M6 29.5 L36 12.5" />
      </g>
    </svg>
  );
}

function Petal({ w = 15 }: { w?: number }) {
  return (
    <svg width={w} height={w} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1 C11 4 11 10 8 15 C5 10 5 4 8 1 Z" fill="currentColor" />
      <path d="M8 4 L8 13" stroke="hsl(var(--background))" strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

function Boomerang() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
      <path d="M4 6 C16 8 24 16 28 28 L22 30 C19 20 13 13 3 11 Z" fill="currentColor" />
    </svg>
  );
}

function PaperPlane() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden>
      <path d="M1 12 L33 1 L20 25 L15 16 Z" fill="currentColor" />
      <path d="M15 16 L33 1" stroke="hsl(var(--background))" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

function Heart({ w = 18 }: { w?: number }) {
  return (
    <svg width={w} height={w} viewBox="0 0 18 18" aria-hidden>
      <path d="M9 16 C2 11 1 6 4 4 C6 2.5 8 3.5 9 5 C10 3.5 12 2.5 14 4 C17 6 16 11 9 16 Z" fill="currentColor" />
    </svg>
  );
}

function Spark({ w = 20 }: { w?: number }) {
  return (
    <svg width={w} height={w} viewBox="0 0 24 24" aria-hidden style={{ filter: "drop-shadow(0 0 5px hsl(var(--primary) / 0.8))" }}>
      <path d="M12 1 L14 9 L22 12 L14 15 L12 23 L10 15 L2 12 L10 9 Z" fill="currentColor" />
    </svg>
  );
}

function Feather() {
  return (
    <svg width="16" height="30" viewBox="0 0 16 30" aria-hidden>
      <path d="M8 1 C14 8 14 20 9 29 C4 20 2 8 8 1 Z" fill="currentColor" />
      <path d="M8 4 L8 27" stroke="hsl(var(--background))" strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

/* ── Per-design layers ─────────────────────────────────────────────────────── */

// Deterministic pseudo-scatter so repeated mascots spread out nicely.
const SCATTER = [6, 22, 38, 52, 66, 78, 90, 14, 46, 72];

function ZenMotion() {
  return (
    <Stage tint="text-primary">
      {/* A koi gliding across every loop. */}
      <div style={{ top: 0, left: 0, opacity: 0.55, animation: "menu-swim 16s linear infinite" }}>
        <Koi />
      </div>
      {/* Drifting sakura petals. */}
      {SCATTER.slice(0, 7).map((left, i) => (
        <span
          key={i}
          style={
            {
              left: `${left}%`,
              top: 0,
              "--drift": `${i % 2 ? 7 : -6}vw`,
              "--fade": 0.55,
              animation: `menu-fall ${11 + (i % 4) * 2}s linear ${i * 1.6}s infinite`
            } as Vars
          }
        >
          <Petal w={12 + (i % 3) * 3} />
        </span>
      ))}
    </Stage>
  );
}

function NeonMotion() {
  return (
    <Stage tint="text-primary">
      {[0, 4.5].map((delay, i) => (
        <span
          key={i}
          style={{
            top: 0,
            left: 0,
            width: 240,
            height: 3,
            borderRadius: 3,
            background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
            boxShadow: "0 0 14px hsl(var(--primary))",
            animation: `menu-streak ${7 + i}s ease-in ${delay}s infinite`
          }}
        />
      ))}
      {/* A flickering glow orb, like a buzzing sign. */}
      <span
        style={{
          right: "8%",
          top: "16%",
          left: "auto",
          width: 90,
          height: 90,
          borderRadius: "9999px",
          background: "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 70%)",
          animation: "menu-flicker 4s steps(1, end) infinite"
        }}
      />
    </Stage>
  );
}

function RetroMotion() {
  return (
    <Stage tint="text-primary">
      <div style={{ top: 0, left: 0, opacity: 0.5, animation: "menu-glide 12s linear infinite" }}>
        <div style={{ animation: "menu-spin 1.1s linear infinite" }}>
          <Boomerang />
        </div>
      </div>
    </Stage>
  );
}

function KraftMotion() {
  return (
    <Stage tint="text-foreground">
      <div style={{ top: 0, left: 0, opacity: 0.4, animation: "menu-glide 14s linear infinite", ["--tilt" as string]: "-8deg" } as Vars}>
        <PaperPlane />
      </div>
    </Stage>
  );
}

function PastelMotion() {
  return (
    <Stage tint="text-primary">
      {SCATTER.map((left, i) => (
        <span
          key={i}
          style={
            {
              left: `${left}%`,
              top: 0,
              "--drift": `${i % 2 ? -5 : 5}vw`,
              "--fade": 0.5,
              animation: `menu-rise ${12 + (i % 4) * 2}s linear ${i * 1.3}s infinite`
            } as Vars
          }
        >
          {i % 2 ? <Heart w={12 + (i % 3) * 4} /> : (
            <span
              style={{
                display: "block",
                width: 10 + (i % 3) * 4,
                height: 10 + (i % 3) * 4,
                borderRadius: "9999px",
                border: "2px solid currentColor",
                opacity: 0.7
              }}
            />
          )}
        </span>
      ))}
    </Stage>
  );
}

function LuxuryMotion() {
  return (
    <Stage tint="text-primary">
      {/* Comet with a fading tail. */}
      <div style={{ top: 0, left: 0, animation: "menu-streak 9s ease-in 1s infinite" }}>
        <div style={{ position: "relative", width: 150, height: 22 }}>
          <div style={{ position: "absolute", top: 9, left: 0, width: 120, height: 2, background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.85))" }} />
          <span style={{ position: "absolute", left: 110, top: 1 }}><Spark w={20} /></span>
        </div>
      </div>
      {/* Twinkling sparkles. */}
      {[
        { left: "18%", top: "24%" },
        { left: "72%", top: "16%" },
        { left: "58%", top: "58%" },
        { left: "32%", top: "70%" }
      ].map((p, i) => (
        <span key={i} style={{ left: p.left, top: p.top, animation: `menu-flicker ${3 + i}s steps(1, end) ${i * 0.6}s infinite` }}>
          <Spark w={12 + (i % 2) * 6} />
        </span>
      ))}
    </Stage>
  );
}

function ElegantMotion() {
  return (
    <Stage tint="text-primary">
      {[16, 48, 78].map((left, i) => (
        <span
          key={i}
          style={
            {
              left: `${left}%`,
              top: 0,
              "--drift": `${i % 2 ? 9 : -7}vw`,
              "--fade": 0.4,
              animation: `menu-fall ${16 + i * 3}s ease-in-out ${i * 4}s infinite`
            } as Vars
          }
        >
          <Feather />
        </span>
      ))}
    </Stage>
  );
}

function ChalkboardMotion() {
  return (
    <Stage tint="text-foreground">
      {SCATTER.slice(0, 8).map((left, i) => (
        <span
          key={i}
          style={
            {
              left: `${left}%`,
              top: 0,
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              borderRadius: "9999px",
              background: "currentColor",
              "--drift": `${i % 2 ? 3 : -3}vw`,
              "--fade": 0.35,
              animation: `menu-rise ${14 + (i % 5) * 2}s linear ${i * 1.4}s infinite`
            } as Vars
          }
        />
      ))}
    </Stage>
  );
}

function BentoMotion() {
  return (
    <Stage tint="text-primary">
      {/* Rising steam puffs, as if from fresh food. */}
      {[20, 50, 80].map((left, i) => (
        <span
          key={i}
          style={
            {
              left: `${left}%`,
              top: 0,
              width: 26 + i * 6,
              height: 26 + i * 6,
              borderRadius: "9999px",
              background: "radial-gradient(circle, hsl(var(--primary) / 0.28), transparent 70%)",
              filter: "blur(2px)",
              "--drift": `${i % 2 ? 4 : -4}vw`,
              "--fade": 0.5,
              animation: `menu-rise ${13 + i * 2}s linear ${i * 2.5}s infinite`
            } as Vars
          }
        />
      ))}
    </Stage>
  );
}

function ModernMotion() {
  return (
    <Stage tint="text-primary">
      {[
        { size: 220, dur: 26, tilt: 0, o: 0.12 },
        { size: 150, dur: 20, tilt: 0, o: 0.1 }
      ].map((b, i) => (
        <div
          key={i}
          style={
            {
              top: `${i * 12}%`,
              left: 0,
              width: b.size,
              height: b.size,
              borderRadius: "9999px",
              background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)",
              opacity: b.o,
              filter: "blur(6px)",
              animation: `menu-glide ${b.dur}s linear ${i * 6}s infinite`
            } as Vars
          }
        />
      ))}
    </Stage>
  );
}

function BrutalistMotion() {
  return (
    <Stage tint="text-foreground">
      {/* A chunky asterisk-star gliding across with a jerky, mechanical spin. */}
      <div style={{ top: 0, left: 0, opacity: 0.5, animation: "menu-glide 13s linear infinite" }}>
        <div style={{ animation: "menu-spin 3.4s steps(8, end) infinite" }}>
          <BurstStar />
        </div>
      </div>
    </Stage>
  );
}

/* ── Floating design symbols ───────────────────────────────────────────────── */
// A few name-themed glyphs that slowly wander the page (replacing the old dense
// tiled patterns). Behind content, tinted, and hidden under reduced-motion.

function Glyph({ kind, size }: { kind: string; size: number }) {
  const s: CSSProperties = { width: size, height: size, display: "block" };
  switch (kind) {
    case "bolt": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M13 2 L5 14 h5 l-1 8 8 -12 h-5 l1 -8 z" /></svg>;
    case "spark": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z" /></svg>;
    case "star": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M12 2 l2.6 6.6 7 .4 -5.4 4.6 1.8 6.8 -6 -3.8 -6 3.8 1.8 -6.8 -5.4 -4.6 7 -.4 z" /></svg>;
    case "diamond": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M12 2 L21 12 L12 22 L3 12 Z" /></svg>;
    case "ring": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><circle cx="12" cy="12" r="9" /></svg>;
    case "triangle": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M12 3 L21 20 L3 20 Z" /></svg>;
    case "plus": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M12 5 v14 M5 12 h14" /></svg>;
    case "wave": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M2 14 q4 -6 8 0 t8 0" /></svg>;
    case "heart": return <svg viewBox="0 0 18 18" style={s} fill="currentColor" aria-hidden><path d="M9 16 C2 11 1 6 4 4 C6 2.5 8 3.5 9 5 C10 3.5 12 2.5 14 4 C17 6 16 11 9 16 Z" /></svg>;
    case "leaf": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><path d="M4 20 C4 9 12 4 20 4 C20 15 12 20 4 20 Z" /><path d="M7 17 L17 7" /></svg>;
    case "enso": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M17 5 a9 9 0 1 0 3.5 4.5" /></svg>;
    case "boomerang": return <svg viewBox="0 0 34 34" style={s} fill="currentColor" aria-hidden><path d="M4 6 C16 8 24 16 28 28 L22 30 C19 20 13 13 3 11 Z" /></svg>;
    case "utensil": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden><path d="M7 2 v6 a2 2 0 0 0 4 0 V2 M9 2 v20 M17 2 c-2 1 -2 7 0 9 v11" /></svg>;
    case "asterisk": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M12 4 v16 M5 8 L19 16 M5 16 L19 8" /></svg>;
    case "square": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="4" y="4" width="16" height="16" rx="3" /></svg>;
    case "xmark": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden><path d="M6 6 L18 18 M18 6 L6 18" /></svg>;
    case "frame": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="8" cy="10" r="1.6" fill="currentColor" /></svg>;
    case "stamp": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="2 2.5" aria-hidden><circle cx="12" cy="12" r="9" /></svg>;
    case "chopstick": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M3 20 L20 4 M6 21 L22 8" /></svg>;
    case "arrow": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 14 q7 -8 16 -3 M15 6 l5 4 -4 5" /></svg>;
    case "folder": return <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M3 8 v11 a1 1 0 0 0 1 1 h16 a1 1 0 0 0 1 -1 V9 a1 1 0 0 0 -1 -1 h-8 l-2 -3 H4 a1 1 0 0 0 -1 1 z" /></svg>;
    default: return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><circle cx="12" cy="12" r="4" /></svg>;
  }
}

const FLOAT_SETS: Record<MenuDesign, { tint: string; glow?: boolean; kinds: string[] }> = {
  neon:       { tint: "text-primary", glow: true, kinds: ["star", "diamond", "ring", "triangle", "bolt"] },
  luxury:     { tint: "text-primary", glow: true, kinds: ["spark", "diamond", "dot", "star"] },
  classic:    { tint: "text-foreground", kinds: ["utensil", "diamond", "dot"] },
  minimal:    { tint: "text-foreground", kinds: ["dot", "plus"] },
  zen:        { tint: "text-primary", kinds: ["leaf", "enso", "wave", "dot"] },
  retro:      { tint: "text-primary", kinds: ["boomerang", "ring", "star", "wave"] },
  pastel:     { tint: "text-primary", kinds: ["heart", "star", "dot", "spark"] },
  kraft:      { tint: "text-foreground", kinds: ["stamp", "xmark", "star", "dot"] },
  bento:      { tint: "text-primary", kinds: ["square", "ring", "chopstick", "dot"] },
  elegant:    { tint: "text-primary", kinds: ["diamond", "spark", "dot"] },
  magazine:   { tint: "text-foreground", kinds: ["asterisk", "dot", "diamond"] },
  brutalist:  { tint: "text-foreground", kinds: ["square", "xmark", "asterisk", "triangle"] },
  gallery:    { tint: "text-foreground", kinds: ["frame", "spark", "dot"] },
  tabs:       { tint: "text-primary", kinds: ["folder", "dot", "plus"] },
  chalkboard: { tint: "text-foreground", kinds: ["star", "wave", "arrow", "dot"] },
  modern:     { tint: "text-primary", kinds: ["ring", "square", "plus", "dot"] }
};

// Fixed scatter of slots; each symbol wanders its own small loop (menu-roam).
const FLOAT_POS = [
  { left: "9%", top: "20%", s: 30, o: 0.18, dur: 16, delay: 0, dx: "5vw", dy: "-4vh", dr: "16deg" },
  { left: "80%", top: "15%", s: 34, o: 0.16, dur: 20, delay: 1.4, dx: "-5vw", dy: "5vh", dr: "-14deg" },
  { left: "67%", top: "62%", s: 26, o: 0.2, dur: 18, delay: 0.8, dx: "5vw", dy: "-3vh", dr: "20deg" },
  { left: "17%", top: "68%", s: 32, o: 0.15, dur: 22, delay: 2.1, dx: "-4vw", dy: "-6vh", dr: "-18deg" },
  { left: "45%", top: "33%", s: 24, o: 0.18, dur: 17, delay: 1.0, dx: "6vw", dy: "5vh", dr: "12deg" },
  { left: "90%", top: "46%", s: 28, o: 0.16, dur: 19, delay: 0.4, dx: "-6vw", dy: "-4vh", dr: "-22deg" },
  { left: "33%", top: "85%", s: 26, o: 0.17, dur: 15, delay: 2.6, dx: "4vw", dy: "-6vh", dr: "14deg" },
  { left: "57%", top: "88%", s: 22, o: 0.15, dur: 21, delay: 1.8, dx: "-5vw", dy: "-7vh", dr: "-12deg" }
];

export function FloatingSymbols({ design }: { design: MenuDesign }) {
  const set = FLOAT_SETS[design] ?? FLOAT_SETS.zen;
  const count = design === "minimal" ? 4 : 6; // keep it sparse — a few, not a wall
  return (
    <div aria-hidden className={cn("menu-motion -z-10", set.tint)}>
      {FLOAT_POS.slice(0, count).map((p, i) => (
        <span
          key={i}
          style={
            {
              left: p.left,
              top: p.top,
              opacity: p.o,
              filter: set.glow ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.7))" : undefined,
              "--dx": p.dx,
              "--dy": p.dy,
              "--dr": p.dr,
              animation: `menu-roam ${p.dur}s ease-in-out ${p.delay}s infinite`
            } as Vars
          }
        >
          <Glyph kind={set.kinds[i % set.kinds.length]} size={p.s} />
        </span>
      ))}
    </div>
  );
}

export function DesignMotion({ design }: { design: MenuDesign }) {
  switch (design) {
    case "zen":
      return <ZenMotion />;
    case "neon":
      return <NeonMotion />;
    case "retro":
      return <RetroMotion />;
    case "kraft":
      return <KraftMotion />;
    case "pastel":
      return <PastelMotion />;
    case "luxury":
      return <LuxuryMotion />;
    case "elegant":
      return <ElegantMotion />;
    case "chalkboard":
      return <ChalkboardMotion />;
    case "bento":
      return <BentoMotion />;
    case "modern":
      return <ModernMotion />;
    case "brutalist":
      return <BrutalistMotion />;
    default:
      // classic, minimal, gallery, magazine, tabs stay calm (no motion).
      return null;
  }
}
