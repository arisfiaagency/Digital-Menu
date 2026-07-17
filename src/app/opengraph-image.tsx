import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Branded 1200×630 card shown when the menu link is shared (WhatsApp, Instagram,
// iMessage, Facebook, X): product mark on a matching dark field.
export const runtime = "nodejs";
export const alt = "Digital Menu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadLogo(): Promise<string | null> {
  try {
    const data = await readFile(join(process.cwd(), "public", "site-icon.png"));
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const logo = await loadLogo();
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f5f3ff",
          fontFamily: "sans-serif"
        }}
      >
        {logo ? (
          <img src={logo} width={420} height={420} style={{ objectFit: "contain" }} alt="" />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 420, height: 420, color: "#a78bfa", fontSize: 240, fontWeight: 800 }}>
            A
          </div>
        )}
        <div style={{ fontSize: 34, marginTop: 8, opacity: 0.92, letterSpacing: 4, textTransform: "uppercase" }}>
          Digital Menu
        </div>
      </div>
    ),
    { ...size }
  );
}
