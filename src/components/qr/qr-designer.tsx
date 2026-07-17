"use client";

import QRCode from "qrcode";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Download, ExternalLink, Palette, Printer, QrCode, RotateCcw, Save, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAdminLocale } from "@/components/admin/admin-preferences";
import { getAdminAppData, getPosState, saveSettings } from "@/lib/firebase/firestore";
import { hasSafeQrContrast } from "@/lib/utils/qr";
import { cn } from "@/lib/utils/cn";
import { defaultQrSettings } from "@/data/default-data";
import { useTenant } from "@/components/tenant-provider";
import type { LocalizedText, QrSettings } from "@/types/models";

export type QrPrintVariant = "qr" | "design";

export function QrDesigner({
  printMode = false,
  printVariant = "design",
  tableLabels = [],
  printPath,
  embedded = false
}: {
  printMode?: boolean;
  printVariant?: QrPrintVariant;
  tableLabels?: string[];
  /** Supervisor print route (e.g. /admin/qr-code/print). Defaults to cafe admin print path. */
  printPath?: string;
  /** Hide the page-level title when shown inside the supervisor shell. */
  embedded?: boolean;
}) {
  const { text, dir: textDir } = useAdminLocale();
  const { clientSlug, adminBasePath, menuPath, publicPath } = useTenant();
  const [settings, setSettings] = useState<QrSettings>(defaultQrSettings);
  const [dataUrl, setDataUrl] = useState("");
  const [svg, setSvg] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<"design" | "print">("design");
  const [tableSource, setTableSource] = useState<"pos" | "custom">("pos");
  const [posTables, setPosTables] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const siteOrigin = getSiteOrigin();
  const menuUrl = `${siteOrigin}${publicPath}`;
  const directMenuUrl = `${siteOrigin}${menuPath}`;

  useEffect(() => {
    let cancelled = false;
    setError("");
    setMessage("");
    setSettings({ ...defaultQrSettings, menuUrl });
    getAdminAppData()
      .then((data) => {
        if (cancelled) return;
        const nextUrl = normalizeQrUrl(data.qr?.menuUrl, menuUrl, directMenuUrl, menuPath, siteOrigin) || menuUrl;
        setSettings({
          ...defaultQrSettings,
          ...data.qr,
          menuUrl: nextUrl,
          foregroundColor: data.qr?.foregroundColor || defaultQrSettings.foregroundColor,
          backgroundColor: data.qr?.backgroundColor || defaultQrSettings.backgroundColor,
          title: {
            en: data.qr?.title?.en || defaultQrSettings.title.en,
            ar: data.qr?.title?.ar || defaultQrSettings.title.ar,
            ckb: data.qr?.title?.ckb || defaultQrSettings.title.ckb
          }
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSettings({ ...defaultQrSettings, menuUrl });
      });
    return () => {
      cancelled = true;
    };
  }, [clientSlug, directMenuUrl, menuPath, menuUrl, siteOrigin]);

  // Load the real POS tables (active, in display order) for the "All POS tables"
  // mode. The custom text field is never touched by this, so what you type stays.
  useEffect(() => {
    if (printMode) return;
    getPosState()
      .then((pos) => {
        const names = [...pos.tables]
          .filter((table) => table.isActive)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((table) => table.name.trim())
          .filter(Boolean);
        setPosTables(names);
      })
      .catch(() => setPosTables([]));
  }, [printMode, clientSlug]);

  useEffect(() => {
    let active = true;
    const url = settings.menuUrl?.trim() || "";
    if (!url || !isValidUrl(url)) {
      setDataUrl("");
      setSvg("");
      // Don't flash the generation error while the cafe URL is still loading.
      return () => {
        active = false;
      };
    }

    const logoUrl = settings.logoUrl || "/site-icon.png";
    const dark = normalizeHexColor(settings.foregroundColor, defaultQrSettings.foregroundColor);
    const light = normalizeHexColor(settings.backgroundColor, defaultQrSettings.backgroundColor);

    (async () => {
      try {
        // Error correction "H" (30% recovery) so a centered logo can sit
        // over the QR without breaking scanning.
        const [baseDataUrl, nextSvg] = await Promise.all([
          QRCode.toDataURL(url, {
            errorCorrectionLevel: "H",
            margin: 4,
            width: 640,
            color: { dark, light }
          }),
          QRCode.toString(url, {
            type: "svg",
            errorCorrectionLevel: "H",
            margin: 4,
            color: { dark, light }
          })
        ]);
        const withLogo = await composeQrWithLogo(baseDataUrl, logoUrl, 640).catch(() => baseDataUrl);
        if (!active) return;
        setDataUrl(withLogo);
        setSvg(nextSvg);
        setError((prev) => (prev === text.qrGenerationFailed ? "" : prev));
      } catch {
        if (!active) return;
        setDataUrl("");
        setSvg("");
        setError(text.qrGenerationFailed);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    settings.menuUrl,
    settings.foregroundColor,
    settings.backgroundColor,
    settings.logoUrl,
    text.qrGenerationFailed
  ]);

  useEffect(() => {
    if (!printMode) return;
    document.body.classList.add("qr-printing");
    return () => document.body.classList.remove("qr-printing");
  }, [printMode]);

  async function saveQr() {
    setMessage("");
    setError("");
    if (!validMenuUrl) {
      setError(text.invalidUrl);
      return;
    }
    setSaving(true);
    try {
      await saveSettings("qr", settings as unknown as Record<string, unknown>);
      setMessage(text.qrSettingsSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function copyQr() {
    setMessage("");
    setError("");
    try {
      if ("ClipboardItem" in window && dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setMessage(text.qrImageCopied);
        return;
      }
      await navigator.clipboard.writeText(settings.menuUrl);
      setMessage(text.qrImageUnsupported);
    } catch {
      try {
        await navigator.clipboard.writeText(settings.menuUrl);
        setMessage(text.qrImageCopyFailed);
      } catch (err) {
        setError(err instanceof Error ? err.message : text.settingsSaveFailed);
      }
    }
  }

  async function copyUrl() {
    setMessage("");
    setError("");
    try {
      await navigator.clipboard.writeText(settings.menuUrl);
      setMessage(text.menuUrlCopied);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    }
  }

  function downloadPng() {
    download(dataUrl, "stone-cafe-menu-qr.png");
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    download(URL.createObjectURL(blob), "stone-cafe-menu-qr.svg");
  }

  function reset() {
    setSettings({ ...defaultQrSettings, menuUrl });
    setMessage("");
    setError("");
  }

  const customLabels = customInput
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 200);
  const tablesForPrint = tableSource === "pos" ? posTables.slice(0, 200) : customLabels;

  function openPrint(mode: QrPrintVariant) {
    setPrintMenuOpen(false);
    if (!tablesForPrint.length) return;
    const base = printPath || `${adminBasePath}/qr-code/print`;
    const params = new URLSearchParams({
      mode,
      tables: tablesForPrint.join(",")
    });
    if (printPath && clientSlug) params.set("client", clientSlug);
    window.open(`${base}?${params.toString()}`, "_blank", "noopener");
  }

  const safeContrast = hasSafeQrContrast(settings.foregroundColor, settings.backgroundColor);
  const validMenuUrl = isValidUrl(settings.menuUrl);
  const readyToScan = validMenuUrl && safeContrast && Boolean(dataUrl);
  const logoSrc = settings.logoUrl || "/site-icon.png";
  const displayUrl = settings.menuUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  if (printMode) {
    return (
      <main className="qr-print-root">
        <div className="qr-print-toolbar no-print">
          <p>{tableLabels.length} × {text.tableCards} · {printVariant === "qr" ? text.printQrOnly : text.printFullDesign}</p>
          <Button onClick={() => window.print()} disabled={!dataUrl}>
            <Printer className="h-4 w-4" aria-hidden /> {text.printNow}
          </Button>
        </div>
        <div className="qr-print-area">
          <div className="qr-sheet">
            {Array.from({ length: Math.ceil(tableLabels.length / 2) }).map((_, page) => (
              <div className="qr-page" key={page}>
                {tableLabels.slice(page * 2, page * 2 + 2).map((label, col) => (
                  <TableCard
                    key={col}
                    variant={printVariant}
                    label={label}
                    logoSrc={logoSrc}
                    qr={dataUrl}
                    title={settings.title}
                    url={displayUrl}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{text.mainMenuQrCode}</h1>
            <p dir={textDir} className="text-muted-foreground">{text.qrDescription}</p>
          </div>
          <Badge className={readyToScan ? "border-primary/30 bg-primary/10 text-primary" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
            {readyToScan ? text.readyToScan : text.needsAttention}
          </Badge>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Design the cafe QR, save it, then print table cards when needed.
            </p>
          </div>
          <Badge className={readyToScan ? "border-primary/30 bg-primary/10 text-primary" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
            {readyToScan ? text.readyToScan : text.needsAttention}
          </Badge>
        </div>
      )}

      {message ? <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}
      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="inline-flex gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setJob("design")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            job === "design" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          1. Design & save
        </button>
        <button
          type="button"
          onClick={() => setJob("print")}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            job === "print" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          2. Print table cards
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <QrHealthCard icon={validMenuUrl ? CheckCircle2 : AlertTriangle} label={text.menuUrl} value={validMenuUrl ? text.ready : text.invalidUrl} good={validMenuUrl} />
        <QrHealthCard icon={safeContrast ? CheckCircle2 : AlertTriangle} label={text.scanContrast} value={safeContrast ? text.goodContrast : text.needsAttention} good={safeContrast} />
      </div>

      {job === "design" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" aria-hidden />
                QR design
              </CardTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Set the destination link and colors, then save before printing.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-3 rounded-xl border bg-muted/15 p-4">
                <h3 className="text-sm font-semibold">{text.destination}</h3>
                <Field label={text.menuUrl}>
                  <Input value={settings.menuUrl} onChange={(e) => setSettings({ ...settings, menuUrl: e.target.value.trim() })} />
                </Field>
                <p className="text-xs text-muted-foreground">Usually the cafe welcome or menu URL guests should open when they scan.</p>
              </section>

              <section className="space-y-3 rounded-xl border bg-muted/15 p-4">
                <h3 className="text-sm font-semibold">{text.colors}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={text.foregroundColor}><Input type="color" value={settings.foregroundColor} onChange={(e) => setSettings({ ...settings, foregroundColor: e.target.value })} /></Field>
                  <Field label={text.backgroundColor}><Input type="color" value={settings.backgroundColor} onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })} /></Field>
                </div>
                {!safeContrast ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{text.poorQrContrast}</p> : null}
              </section>

              <section className="space-y-3 rounded-xl border bg-muted/15 p-4">
                <h3 className="text-sm font-semibold">{text.printTitles}</h3>
                <p className="text-xs text-muted-foreground">These titles appear on printed table cards (full design), not on the basic QR tile.</p>
                <div className="grid gap-4">
                  <Field label={text.titleEnglish}><Input value={settings.title.en} onChange={(e) => setSettings({ ...settings, title: { ...settings.title, en: e.target.value } })} /></Field>
                  <Field label={text.titleArabic}><Input dir="rtl" value={settings.title.ar} onChange={(e) => setSettings({ ...settings, title: { ...settings.title, ar: e.target.value } })} /></Field>
                  <Field label={text.titleKurdish}><Input dir="rtl" value={settings.title.ckb} onChange={(e) => setSettings({ ...settings, title: { ...settings.title, ckb: e.target.value } })} /></Field>
                </div>
              </section>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveQr()} disabled={saving || !readyToScan}>
                  <Save className="h-4 w-4" aria-hidden />
                  {saving ? text.saving : text.save}
                </Button>
                <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden /> {text.reset}</Button>
                <Button type="button" variant="outline" onClick={() => setJob("print")} disabled={!readyToScan}>
                  Continue to print
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5 text-primary" aria-hidden />
                {text.preview}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/25 p-4">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div>
                    <h2 className="text-xl font-semibold">{settings.title.en}</h2>
                    <p dir="rtl" className="text-sm text-muted-foreground">{settings.title.ar}</p>
                    <p dir="rtl" className="text-sm text-muted-foreground">{settings.title.ckb}</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {dataUrl ? <img src={dataUrl} alt={text.menuQrCode} className="h-64 w-64 rounded-md border bg-white p-3 sm:h-72 sm:w-72" /> : null}
                  <p className="break-all text-sm text-muted-foreground">{settings.menuUrl}</p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => void copyUrl()}><Copy className="h-4 w-4" aria-hidden /> {text.copyUrl}</Button>
                  <Button variant="secondary" onClick={() => void copyQr()} disabled={!dataUrl}><Copy className="h-4 w-4" aria-hidden /> {text.copyQr}</Button>
                  <Button variant="outline" onClick={downloadPng} disabled={!dataUrl}><Download className="h-4 w-4" aria-hidden /> PNG</Button>
                  <Button variant="outline" onClick={downloadSvg} disabled={!svg}><Download className="h-4 w-4" aria-hidden /> SVG</Button>
                  {validMenuUrl ? (
                    <Button asChild variant="outline" className="sm:col-span-2">
                      <Link href={settings.menuUrl} target="_blank"><ExternalLink className="h-4 w-4" aria-hidden /> {text.testLink}</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Printer className="h-5 w-5 text-primary" aria-hidden />
              {text.tableCards}
            </CardTitle>
            <p dir={textDir} className="text-sm font-normal text-muted-foreground">{text.tableCardsHint}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!readyToScan ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                Finish Design & save first (valid URL + good contrast) before printing.
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Which tables?</p>
                  <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-sm">
                    <button type="button" onClick={() => setTableSource("pos")} className={cn("rounded px-3 py-1.5", tableSource === "pos" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
                      {text.allTables}
                    </button>
                    <button type="button" onClick={() => setTableSource("custom")} className={cn("rounded px-3 py-1.5", tableSource === "custom" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
                      {text.specificTables}
                    </button>
                  </div>
                </div>

                {tableSource === "pos" ? (
                  <div className="rounded-xl border bg-muted/15 p-4">
                    <p className="text-sm font-medium">{posTables.length} POS tables</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {posTables.length ? posTables.join(" · ") : text.noPosTables}
                    </p>
                  </div>
                ) : (
                  <Field label={text.numberOfTables}>
                    <Input
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="1, 2, 3, 5, 10"
                    />
                  </Field>
                )}

                <p className="text-sm text-muted-foreground">
                  Ready to print: <span className="font-medium text-foreground">{tablesForPrint.length}</span> {text.tableCards}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative inline-block">
                    <Button type="button" onClick={() => setPrintMenuOpen((v) => !v)} disabled={!readyToScan || !tablesForPrint.length}>
                      <Printer className="h-4 w-4" aria-hidden /> {text.print}
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </Button>
                    {printMenuOpen ? (
                      <>
                        <button type="button" aria-hidden className="fixed inset-0 z-0 cursor-default" onClick={() => setPrintMenuOpen(false)} />
                        <div className="absolute z-10 mt-1 w-60 overflow-hidden rounded-md border bg-background shadow-md">
                          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => openPrint("qr")}>
                            <QrCode className="h-4 w-4 text-primary" aria-hidden /> {text.printQrOnly}
                          </button>
                          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => openPrint("design")}>
                            <Palette className="h-4 w-4 text-primary" aria-hidden /> {text.printFullDesign}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                  {!tablesForPrint.length ? (
                    <p className="text-sm text-muted-foreground">Add POS tables or enter custom labels to enable print.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {dataUrl ? <img src={dataUrl} alt="" className="mx-auto h-40 w-40 rounded-md border bg-white p-2" /> : null}
                <p className="mt-3 text-xs text-muted-foreground break-all">{settings.menuUrl}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TableCard({
  variant,
  label,
  logoSrc,
  qr,
  title,
  url
}: {
  variant: QrPrintVariant;
  label: string;
  logoSrc: string;
  qr: string;
  title: LocalizedText;
  url: string;
}) {
  if (variant === "qr") {
    return (
      <div className="qr-holder qr-holder--plain">
        <div className="qr-holder__num">{label}</div>
        <div className="qr-holder__tile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="" /> : null}
        </div>
        <p className="qr-holder__url">{url}</p>
      </div>
    );
  }
  return (
    <div className="qr-holder qr-holder--design">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="qr-holder__logo" src={logoSrc} alt={title.en || "Menu"} />
      <div className="qr-holder__num">{label}</div>
      <div className="qr-holder__tile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr ? <img src={qr} alt="" /> : null}
      </div>
      <div className="qr-holder__titles">
        <p className="qr-holder__title" dir="rtl" lang="ckb">{title.ckb}</p>
        <p className="qr-holder__title" dir="rtl" lang="ar">{title.ar}</p>
        <p className="qr-holder__title qr-holder__title--en">{title.en}</p>
      </div>
    </div>
  );
}

function QrHealthCard({
  icon: Icon,
  label,
  value,
  good
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", good ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-500/5")}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", good ? "text-primary" : "text-amber-600 dark:text-amber-300")} aria-hidden />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  const raw = (value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function getSiteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")).replace(/\/+$/, "");
}

function normalizeQrUrl(value: string | undefined, publicUrl: string, directMenuUrl: string, menuPath: string, siteOrigin: string) {
  if (!value) return publicUrl;
  if (value === menuPath || value === directMenuUrl) return publicUrl;
  if (value.startsWith("/") && !value.startsWith("//")) return `${siteOrigin}${value}`;
  return value;
}

function download(href: string, filename: string) {
  if (!href) return;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draws the Stone logo in a white circular badge at the centre of the QR.
async function composeQrWithLogo(qrDataUrl: string, logoUrl: string, size: number): Promise<string> {
  const [qr, logo] = await Promise.all([loadImage(qrDataUrl), loadImage(logoUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return qrDataUrl;
  ctx.drawImage(qr, 0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.15; // white badge radius (~30% of the QR width)
  const inner = outer * 0.84; // logo circle, leaving a thin white ring

  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, cx - inner, cy - inner, inner * 2, inner * 2);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
