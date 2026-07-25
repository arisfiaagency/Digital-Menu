"use client";

import { createContext, useContext, type ReactNode } from "react";

// Per-cafe toggles for the decorative layers, chosen by the platform admin in the
// Menu Design editor and read deep in the tree by DesignBackdrop / DesignMotion
// (via context, so we don't thread props through all 16 design components).
export type MenuChrome = {
  backdrop: boolean; // roaming background symbols + glow behind the menu
  mascot: boolean; // the animated mascot (koi, comet, paper plane, …)
  speed: number; // mascot speed multiplier (1 = normal, >1 faster)
  slug?: string; // cafe slug, used to submit ratings from the public menu
  ratingAvg?: number; // aggregated average rating (0 when none yet)
  ratingCount?: number; // number of ratings received
};

export const MENU_CHROME_DEFAULT: MenuChrome = { backdrop: true, mascot: true, speed: 1 };

const MenuChromeContext = createContext<MenuChrome>(MENU_CHROME_DEFAULT);

export function MenuChromeProvider({ value, children }: { value: MenuChrome; children: ReactNode }) {
  return <MenuChromeContext.Provider value={value}>{children}</MenuChromeContext.Provider>;
}

export function useMenuChrome(): MenuChrome {
  return useContext(MenuChromeContext);
}
