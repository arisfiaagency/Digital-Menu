import { describe, expect, it } from "vitest";
import { formatMoney, normalizeSearch, slugify } from "@/lib/utils/format";

describe("format helpers", () => {
  it("formats IQD without decimals", () => {
    expect(formatMoney(5000, "IQD", "en")).toBe("5,000 IQD");
  });

  it("creates slugs from multilingual names", () => {
    expect(slugify("Hot Drinks")).toBe("hot-drinks");
  });

  it("normalizes Arabic and Kurdish search variants", () => {
    expect(normalizeSearch("إيك")).toBe(normalizeSearch("ايک"));
  });
});
