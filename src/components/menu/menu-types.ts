import type { AppData } from "@/types/models";

// Every menu design ("skin") receives the same contract: the cafe's menu content
// (categories, items, general + menu settings) plus the per-cafe accent color the
// platform admin locked in at creation. The design owns its entire layout.
export type MenuDesignProps = {
  data: AppData;
  accent?: string;
};
