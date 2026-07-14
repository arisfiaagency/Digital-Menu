import { describe, expect, it } from "vitest";
import { mediaExtensionForFile, validateMediaFile, imageExtensionForFile, validateImageFile } from "@/lib/supabase/storage";

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

  it("accepts video uploads when media validation is used", () => {
    const file = new File(["video"], "welcome-background.mp4", { type: "video/mp4" });

    expect(validateMediaFile(file, { maxBytes: 100 * 1024 * 1024, maxBytesLabel: "100 MB" })).toBeNull();
    expect(mediaExtensionForFile(file)).toBe("mp4");
  });

  it("rejects QuickTime video uploads with a clear message", () => {
    const file = new File(["video"], "welcome-background.mov", { type: "video/quicktime" });

    expect(validateMediaFile(file, { maxBytes: 100 * 1024 * 1024, maxBytesLabel: "100 MB" })).toBe("MOV/QuickTime videos are not supported. Please upload MP4 or WebM.");
  });

  it("rejects oversized welcome background media", () => {
    const file = { name: "welcome-background.mp4", type: "video/mp4", size: 101 * 1024 * 1024 } as File;

    expect(validateMediaFile(file, { maxBytes: 100 * 1024 * 1024, maxBytesLabel: "100 MB" })).toBe("Files must be 100 MB or smaller.");
  });
});
