import { describe, expect, it } from "vitest";
import { imageExtensionForFile, validateImageFile } from "@/lib/supabase/storage";

describe("Supabase image storage helpers", () => {
  it("accepts animated GIF uploads", () => {
    const file = new File(["gif"], "animated-menu-item.gif", { type: "image/gif" });

    expect(validateImageFile(file)).toBeNull();
    expect(imageExtensionForFile(file)).toBe("gif");
  });

  it("rejects non-image uploads", () => {
    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

    expect(validateImageFile(file)).toBe("Use a JPG, PNG, WebP, or GIF image.");
  });
});
