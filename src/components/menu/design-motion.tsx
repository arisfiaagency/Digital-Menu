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

function Dragon() {
  return (
    <svg width="230" height="96" viewBox="0 0 230 96" fill="none" aria-hidden>
      {/* body */}
      <path d="M14 60 C50 26 84 86 120 52 C150 28 176 66 200 50" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      {/* mane spikes */}
      <g fill="currentColor">
        <path d="M56 44 l6 -13 6 10 z" />
        <path d="M92 58 l6 -13 6 10 z" />
        <path d="M120 44 l6 -13 6 10 z" />
        <path d="M150 40 l6 -12 6 9 z" />
        <path d="M176 52 l6 -12 6 9 z" />
      </g>
      {/* tail fin */}
      <path d="M14 60 l-12 -9 4 9 -4 9 z" fill="currentColor" />
      {/* head */}
      <path d="M198 42 q16 -2 22 8 q4 8 -4 12 q-12 6 -20 -4 q-6 -9 2 -16 z" fill="currentColor" />
      <path d="M204 34 l-5 -12 M214 34 l3 -13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="212" cy="46" r="2.2" fill="hsl(var(--background))" />
      <path d="M214 58 C206 66 196 66 186 70 M210 60 C204 70 194 72 184 78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
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
      {/* The dragon, soaring across every loop. */}
      <div style={{ top: 0, left: 0, opacity: 0.5, animation: "menu-dragon 15s linear infinite" }}>
        <Dragon />
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
      <div
        style={{
          top: 0,
          left: 0,
          width: 26,
          height: 26,
          background: "currentColor",
          opacity: 0.5,
          animation: "menu-glide 11s steps(24, end) infinite"
        }}
      />
    </Stage>
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
