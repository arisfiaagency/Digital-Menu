import { CakeSlice, Coffee, Croissant, CupSoda, GlassWater, Martini, Pizza, Sandwich } from "lucide-react";
import type { CSSProperties } from "react";
import type { AppearanceSettings, MenuBackgroundPattern } from "@/types/models";

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
    const imageStyle = appearance.backgroundImageStyle ?? "cover";
    return (
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div
          className="absolute inset-0 bg-center"
          style={{
            backgroundImage: `url(${appearance.backgroundImageUrl})`,
            backgroundSize: imageStyle === "tile" ? "220px auto" : imageStyle,
            backgroundRepeat: imageStyle === "tile" ? "repeat" : "no-repeat",
            backgroundAttachment: imageStyle === "fixed" ? "fixed" : undefined
          }}
        />
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} />
      </div>
    );
  }

  if (type === "pattern") {
    return (
      <PatternBackground
        pattern={appearance?.backgroundPattern ?? "dots"}
        color={appearance?.backgroundPatternColor || appearance?.primaryColor || "#3f8a49"}
        baseColor={appearance?.backgroundColor || "#ffffff"}
        animated={appearance?.backgroundPatternAnimated !== false}
      />
    );
  }

  return <PresetBackground />;
}

function PatternBackground({
  pattern,
  color,
  baseColor,
  animated
}: {
  pattern: MenuBackgroundPattern;
  color: string;
  baseColor: string;
  animated: boolean;
}) {
  if (pattern === "none") {
    return <div className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundColor: baseColor }} aria-hidden />;
  }
  if (pattern === "cafe") return <PresetBackground />;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: baseColor }} aria-hidden>
      <div
        className={animated ? "menu-pattern-pan absolute inset-[-20%]" : "absolute inset-0"}
        style={patternStyle(pattern, color)}
      />
    </div>
  );
}

function patternStyle(pattern: MenuBackgroundPattern, color: string): CSSProperties {
  const base: CSSProperties = { color, opacity: 0.18 };
  if (pattern === "grid") {
    return {
      ...base,
      backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
      backgroundSize: "34px 34px"
    };
  }
  if (pattern === "diagonal") {
    return {
      ...base,
      backgroundImage: "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 18px)"
    };
  }
  if (pattern === "waves") {
    return {
      ...base,
      backgroundImage: "radial-gradient(70% 60% at 50% 100%, transparent 58%, currentColor 60%, transparent 62%)",
      backgroundSize: "58px 32px"
    };
  }
  if (pattern === "checker") {
    return {
      ...base,
      backgroundImage: "linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%), linear-gradient(45deg, transparent 75%, currentColor 75%), linear-gradient(-45deg, transparent 75%, currentColor 75%)",
      backgroundPosition: "0 0, 0 14px, 14px -14px, -14px 0",
      backgroundSize: "28px 28px"
    };
  }
  if (pattern === "confetti") {
    return {
      ...base,
      backgroundImage: "radial-gradient(circle at 20% 30%, currentColor 0 2px, transparent 2px), radial-gradient(circle at 70% 65%, currentColor 0 1.5px, transparent 1.5px), linear-gradient(35deg, transparent 45%, currentColor 45% 48%, transparent 48%)",
      backgroundSize: "64px 64px"
    };
  }
  if (pattern === "stars") {
    return {
      ...base,
      backgroundImage: "radial-gradient(circle at 50% 50%, currentColor 0 1.4px, transparent 1.6px), radial-gradient(circle at 15% 20%, currentColor 0 1px, transparent 1.2px)",
      backgroundSize: "44px 44px"
    };
  }
  if (pattern === "mesh") {
    return {
      ...base,
      opacity: 0.26,
      backgroundImage: "radial-gradient(circle at 20% 20%, currentColor, transparent 30%), radial-gradient(circle at 80% 30%, currentColor, transparent 28%), radial-gradient(circle at 45% 80%, currentColor, transparent 34%)",
      backgroundSize: "360px 360px"
    };
  }
  return {
    ...base,
    backgroundImage: "radial-gradient(currentColor 1.6px, transparent 1.6px)",
    backgroundSize: "22px 22px"
  };
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
