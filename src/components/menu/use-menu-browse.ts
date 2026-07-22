"use client";

import { useMemo, useState } from "react";
import { normalizeSearch } from "@/lib/utils/format";
import type { AppData, Category, MenuItem } from "@/types/models";

export type MenuSection = { category: Category; items: MenuItem[] };

export type MenuBrowse = {
  query: string;
  setQuery: (value: string) => void;
  /** Active categories that still have visible items after filtering. */
  sections: MenuSection[];
  /** Visible items whose category is missing/inactive — shown as an "Others" bucket. */
  orphanItems: MenuItem[];
  /** All items passing the sold-out + search filter (across every category). */
  visibleItems: MenuItem[];
  hasResults: boolean;
};

// Shared browsing state for every menu design: sold-out visibility, search over
// name/description/category (locale-aware, accent-insensitive), and grouping into
// per-category sections + an "Others" bucket. Each design renders these however
// it likes; only the data shaping lives here.
export function useMenuBrowse(data: AppData): MenuBrowse {
  const [query, setQuery] = useState("");

  const visibleItems = useMemo(() => {
    const q = normalizeSearch(query);
    return data.menuItems.filter((item) => {
      if (!data.menu.showSoldOutItems && item.isSoldOut) return false;
      if (!q) return true;
      const category = data.categories.find((entry) => entry.id === item.categoryId);
      const haystack = normalizeSearch(
        [
          ...Object.values(item.name),
          ...Object.values(item.description || {}),
          ...(category ? Object.values(category.name) : [])
        ].join(" ")
      );
      return haystack.includes(q);
    });
  }, [data, query]);

  const sections = useMemo(
    () =>
      data.categories
        .filter((category) => category.isActive)
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((category) => ({ category, items: visibleItems.filter((item) => item.categoryId === category.id) }))
        .filter((section) => section.items.length),
    [data.categories, visibleItems]
  );

  const orphanItems = useMemo(() => {
    const known = new Set(data.categories.filter((c) => c.isActive).map((category) => category.id));
    return visibleItems.filter((item) => !known.has(item.categoryId));
  }, [data.categories, visibleItems]);

  return {
    query,
    setQuery,
    sections,
    orphanItems,
    visibleItems,
    hasResults: visibleItems.length > 0
  };
}
