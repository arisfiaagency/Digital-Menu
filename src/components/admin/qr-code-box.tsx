"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Download, ImagePlus, Link2, Printer, QrCode as QrIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type QrCodeLabels = {
  scanHint: string;
  download: string;
  print: string;
  copyLink: string;
  copied: string;
  uploadLogo: string;
  removeLogo: string;
};

// Load a data-URL image (no crossOrigin needed — data URLs never taint a canvas).
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Renders the QR to a canvas and, when a logo is supplied, composites it into a
// white circle in the center. Error correction is H (~30%) so the center logo
// doesn't stop the code from scanning. Returns a PNG data URL. Because the logo
// is a data URL (local upload), the canvas stays untainted and export works.
async function renderQr(url: string, logo: string): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" }
  });
  if (logo) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const s = canvas.width;
      const cx = s / 2;
      const cy = s / 2;
      const r = s * 0.15; // logo radius — ~30% diameter, ~7% area (safe under EC H)
      const rBg = s * 0.17; // white backing ring so the logo reads cleanly
      // White circular backing.
      ctx.beginPath();
      ctx.arc(cx, cy, rBg, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      // Clip to the inner circle and cover-fit the logo inside it.
      try {
        const img = await loadImage(logo);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const d = r * 2;
        const scale = Math.max(d / img.width, d / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        ctx.restore();
      } catch {
        // Bad image — leave the white circle; the QR still scans.
      }
    }
  }
  return canvas.toDataURL("image/png");
}

// A QR for a public URL, with an optional center logo (upload a picture) plus
// Download PNG / Print / Copy link. Shared by the tenant QR page and the platform
// supervisor's client card. Print relies on the `qr-printing` body class +
// `.qr-print-area` rule in globals.css.
export function QrCodeBox({
  url,
  fileName,
  labels,
  size = "lg"
}: {
  url: string;
  fileName: string;
  labels: QrCodeLabels;
  size?: "lg" | "sm";
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!url) {
      setDataUrl("");
      return;
    }
    let active = true;
    renderQr(url, logo)
      .then((d) => {
        if (active) setDataUrl(d);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [url, logo]);

  function pickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context) — the link is shown on screen.
    }
  }

  function print() {
    document.body.classList.add("qr-printing");
    const cleanup = () => {
      document.body.classList.remove("qr-printing");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  const box = size === "sm" ? "h-40 w-40" : "h-56 w-56";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="qr-print-area flex flex-col items-center gap-3 text-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={labels.scanHint} className={cn(box, "rounded-lg border bg-white p-3")} />
        ) : (
          <div className={cn(box, "flex items-center justify-center rounded-lg border bg-muted")}>
            <QrIcon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
          </div>
        )}
        <p className="text-sm font-medium">{labels.scanHint}</p>
        <p dir="ltr" className="break-all text-xs text-muted-foreground">
          {url}
        </p>
      </div>

      <div className="no-print flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          {dataUrl ? (
            <Button asChild size="sm">
              <a href={dataUrl} download={fileName}>
                <Download className="h-4 w-4" aria-hidden />
                {labels.download}
              </a>
            </Button>
          ) : (
            <Button type="button" size="sm" disabled>
              <Download className="h-4 w-4" aria-hidden />
              {labels.download}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={print} disabled={!dataUrl}>
            <Printer className="h-4 w-4" aria-hidden />
            {labels.print}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={copyLink} disabled={!url}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {copied ? labels.copied : labels.copyLink}
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={pickLogo}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" aria-hidden />
            {labels.uploadLogo}
          </Button>
          {logo ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setLogo("")}>
              <X className="h-4 w-4" aria-hidden />
              {labels.removeLogo}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
