import type { FieldErrors } from "react-hook-form";

// Walks the (possibly nested) react-hook-form errors object in order and returns the dotted path of
// the first invalid field, e.g. "categoryId" or "name.en".
function firstErrorPath(errors: Record<string, unknown>): string | null {
  for (const key of Object.keys(errors)) {
    const value = errors[key];
    if (!value || typeof value !== "object") continue;
    // A leaf FieldError carries `message`/`type`; a nested group is just an object of sub-errors.
    if ("message" in value || "type" in value) return key;
    const nested = firstErrorPath(value as Record<string, unknown>);
    if (nested) return `${key}.${nested}`;
  }
  return null;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Scrolls a field into view, focuses it, and flashes a red ring ~3 times to draw attention. */
export function pulseAndFocusField(el: HTMLElement | null) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  if (typeof el.animate !== "function" || prefersReducedMotion()) return;
  // Use the theme's destructive colour if present, else a sensible red.
  const destructive =
    typeof getComputedStyle === "function"
      ? getComputedStyle(document.documentElement).getPropertyValue("--destructive").trim()
      : "";
  const ring = destructive ? `hsl(${destructive} / 0.5)` : "rgba(220, 38, 38, 0.5)";
  // Web Animations API (not a CSS class) so a React re-render of a controlled input can't wipe it.
  el.animate(
    [
      { boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
      { boxShadow: `0 0 0 4px ${ring}` },
      { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
    ],
    { duration: 520, iterations: 3, easing: "ease-in-out" }
  );
}

/**
 * react-hook-form invalid-submit handler: jumps to the first empty/invalid field and pulses it.
 * Pass as the SECOND arg to `handleSubmit(onValid, focusFirstInvalidField)`.
 */
export function focusFirstInvalidField(errors: FieldErrors) {
  if (typeof document === "undefined") return;
  const name = firstErrorPath(errors as Record<string, unknown>);
  if (!name) return;
  requestAnimationFrame(() => {
    const target =
      document.querySelector<HTMLElement>(`[name="${name}"]`) ??
      document.querySelector<HTMLElement>(`[name^="${name}."]`);
    pulseAndFocusField(target);
  });
}
