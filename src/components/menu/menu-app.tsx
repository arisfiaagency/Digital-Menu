"use client";

import { LuxuryMenu } from "@/components/menu/luxury-menu";
import { ModernMenu } from "@/components/menu/modern-menu";
import { ClassicMenu } from "@/components/menu/classic-menu";
import { MinimalMenu } from "@/components/menu/minimal-menu";
import { NeonMenu } from "@/components/menu/neon-menu";
import { GalleryMenu } from "@/components/menu/gallery-menu";
import { ChalkboardMenu } from "@/components/menu/chalkboard-menu";
import { TabsMenu } from "@/components/menu/tabs-menu";
import { RetroMenu } from "@/components/menu/retro-menu";
import { PastelMenu } from "@/components/menu/pastel-menu";
import { KraftMenu } from "@/components/menu/kraft-menu";
import { BentoMenu } from "@/components/menu/bento-menu";
import { ElegantMenu } from "@/components/menu/elegant-menu";
import { MagazineMenu } from "@/components/menu/magazine-menu";
import { BrutalistMenu } from "@/components/menu/brutalist-menu";
import { ZenMenu } from "@/components/menu/zen-menu";
import { defaultAppData } from "@/data/default-data";
import { menuAccentCss } from "@/lib/utils/accent";
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
  return (
    <>
      {/* Recolor the whole design from the cafe's accent (light + dark). */}
      <style dangerouslySetInnerHTML={{ __html: menuAccentCss(accent) }} />
      {renderDesign(design, data, accent)}
    </>
  );
}

function renderDesign(design: MenuDesign, data: AppData, accent?: string) {
  switch (design) {
    case "luxury":
      return <LuxuryMenu data={data} accent={accent} />;
    case "modern":
      return <ModernMenu data={data} accent={accent} />;
    case "minimal":
      return <MinimalMenu data={data} accent={accent} />;
    case "neon":
      return <NeonMenu data={data} accent={accent} />;
    case "gallery":
      return <GalleryMenu data={data} accent={accent} />;
    case "chalkboard":
      return <ChalkboardMenu data={data} accent={accent} />;
    case "tabs":
      return <TabsMenu data={data} accent={accent} />;
    case "retro":
      return <RetroMenu data={data} accent={accent} />;
    case "pastel":
      return <PastelMenu data={data} accent={accent} />;
    case "kraft":
      return <KraftMenu data={data} accent={accent} />;
    case "bento":
      return <BentoMenu data={data} accent={accent} />;
    case "elegant":
      return <ElegantMenu data={data} accent={accent} />;
    case "magazine":
      return <MagazineMenu data={data} accent={accent} />;
    case "brutalist":
      return <BrutalistMenu data={data} accent={accent} />;
    case "zen":
      return <ZenMenu data={data} accent={accent} />;
    case "classic":
    default:
      return <ClassicMenu data={data} accent={accent} />;
  }
}
