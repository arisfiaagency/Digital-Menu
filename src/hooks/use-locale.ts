"use client";

import { useEffect, useState } from "react";
import { dirForLocale, isLocale, type LocaleDirection } from "@/lib/i18n/config";
import type { Locale } from "@/types/models";

export const publicLocaleStorageKey = "stone-cafe-menu-locale";
export const publicLocaleChangeEvent = "stone-cafe-menu-locale-change";
export const adminLocaleStorageKey = "stone-cafe-admin-locale";
export const adminLocaleChangeEvent = "stone-cafe-admin-locale-change";

type DocumentDirection = "locale" | LocaleDirection | false;

export function useLocale(
  defaultLocale: Locale = "ckb",
  options: {
    documentDirection?: DocumentDirection;
    storageKey?: string;
    changeEvent?: string;
    readStored?: boolean;
  } = {}
) {
  const documentDirection = options.documentDirection ?? "locale";
  const storageKey = options.storageKey ?? publicLocaleStorageKey;
  const changeEvent = options.changeEvent ?? publicLocaleChangeEvent;
  const readStored = options.readStored ?? true;
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = readStored ? window.localStorage.getItem(storageKey) : null;
    if (isLocale(stored)) setLocaleState(stored);

    function handleLocaleChange(event: Event) {
      const nextLocale = (event as CustomEvent<Locale>).detail;
      if (isLocale(nextLocale)) setLocaleState(nextLocale);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey && isLocale(event.newValue)) {
        setLocaleState(event.newValue);
      }
    }

    window.addEventListener(changeEvent, handleLocaleChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(changeEvent, handleLocaleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [changeEvent, readStored, storageKey]);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (documentDirection) {
      document.documentElement.dir = documentDirection === "locale" ? dirForLocale(locale) : documentDirection;
    }
  }, [documentDirection, locale]);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem(storageKey, nextLocale);
    window.dispatchEvent(new CustomEvent(changeEvent, { detail: nextLocale }));
  }

  return { locale, setLocale, dir: dirForLocale(locale) };
}
