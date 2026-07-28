/** Thermal receipt printing via an isolated iframe (58mm / 80mm rolls). */

export type ThermalPaperWidth = 58 | 80;

export type ThermalLine = {
  quantity: number;
  nameEn: string;
  nameCkb?: string;
  variantEn?: string;
  variantCkb?: string;
  flavor?: string;
  unitPriceLabel?: string;
  lineTotalLabel?: string;
};

export type ThermalTicketPayload = {
  kind: "invoice" | "kitchen" | "bar";
  title: string;
  restaurantName?: string;
  logoUrl?: string;
  tableName: string;
  tableLabel: string;
  takenBy?: string;
  takenByLabel?: string;
  printerName?: string;
  printerLabel?: string;
  date: string;
  time: string;
  lines: ThermalLine[];
  qtyLabel?: string;
  totals?: {
    subtotalLabel: string;
    subtotal: string;
    discountLabel?: string;
    discount?: string;
    serviceLabel?: string;
    service?: string;
    totalLabel: string;
    total: string;
  };
  footerEn?: string;
  footerCkb?: string;
  brand?: string;
  paperWidth: ThermalPaperWidth;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function contentWidthMm(paper: ThermalPaperWidth) {
  // Leave a small safe margin inside the roll so drivers don't clip characters.
  return paper === 58 ? 48 : 72;
}

function buildThermalHtml(payload: ThermalTicketPayload) {
  const width = contentWidthMm(payload.paperWidth);
  const page = payload.paperWidth;
  const linesHtml = payload.lines
    .map((line) => {
      const names = [
        `<div dir="ltr" style="font-weight:900;word-break:break-word;">${escapeHtml(line.nameEn || "-")}</div>`,
        line.nameCkb
          ? `<div dir="rtl" style="font-weight:900;font-size:0.92em;word-break:break-word;">${escapeHtml(line.nameCkb)}</div>`
          : ""
      ].join("");
      const variant = line.variantEn
        ? `<div dir="ltr" style="font-size:11px;font-weight:700;">${escapeHtml(line.variantEn)}</div>${
            line.variantCkb
              ? `<div dir="rtl" style="font-size:11px;font-weight:700;">${escapeHtml(line.variantCkb)}</div>`
              : ""
          }`
        : "";
      const flavor = line.flavor
        ? `<div style="font-size:11px;font-weight:700;">* ${escapeHtml(line.flavor)}</div>`
        : "";
      const price =
        line.unitPriceLabel && line.lineTotalLabel
          ? `<div style="font-size:11px;font-variant-numeric:tabular-nums;">${escapeHtml(String(line.quantity))} x ${escapeHtml(line.unitPriceLabel)}</div>
             <div style="font-weight:900;font-variant-numeric:tabular-nums;text-align:right;">${escapeHtml(line.lineTotalLabel)}</div>`
          : "";

      if (payload.kind === "invoice") {
        return `<div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin:6px 0;">
          <div>${names}${variant}${flavor}${
            line.unitPriceLabel
              ? `<div style="font-size:11px;font-variant-numeric:tabular-nums;">${escapeHtml(String(line.quantity))} x ${escapeHtml(line.unitPriceLabel)}</div>`
              : ""
          }</div>
          <div style="font-weight:900;font-variant-numeric:tabular-nums;">${escapeHtml(line.lineTotalLabel || "")}</div>
        </div>`;
      }

      return `<div style="display:grid;grid-template-columns:auto 1fr;gap:8px;margin:8px 0;">
        <div style="font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;">${escapeHtml(String(line.quantity))}x</div>
        <div>${names}${variant}${flavor}${price}</div>
      </div>`;
    })
    .join("");

  const totalsHtml = payload.totals
    ? `<div style="border-top:2px dashed #000;margin:8px 0;"></div>
       <div style="display:grid;grid-template-columns:1fr auto;gap:6px;font-size:12px;">
         <div>${escapeHtml(payload.totals.subtotalLabel)}</div><div style="font-variant-numeric:tabular-nums;">${escapeHtml(payload.totals.subtotal)}</div>
         ${
           payload.totals.discount
             ? `<div>${escapeHtml(payload.totals.discountLabel || "")}</div><div style="font-variant-numeric:tabular-nums;">${escapeHtml(payload.totals.discount)}</div>`
             : ""
         }
         ${
           payload.totals.service
             ? `<div>${escapeHtml(payload.totals.serviceLabel || "")}</div><div style="font-variant-numeric:tabular-nums;">${escapeHtml(payload.totals.service)}</div>`
             : ""
         }
       </div>
       <div style="display:grid;grid-template-columns:1fr auto;gap:6px;border-top:2px dashed #000;margin-top:8px;padding-top:8px;">
         <div style="font-size:14px;font-weight:900;">${escapeHtml(payload.totals.totalLabel)}</div>
         <div style="font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;">${escapeHtml(payload.totals.total)}</div>
       </div>`
    : "";

  const qtyTotal = payload.lines.reduce((sum, line) => sum + line.quantity, 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payload.title)}</title>
  <style>
    @page { size: ${page}mm auto; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: ${width}mm;
      max-width: ${width}mm;
      padding: 2mm;
      box-sizing: border-box;
      font-family: "Courier New", Courier, monospace;
      font-size: ${page === 58 ? "11px" : "12px"};
      line-height: 1.25;
    }
    img {
      display: block;
      margin: 0 auto 4px;
      max-width: ${page === 58 ? "40mm" : "52mm"};
      height: auto;
      filter: grayscale(1) contrast(1.35);
    }
    .rule { border-top: 2px dashed #000; margin: 8px 0; }
    .center { text-align: center; }
    .muted { font-size: 11px; }
  </style>
</head>
<body>
  <div class="center">
    ${
      payload.kind === "invoice" && payload.logoUrl
        ? `<img src="${escapeHtml(payload.logoUrl)}" alt="" />`
        : ""
    }
    <div style="font-size:${page === 58 ? "14px" : "16px"};font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">
      ${escapeHtml(payload.kind === "invoice" ? payload.restaurantName || payload.title : payload.title)}
    </div>
    <div class="muted" style="font-weight:700;margin-top:4px;">${escapeHtml(payload.date)} · ${escapeHtml(payload.time)}</div>
    ${
      payload.printerName
        ? `<div class="muted" style="font-weight:900;margin-top:4px;text-transform:uppercase;">${escapeHtml(payload.printerLabel || "Printer")}: ${escapeHtml(payload.printerName)}</div>`
        : ""
    }
  </div>
  <div class="rule"></div>
  <div style="display:grid;grid-template-columns:1fr auto;gap:8px;font-weight:700;">
    <div>${escapeHtml(payload.tableLabel)}</div>
    <div style="font-size:16px;font-weight:900;">${escapeHtml(payload.tableName)}</div>
  </div>
  ${
    payload.takenBy
      ? `<div style="display:grid;grid-template-columns:1fr auto;gap:8px;font-size:11px;font-weight:700;margin-top:4px;">
           <div>${escapeHtml(payload.takenByLabel || "")}</div>
           <div>${escapeHtml(payload.takenBy)}</div>
         </div>`
      : ""
  }
  <div class="rule"></div>
  ${linesHtml}
  ${totalsHtml}
  ${
    payload.kind !== "invoice"
      ? `<div class="rule"></div><div class="center" style="font-weight:900;text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(payload.qtyLabel || "Qty")}: ${qtyTotal}</div>`
      : ""
  }
  ${
    payload.kind === "invoice"
      ? `<div class="rule"></div>
         <div class="center" style="font-weight:900;">${escapeHtml(payload.footerEn || "Thank You and Visit Again")}</div>
         ${payload.footerCkb ? `<div class="center" dir="rtl" style="font-weight:900;margin-top:4px;">${escapeHtml(payload.footerCkb)}</div>` : ""}
         ${payload.brand ? `<div class="center muted" style="margin-top:10px;text-transform:uppercase;letter-spacing:0.12em;">Powered by ${escapeHtml(payload.brand)}</div>` : ""}`
      : `<div class="rule"></div><div class="center" style="font-weight:900;">*** ${escapeHtml(payload.title)} ***</div>`
  }
</body>
</html>`;
}

/**
 * Prints a thermal ticket. If `printerName` is set and QZ Tray is running,
 * prints silently to that OS printer; otherwise opens the browser print dialog
 * with a clean 58/80mm document.
 */
export async function printThermalTicket(payload: ThermalTicketPayload) {
  if (typeof window === "undefined") return;

  const html = buildThermalHtml(payload);

  if (payload.printerName?.trim()) {
    try {
      const { printHtmlWithQz } = await import("@/lib/qz-printers");
      const printed = await printHtmlWithQz(payload.printerName, html);
      if (printed) return;
    } catch {
      // Fall through to browser print dialog.
    }
  }

  printThermalTicketInBrowser(html);
}

function printThermalTicketInBrowser(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument || frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 500);
  };

  const trigger = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      cleanup();
    }
  };

  // Wait for images (logo) when present; otherwise print on next frame.
  const images = Array.from(frameDocument.images || []);
  if (!images.length) {
    window.requestAnimationFrame(trigger);
    return;
  }

  let pending = images.length;
  const done = () => {
    pending -= 1;
    if (pending <= 0) trigger();
  };
  images.forEach((img) => {
    if (img.complete) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  });
  window.setTimeout(trigger, 1500);
}
