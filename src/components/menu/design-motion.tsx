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
  const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    // ── food & drink ─────────────────────────────
    case "coffee": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M5 8h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" /><path d="M16 9h2a2 2 0 0 1 0 4h-1" /><path d="M4 21h13" /></svg>;
    case "cocktail": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M4 5h16l-8 8z" /><path d="M12 13v6M8 19h8" /></svg>;
    case "wine": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M8 3h8c0 5-2 8-4 8s-4-3-4-8z" /><path d="M12 11v7M8 21h8" /></svg>;
    case "milkshake": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M7 8h10l-1 12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" /><path d="M8 8a4 3 0 0 1 8 0M14 4v4" /></svg>;
    case "icecream": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M8 9a4 4 0 0 1 8 0z" /><path d="M8 9l4 12 4-12" /></svg>;
    case "cupcake": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M6 11h12l-1.5 8a1 1 0 0 1-1 1H8.5a1 1 0 0 1-1-1z" /><path d="M6 11a6 5 0 0 1 12 0M12 3v3" /></svg>;
    case "croissant": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M3 16c3-9 15-9 18 0c-4-2-6 4-9 4s-5-6-9-4z" /></svg>;
    case "sushi": return <svg viewBox="0 0 24 24" style={s} aria-hidden><rect x="3" y="13" width="18" height="6" rx="3" fill="none" stroke="currentColor" strokeWidth={1.8} /><path d="M4 13a9 4 0 0 1 16 0z" fill="currentColor" /></svg>;
    case "onigiri": return <svg viewBox="0 0 24 24" style={s} aria-hidden><path d="M12 4l8 15H4z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" /><rect x="8" y="14" width="8" height="5" fill="currentColor" /></svg>;
    case "fish": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M3 12c4-6 12-6 16 0c-4 6-12 6-16 0z" /><path d="M19 12l3-3v6z" /></svg>;
    case "bean": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><ellipse cx="12" cy="12" rx="6" ry="9" transform="rotate(28 12 12)" /><path d="M10 5c2 4 2 10 0 14" /></svg>;
    case "wheat": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.6} aria-hidden><path d="M12 22V6M12 6q-3-1-3-4 3 0 3 3M12 6q3-1 3-4-3 0-3 3M12 12q-3-1-3-4 3 0 3 3M12 12q3-1 3-4-3 0-3 3M12 17q-3-1-3-4 3 0 3 3M12 17q3-1 3-4-3 0-3 3" /></svg>;
    case "spoon": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M12 12v9" /><path d="M12 12c-2.4 0-4-2-4-4.5S9.6 3 12 3s4 2 4 4.5S14.4 12 12 12z" /></svg>;
    case "utensil": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.6} aria-hidden><path d="M7 2v6a2 2 0 0 0 4 0V2M9 2v20M17 2c-2 1-2 7 0 9v11" /></svg>;
    case "chopstick": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2} aria-hidden><path d="M3 20L20 4M6 21L22 8" /></svg>;
    // ── nature / zen ─────────────────────────────
    case "enso": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2.4} aria-hidden><path d="M17 5a9 9 0 1 0 3.5 4.5" /></svg>;
    case "leaf": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.6} aria-hidden><path d="M4 20C4 9 12 4 20 4C20 15 12 20 4 20z" /><path d="M7 17L17 7" /></svg>;
    case "lotus": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M12 20c-8-4-8-10-8-10 4 0 6 3 8 10 2-7 4-10 8-10 0 0 0 6-8 10z" opacity=".85" /><path d="M12 20c-2-8 0-14 0-14s2 6 0 14z" /></svg>;
    case "flower": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><circle cx="12" cy="5.5" r="3" /><circle cx="18.5" cy="10" r="3" /><circle cx="16" cy="17.5" r="3" /><circle cx="8" cy="17.5" r="3" /><circle cx="5.5" cy="10" r="3" /><circle cx="12" cy="12" r="3" fill="hsl(var(--background))" /></svg>;
    case "wave": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2} aria-hidden><path d="M2 14q4-6 8 0t8 0" /></svg>;
    // ── objects ──────────────────────────────────
    case "crown": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M4 8l3 8h10l3-8-5 4-3-6-3 6z" /><path d="M6 19h12" /></svg>;
    case "camera": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.4" /><path d="M8 7l1.5-2h5L16 7" /></svg>;
    case "frame": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M7 17l4-4 3 2 3-4 3 6" /></svg>;
    case "bookmark": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z" /></svg>;
    case "folder": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M3 8v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-8l-2-3H4a1 1 0 0 0-1 1z" /></svg>;
    case "boomerang": return <svg viewBox="0 0 34 34" style={s} fill="currentColor" aria-hidden><path d="M4 6C16 8 24 16 28 28L22 30C19 20 13 13 3 11z" /></svg>;
    // ── marks ────────────────────────────────────
    case "bolt": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M13 2L5 14h5l-1 8 8-12h-5l1-8z" /></svg>;
    case "moon": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M20 14A8 8 0 1 1 11 4a6 6 0 1 0 9 10z" /></svg>;
    case "star": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M12 2l2.6 6.6 7 .4-5.4 4.6 1.8 6.8-6-3.8-6 3.8 1.8-6.8-5.4-4.6 7-.4z" /></svg>;
    case "spark": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M12 1l2 9 9 2-9 2-2 9-2-9-9-2 9-2z" /></svg>;
    case "heart": return <svg viewBox="0 0 18 18" style={s} fill="currentColor" aria-hidden><path d="M9 16C2 11 1 6 4 4C6 2.5 8 3.5 9 5C10 3.5 12 2.5 14 4C17 6 16 11 9 16z" /></svg>;
    case "diamond": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2} aria-hidden><path d="M12 2L21 12L12 22L3 12z" /></svg>;
    case "musicnote": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={1.8} aria-hidden><path d="M8 17.5V6l9-2v11.5" /><circle cx="6" cy="17.5" r="2.2" fill="currentColor" stroke="none" /><circle cx="15" cy="15.5" r="2.2" fill="currentColor" stroke="none" /></svg>;
    case "arrow": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2.2} aria-hidden><path d="M3 14q7-8 16-3M15 6l5 4-4 5" /></svg>;
    case "asterisk": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2.4} aria-hidden><path d="M12 4v16M5 8l14 8M5 16l14-8" /></svg>;
    case "quote": return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><path d="M6 14c0-4 2-6 5-6v2c-2 0-3 1-3 3h3v5H6zM14 14c0-4 2-6 5-6v2c-2 0-3 1-3 3h3v5h-5z" /></svg>;
    case "ampersand": return <svg viewBox="0 0 24 24" style={s} aria-hidden><text x="12" y="19" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fontStyle="italic" fill="currentColor">&amp;</text></svg>;
    case "hash": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2} aria-hidden><path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16" /></svg>;
    case "square": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2} aria-hidden><rect x="4" y="4" width="16" height="16" rx="3" /></svg>;
    case "xmark": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={3} aria-hidden><path d="M6 6L18 18M18 6L6 18" /></svg>;
    case "triangle": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2} aria-hidden><path d="M12 3L21 20L3 20z" /></svg>;
    case "ring": return <svg viewBox="0 0 24 24" style={s} {...line} strokeWidth={2} aria-hidden><circle cx="12" cy="12" r="9" /></svg>;
    default: return <svg viewBox="0 0 24 24" style={s} fill="currentColor" aria-hidden><circle cx="12" cy="12" r="4" /></svg>;
  }
}

