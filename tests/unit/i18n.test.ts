import { describe, expect, it } from "vitest";
import { dirForLocale, localized, translate } from "@/lib/i18n/config";

describe("i18n helpers", () => {
  it("uses RTL for Arabic and Kurdish", () => {
    expect(dirForLocale("ar")).toBe("rtl");
    expect(dirForLocale("ckb")).toBe("rtl");
    expect(dirForLocale("en")).toBe("ltr");
  });

  it("falls back to English translation content", () => {
    expect(localized({ en: "Coffee" }, "ckb")).toBe("Coffee");
  });

  it("loads menu messages", () => {
    expect(translate("en", "menu.title")).toBe("Menu");
  });
});
