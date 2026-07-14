"use client";

import { Coffee, Contrast, Moon, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { WelcomeThemeIconStyle, WelcomeThemeToggleStyle } from "@/types/models";

export const publicThemeStorageKey = "stone-cafe-menu-theme";
export const publicThemeChangeEvent = "stone-cafe-menu-theme-change";
export const adminThemeStorageKey = "stone-cafe-admin-theme";
export const adminThemeChangeEvent = "stone-cafe-admin-theme-change";

export function ThemeToggle({
  className,
  storageKey = publicThemeStorageKey,
  changeEvent = publicThemeChangeEvent,
  presentation = "circle",
  iconStyle = "sunMoon"
}: {
  className?: string;
  storageKey?: string;
  changeEvent?: string;
  presentation?: WelcomeThemeToggleStyle;
  iconStyle?: WelcomeThemeIconStyle;
}) {
  const [dark, setDark] = useState(false);
  const [turns, setTurns] = useState(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const nextDark = stored === "dark";
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);

    function applyTheme(nextTheme: string | null) {
      const isDark = nextTheme === "dark";
      setDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    }

    function handleThemeChange(event: Event) {
      applyTheme((event as CustomEvent<string>).detail);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey) applyTheme(event.newValue);
    }

    window.addEventListener(changeEvent, handleThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(changeEvent, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [changeEvent, storageKey]);

  function toggle() {
    const next = !dark;
    setDark(next);
    setTurns((value) => value + 1);
    const nextTheme = next ? "dark" : "light";
    window.localStorage.setItem(storageKey, nextTheme);
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new CustomEvent(changeEvent, { detail: nextTheme }));
  }

  const IconLight = themeIcon(iconStyle, false);
  const IconDark = themeIcon(iconStyle, true);
  const presentationClass =
    presentation === "pill"
      ? "h-11 w-16 rounded-full px-3"
      : presentation === "segmented"
        ? "h-11 w-16 rounded-xl border-2 px-2 shadow-inner"
        : "h-11 w-11 rounded-full";
  const thumbClass =
    presentation === "segmented"
      ? "rounded-lg bg-muted/70 p-1"
      : presentation === "pill"
        ? "rounded-full bg-muted/70 p-1"
        : "";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      aria-pressed={dark}
      className={cn("group bg-card shadow-sm", presentationClass, className)}
    >
      <span
        className={cn("relative h-5 w-5 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]", thumbClass)}
        style={{ transform: `rotate(${turns * 360}deg)` }}
      >
        <IconLight
          className={cn(
            "absolute inset-0 h-5 w-5 text-amber-500 transition-all duration-500",
            dark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
          aria-hidden
        />
        <IconDark
          className={cn(
            "absolute inset-0 h-5 w-5 text-indigo-400 transition-all duration-500",
            dark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          )}
          aria-hidden
        />
      </span>
    </Button>
  );
}

function themeIcon(style: WelcomeThemeIconStyle, dark: boolean): LucideIcon {
  if (style === "coffeeMoon") return dark ? Moon : Coffee;
  if (style === "sparkles") return dark ? Moon : Sparkles;
  if (style === "contrast") return Contrast;
  return dark ? Moon : Sun;
}
