import type { AppearanceSettings, MenuBackgroundPattern } from "@/types/models";
import {
  cssPatternStyle,
  floatingFigures,
  isFloatingIconPattern,
  type FloatingIconPattern
} from "@/lib/menu-patterns";

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

  return <FloatingIconsBackground pattern={(appearance?.backgroundPreset as FloatingIconPattern) || "cafe"} />;
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
  if (isFloatingIconPattern(pattern)) {
    return <FloatingIconsBackground pattern={pattern} color={color} baseColor={baseColor} />;
  }
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: baseColor }} aria-hidden>
      <div
        className={animated ? "menu-pattern-pan absolute inset-[-20%]" : "absolute inset-0"}
        style={cssPatternStyle(pattern, color)}
      />
    </div>
  );
}

// Drifting icon packs (cafe, bakery, drinks, …). Honors prefers-reduced-motion
// (globals.css). Hidden on phones — fixed animating layers can blank iOS WKWebView.
function FloatingIconsBackground({
  pattern = "cafe",
  color = "#3f8a49",
  baseColor
}: {
  pattern?: FloatingIconPattern;
  color?: string;
  baseColor?: string;
}) {
  const figures = floatingFigures(pattern);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden sm:block" aria-hidden>
      {baseColor ? (
        <div className="absolute inset-0" style={{ backgroundColor: baseColor }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-accent/45 via-background to-accent/25 dark:from-[#0c1810] dark:via-background dark:to-[#0a140b]" />
      )}

      <div className="aroma-1 aroma-pan absolute -left-24 -top-24 h-80 w-80 opacity-80" />
      <div
        className="aroma-2 aroma-pan absolute -bottom-32 -right-20 h-96 w-96 opacity-80"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="aroma-3 aroma-pan absolute right-1/3 top-1/3 h-56 w-56 opacity-80"
        style={{ animationDelay: "8s" }}
      />

      {figures.map(({ Icon, ...figure }, index) => (
        <span
          key={index}
          className="bean-float absolute"
          style={{
            top: figure.top,
            left: figure.left,
            animationDelay: figure.delay,
            opacity: figure.opacity,
            color
          }}
        >
          <Icon style={{ width: figure.size, height: figure.size }} aria-hidden />
        </span>
      ))}
    </div>
  );
}
