"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Download, Link2, Printer, QrCode as QrIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type QrCodeLabels = {
  scanHint: string;
  download: string;
  print: string;
  copyLink: string;
  copied: string;
};

// A plain (unbranded) QR for a public URL, with Download PNG / Print / Copy link.
// Shared by the tenant QR page and the platform supervisor's client card. Print
// relies on the `qr-printing` body class + `.qr-print-area` rule in globals.css.
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) {
      setDataUrl("");
      return;
    }
    let active = true;
    // High resolution so a printed/downloaded QR stays crisp at any size.
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" }
    })
      .then((d) => {
        if (active) setDataUrl(d);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [url]);

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

      <div className="no-print flex flex-wrap justify-center gap-2">
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
    </div>
  );
}
