"use client";

import { Coffee, Contrast, Moon, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminThemeStorageKey,
  adminThemeChangeEvent,
  adminThemeStorageKeyFor,
  adminThemeChangeEventFor
} from "@/lib/admin-theme";
import { cn } from "@/lib/utils/cn";
import type { ThemeIconStyle, ThemeToggleStyle } from "@/types/models";

export const publicThemeStorageKey = "stone-cafe-menu-theme";
export const publicThemeChangeEvent = "stone-cafe-menu-theme-change";
export {
  adminThemeStorageKey,
  adminThemeChangeEvent,
  adminThemeStorageKeyFor,
  adminThemeChangeEventFor
};

type ThemeStorageMode = "local" | "session";

function isTheme(value: string | null): value is "dark" | "light" {
  return value === "dark" || value === "light";
}

function readStoredTheme(storageKey: string, storageMode: ThemeStorageMode) {
  if (storageMode === "session") {
    const sessionValue = window.sessionStorage.getItem(storageKey);
    if (isTheme(sessionValue)) return sessionValue;

    // New tab: seed from this device's last-used admin theme, then keep it
    // isolated in sessionStorage so other open tabs/windows are not updated live.
    const localValue = window.localStorage.getItem(storageKey);
    if (isTheme(localValue)) {
      window.sessionStorage.setItem(storageKey, localValue);
      return localValue;
    }

    if (storageKey.startsWith("stone-cafe-admin-theme:")) {
      const legacy = window.localStorage.getItem(adminThemeStorageKey);
      if (isTheme(legacy)) {
        window.sessionStorage.setItem(storageKey, legacy);
        return legacy;
      }
    }
    return null;
  }

  const scoped = window.localStorage.getItem(storageKey);
  if (isTheme(scoped)) return scoped;

  if (storageKey.startsWith("stone-cafe-admin-theme:")) {
    const legacy = window.localStorage.getItem(adminThemeStorageKey);
    if (isTheme(legacy)) {
      window.localStorage.setItem(storageKey, legacy);
      return legacy;
    }
  }
  return null;
}

function writeStoredTheme(storageKey: string, storageMode: ThemeStorageMode, nextTheme: "dark" | "light") {
  if (storageMode === "session") {
    window.sessionStorage.setItem(storageKey, nextTheme);
    // Remember as default for future new tabs on this device only — do not sync live.
    window.localStorage.setItem(storageKey, nextTheme);
    return;
  }
  window.localStorage.setItem(storageKey, nextTheme);
}

export function ThemeToggle({
  className,
  storageKey = publicThemeStorageKey,
  changeEvent = publicThemeChangeEvent,
  storageMode = "local",
  presentation = "circle",
  iconStyle = "sunMoon"
}: {
  className?: string;
  storageKey?: string;
  changeEvent?: string;
  /** `session` = per tab/window (admin). `local` = shared across tabs (public menu). */
  storageMode?: ThemeStorageMode;
  presentation?: ThemeToggleStyle;
  iconStyle?: ThemeIconStyle;
}) {
  const [dark, setDark] = useState(false);
  const [turns, setTurns] = useState(0);

  useEffect(() => {
    const stored = readStoredTheme(storageKey, storageMode);
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
      // Only public (localStorage) theme syncs across tabs. Admin uses sessionStorage
      // so two computers / windows of the same cafe admin stay independent.
      if (storageMode !== "local") return;
      if (event.key === storageKey) applyTheme(event.newValue);
    }

    window.addEventListener(changeEvent, handleThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(changeEvent, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [changeEvent, storageKey, storageMode]);

  function toggle() {
    const next = !dark;
    setDark(next);
    setTurns((value) => value + 1);
    const nextTheme = next ? "dark" : "light";
    writeStoredTheme(storageKey, storageMode, nextTheme);
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

function themeIcon(style: ThemeIconStyle, dark: boolean): LucideIcon {
  if (style === "coffeeMoon") return dark ? Moon : Coffee;
  if (style === "sparkles") return dark ? Moon : Sparkles;
  if (style === "contrast") return Contrast;
  return dark ? Moon : Sun;
}
