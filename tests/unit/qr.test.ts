import { describe, expect, it } from "vitest";
import { hasSafeQrContrast } from "@/lib/utils/qr";

describe("QR contrast", () => {
  it("accepts high contrast colors", () => {
    expect(hasSafeQrContrast("#000000", "#ffffff")).toBe(true);
  });

  it("rejects low contrast colors", () => {
    expect(hasSafeQrContrast("#eeeeee", "#ffffff")).toBe(false);
  });
});
