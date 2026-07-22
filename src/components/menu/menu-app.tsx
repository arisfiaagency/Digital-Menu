"use client";

import { LuxuryMenu } from "@/components/menu/luxury-menu";
import { ModernMenu } from "@/components/menu/modern-menu";
import { ClassicMenu } from "@/components/menu/classic-menu";
import { MinimalMenu } from "@/components/menu/minimal-menu";
import { defaultAppData } from "@/data/default-data";
import type { AppData, MenuDesign } from "@/types/models";

// Entry point for the customer-facing menu. The design is chosen by the platform
// admin when the cafe is created and locked afterwards (stored on the client
// account doc). This dispatcher just renders the matching design; each design
// owns its whole layout and shares the cart, item detail modal, and browse hook.
export function MenuApp({
  initialData,
  design = "classic",
  accent
}: {
  initialData?: AppData;
  design?: MenuDesign;
  accent?: string;
}) {
  const data = initialData ?? defaultAppData;
  switch (design) {
    case "luxury":
      return <LuxuryMenu data={data} accent={accent} />;
    case "modern":
      return <ModernMenu data={data} accent={accent} />;
    case "minimal":
      return <MinimalMenu data={data} accent={accent} />;
    case "classic":
    default:
      return <ClassicMenu data={data} accent={accent} />;
  }
}
