"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Check, Download, Link2, Printer, QrCode as QrIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTenant } from "@/components/tenant-provider";
import { useAdminLocale } from "@/components/admin/admin-preferences";

// A plain (unbranded) QR code for this cafe's public page. The cafe owner prints
// it or downloads the PNG so customers can scan straight to /{slug}. The link is
// built from the current origin, so it always points at the same deployment the
// admin is signed into.
export function QrManager() {
  const { clientSlug } = useTenant();
  const { text, dir } = useAdminLocale();
  const [origin, setOrigin] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Public front door for this cafe (welcome page → "View Menu").
  const menuUrl = useMemo(() => (clientSlug && origin ? `${origin}/${clientSlug}` : ""), [origin, clientSlug]);

  useEffect(() => {
    if (!menuUrl) return;
    let active = true;
    // High resolution so a printed/downloaded QR stays crisp at any size.
    QRCode.toDataURL(menuUrl, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" }
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [menuUrl]);

  async function copyLink() {
    if (!menuUrl) return;
    try {
      await navigator.clipboard.writeText(menuUrl);
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

  const fileName = `${clientSlug || "menu"}-qr.png`;

  return (
    <div dir={dir} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{text.qrCode}</h1>
        <p className="text-muted-foreground">{text.qrCodeDesc}</p>
      </div>

      <Card className="max-w-md">
        <CardContent className="pt-6">
          <div className="qr-print-area flex flex-col items-center gap-4 text-center">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt={text.qrCode} className="h-64 w-64 rounded-lg border bg-white p-3" />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border bg-muted">
                <QrIcon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
              </div>
            )}
            <p className="text-sm font-medium">{text.qrScanHint}</p>
            <p dir="ltr" className="break-all text-xs text-muted-foreground">
              {menuUrl}
            </p>
          </div>

          <div className="no-print mt-6 flex flex-wrap justify-center gap-2">
            {dataUrl ? (
              <Button asChild>
                <a href={dataUrl} download={fileName}>
                  <Download className="h-4 w-4" aria-hidden />
                  {text.qrDownload}
                </a>
              </Button>
            ) : (
              <Button type="button" disabled>
                <Download className="h-4 w-4" aria-hidden />
                {text.qrDownload}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={print} disabled={!dataUrl}>
              <Printer className="h-4 w-4" aria-hidden />
              {text.qrPrint}
            </Button>
            <Button type="button" variant="outline" onClick={copyLink} disabled={!menuUrl}>
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
              {copied ? text.qrCopied : text.qrCopyLink}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
