import { describe, expect, it } from "vitest";
import { defaultAppData } from "@/data/default-data";
import { demoCategories, demoMenuItems, withDemoMenuCatalog } from "@/data/demo-menu";
import type { ClientAccount } from "@/types/models";

const emptyCafe = {
  ...defaultAppData,
  categories: [],
  menuItems: []
};

const clientOn = { demoMenuEnabled: true } as ClientAccount;
const clientOff = { demoMenuEnabled: false } as ClientAccount;

describe("withDemoMenuCatalog", () => {
  it("injects sample categories and items when the cafe menu is empty and demo is on", () => {
    const next = withDemoMenuCatalog(emptyCafe, clientOn);
    expect(next.categories).toHaveLength(4);
    expect(next.menuItems).toHaveLength(20);
    expect(next.categories[0].id).toMatch(/^demo-/);
    expect(next.menuItems[0].id).toMatch(/^demo-/);
  });

  it("does nothing when demo is off", () => {
    const next = withDemoMenuCatalog(emptyCafe, clientOff);
    expect(next.categories).toHaveLength(0);
    expect(next.menuItems).toHaveLength(0);
  });

  it("does not replace real menu items", () => {
    const next = withDemoMenuCatalog(defaultAppData, clientOn);
    expect(next.menuItems).toEqual(defaultAppData.menuItems);
    expect(next.categories).toEqual(defaultAppData.categories);
  });

  it("defaults demo on when the flag is missing", () => {
    const next = withDemoMenuCatalog(emptyCafe, {} as ClientAccount);
    expect(next.menuItems).toHaveLength(demoMenuItems.length);
    expect(next.categories).toHaveLength(demoCategories.length);
  });

  it("gives each sample item a static public image (not R2 / not Firestore)", () => {
    for (const entry of demoMenuItems) {
      expect(entry.imageUrl).toMatch(/^\/demo-menu\/.+\.svg$/);
      expect(entry.imagePath).toBeUndefined();
    }
    const urls = new Set(demoMenuItems.map((entry) => entry.imageUrl));
    expect(urls.size).toBe(demoMenuItems.length);
  });
});