// Each design's symbols relate to its name/theme (drinks, food, motifs) — not
// generic geometry.
const FLOAT_SETS: Record<MenuDesign, { tint: string; glow?: boolean; kinds: string[] }> = {
  neon:       { tint: "text-primary", glow: true, kinds: ["cocktail", "star", "moon", "bolt"] },
  luxury:     { tint: "text-primary", glow: true, kinds: ["crown", "diamond", "spark", "wine"] },
  classic:    { tint: "text-foreground", kinds: ["utensil", "coffee", "spoon"] },
  minimal:    { tint: "text-foreground", kinds: ["dot", "ring"] },
  zen:        { tint: "text-primary", kinds: ["enso", "leaf", "lotus", "wave"] },
  retro:      { tint: "text-primary", kinds: ["boomerang", "milkshake", "star", "musicnote"] },
  pastel:     { tint: "text-primary", kinds: ["cupcake", "heart", "icecream", "flower"] },
  kraft:      { tint: "text-foreground", kinds: ["wheat", "bean", "croissant", "leaf"] },
  bento:      { tint: "text-primary", kinds: ["sushi", "onigiri", "chopstick", "fish"] },
  elegant:    { tint: "text-primary", kinds: ["wine", "spark", "diamond", "leaf"] },
  magazine:   { tint: "text-foreground", kinds: ["quote", "asterisk", "ampersand", "hash"] },
  brutalist:  { tint: "text-foreground", kinds: ["square", "xmark", "asterisk", "triangle"] },
  gallery:    { tint: "text-foreground", kinds: ["camera", "frame", "spark"] },
  tabs:       { tint: "text-primary", kinds: ["folder", "bookmark", "hash"] },
  chalkboard: { tint: "text-foreground", kinds: ["coffee", "star", "arrow", "heart"] },
  modern:     { tint: "text-primary", kinds: ["star", "heart", "bolt", "coffee"] }
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
