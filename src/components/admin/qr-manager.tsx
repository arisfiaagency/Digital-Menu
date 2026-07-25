"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { QrCodeBox } from "@/components/admin/qr-code-box";
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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Public front door for this cafe (welcome page → "View Menu").
  const menuUrl = useMemo(() => (clientSlug && origin ? `${origin}/${clientSlug}` : ""), [origin, clientSlug]);

  return (
    <div dir={dir} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{text.qrCode}</h1>
        <p className="text-muted-foreground">{text.qrCodeDesc}</p>
      </div>

      <Card className="max-w-md">
        <CardContent className="pt-6">
          <QrCodeBox
            url={menuUrl}
            fileName={`${clientSlug || "menu"}-qr.png`}
            labels={{
              scanHint: text.qrScanHint,
              download: text.qrDownload,
              print: text.qrPrint,
              copyLink: text.qrCopyLink,
              copied: text.qrCopied,
              uploadLogo: text.qrUploadLogo,
              removeLogo: text.qrRemoveLogo
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
