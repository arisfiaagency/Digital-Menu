import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Branded 1200×630 card shown when the menu link is shared (WhatsApp, Instagram,
// iMessage, Facebook, X): product logo on its sage-green field
// (#719567 — sampled from the logo's background) so the green matches edge-to-edge.
export const runtime = "nodejs";
export const alt = "Digital Menu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadLogo(): Promise<string | null> {
  try {
    const data = await readFile(join(process.cwd(), "public", "stone-cafe-logo.jpg"));
    return `data:image/jpeg;base64,${data.toString("base64")}`;
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
          background: "#719567",
          color: "#f3faf4",
          fontFamily: "sans-serif"
        }}
      >
        {logo ? (
          <img src={logo} width={520} height={520} style={{ objectFit: "contain" }} alt="" />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 520, height: 520, color: "#f3faf4", fontSize: 240, fontWeight: 800 }}>
            S
          </div>
        )}
        <div style={{ fontSize: 34, marginTop: 4, opacity: 0.92, letterSpacing: 4, textTransform: "uppercase" }}>
          Scan · View the menu
        </div>
      </div>
    ),
    { ...size }
  );
}
