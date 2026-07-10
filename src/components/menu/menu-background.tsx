import { CakeSlice, Coffee, Croissant, CupSoda, GlassWater, Martini, Pizza, Sandwich } from "lucide-react";
import type { AppearanceSettings } from "@/types/models";

// Public menu background. The cafe chooses the type in the /admin designer:
//   preset   → the drifting coffee-shop animation (default, original look)
//   solid    → a single background color
//   gradient → a top-to-bottom two-color gradient
//   image    → an uploaded photo with a dark scrim for readability
// Rendered as a fixed layer behind the page so it stays put while the menu scrolls.
export function MenuBackground({ appearance }: { appearance?: AppearanceSettings }) {
  const type = appearance?.backgroundType ?? "preset";

  if (type === "solid") {
    return (
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundColor: appearance?.backgroundColor || "#ffffff" }}
        aria-hidden
      />
    );
  }

  if (type === "gradient") {
    const from = appearance?.backgroundGradientFrom || "#ecfdf5";
    const to = appearance?.backgroundGradientTo || "#ffffff";
    return (
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: `linear-gradient(to bottom, ${from}, ${to})` }}
        aria-hidden
      />
    );
  }

  if (type === "image" && appearance?.backgroundImageUrl) {
    const overlay = Math.min(100, Math.max(0, appearance?.backgroundOverlay ?? 45)) / 100;
    return (
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${appearance.backgroundImageUrl})` }}
        />
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} />
      </div>
    );
  }

  return <PresetBackground />;
}

// The original drifting coffee-shop animation, tuned softly so menu content stays
// readable. Honors prefers-reduced-motion (globals.css).
//
// Hidden on phones (`hidden sm:block`): a full-viewport `position: fixed` layer
// with many infinitely-animating children makes iOS in-app browsers (Instagram /
// Facebook WKWebView) drop the paint during fast momentum scrolling — the page
// goes blank until a refresh. Desktop keeps the full effect.
function PresetBackground() {
  const figures = [
    { Icon: Coffee, top: "8%", left: "5%", size: 34, delay: "0s", opacity: 0.14 },
    { Icon: Martini, top: "16%", left: "89%", size: 36, delay: "1.2s", opacity: 0.13 },
    { Icon: Croissant, top: "34%", left: "3%", size: 32, delay: "0.6s", opacity: 0.14 },
    { Icon: CupSoda, top: "44%", left: "94%", size: 30, delay: "1s", opacity: 0.13 },
    { Icon: CakeSlice, top: "62%", left: "6%", size: 32, delay: "2s", opacity: 0.14 },
    { Icon: Pizza, top: "70%", left: "91%", size: 34, delay: "0.4s", opacity: 0.13 },
    { Icon: Sandwich, top: "86%", left: "10%", size: 32, delay: "1.6s", opacity: 0.14 },
    { Icon: GlassWater, top: "90%", left: "85%", size: 28, delay: "2.4s", opacity: 0.13 }
  ];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden sm:block" aria-hidden>
      {/* light mint wash that ties to the welcome page */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/45 via-background to-accent/25 dark:from-[#0c1810] dark:via-background dark:to-[#0a140b]" />

      {/* drifting aroma glows */}
      <div className="aroma-1 aroma-pan absolute -left-24 -top-24 h-80 w-80 opacity-80" />
      <div
        className="aroma-2 aroma-pan absolute -bottom-32 -right-20 h-96 w-96 opacity-80"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="aroma-3 aroma-pan absolute right-1/3 top-1/3 h-56 w-56 opacity-80"
        style={{ animationDelay: "8s" }}
      />

      {/* floating menu figures */}
      {figures.map(({ Icon, ...figure }, index) => (
        <span
          key={index}
          className="bean-float absolute text-[#3f8a49] dark:text-[#A4D8A6]"
          style={{ top: figure.top, left: figure.left, animationDelay: figure.delay, opacity: figure.opacity }}
        >
          <Icon style={{ width: figure.size, height: figure.size }} aria-hidden />
        </span>
      ))}
    </div>
  );
}
