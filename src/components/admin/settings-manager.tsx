"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Eye, EyeOff, KeyRound, Plus, Printer, RefreshCw, Save, SlidersHorizontal, Trash2, type LucideIcon } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { changeAdminPassword } from "@/lib/firebase/auth";
import { getAdminAppData, saveSettings } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/forms/image-upload-field";
import { useAdminLocale, formatAdminText } from "@/components/admin/admin-preferences";
import { useTenant } from "@/components/tenant-provider";
import {
  emptyPosPrinterConfig,
  loadPosPrinterConfig,
  savePosPrinterConfig,
  type PosPrinterConfig
} from "@/lib/pos-printers";
import { detectConnectedPrinters } from "@/lib/qz-printers";
import { cn } from "@/lib/utils/cn";
import type { GeneralSettings, MenuSettings } from "@/types/models";
import { defaultGeneralSettings, defaultMenuSettings } from "@/data/default-data";

type SettingsSection = "general" | "menu" | "account";

export function SettingsManager() {
  const { text } = useAdminLocale();
  const { clientSlug } = useTenant();
  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneralSettings);
  const [menu, setMenu] = useState<MenuSettings>(defaultMenuSettings);
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [savedSignature, setSavedSignature] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PosPrinterConfig>(emptyPosPrinterConfig);
  const [printerDraft, setPrinterDraft] = useState("");
  const [printerMessage, setPrinterMessage] = useState("");
  const [printerError, setPrinterError] = useState("");
  const [detectingPrinters, setDetectingPrinters] = useState(false);
  const [detectedPrinters, setDetectedPrinters] = useState<string[]>([]);

  useEffect(() => {
    getAdminAppData().then((data) => {
      setGeneral(data.general);
      setMenu(data.menu);
      setSavedSignature(settingsSignature(data.general, data.menu));
    });
  }, []);

  useEffect(() => {
    setPrinterConfig(loadPosPrinterConfig(clientSlug));
  }, [clientSlug]);

  function updatePrinterConfig(next: PosPrinterConfig, notice?: string) {
    const saved = savePosPrinterConfig(clientSlug, next) || next;
    setPrinterConfig(saved);
    setPrinterError("");
    setPrinterMessage(notice ?? text.posPrintersSaved);
  }

  function addPrinterName(nameOverride?: string) {
    const name = (nameOverride ?? printerDraft).trim();
    if (!name) return;
    if (printerConfig.printers.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
      setPrinterDraft("");
      return;
    }
    updatePrinterConfig({ ...printerConfig, printers: [...printerConfig.printers, name] });
    setPrinterDraft("");
  }

  function removePrinterName(name: string) {
    updatePrinterConfig({
      ...printerConfig,
      printers: printerConfig.printers.filter((entry) => entry !== name),
      invoice: printerConfig.invoice === name ? "" : printerConfig.invoice,
      kitchen: printerConfig.kitchen === name ? "" : printerConfig.kitchen,
      bar: printerConfig.bar === name ? "" : printerConfig.bar
    });
  }

  async function handleDetectPrinters() {
    setDetectingPrinters(true);
    setPrinterError("");
    setPrinterMessage("");
    const result = await detectConnectedPrinters();
    setDetectingPrinters(false);
    if (!result.ok) {
      setDetectedPrinters([]);
      setPrinterError(
        result.code === "not_installed" ? text.qzTrayRequired : result.message || text.printerDetectFailed
      );
      return;
    }
    setDetectedPrinters(result.printers);
    if (!result.printers.length) {
      setPrinterError(text.noConnectedPrinters);
      return;
    }
    // Merge every detected printer into this device's list so dropdowns are ready.
    const merged = [...new Set([...printerConfig.printers, ...result.printers])];
    updatePrinterConfig(
      { ...printerConfig, printers: merged },
      formatAdminText(text.printersDetected, { count: result.printers.length })
    );
  }

  useEffect(() => {
    function syncSectionFromHash() {
      // No hash → all sections collapsed. A deep link (e.g. #general from the
      // profile menu) still opens that section.
      setActiveSection(sectionFromHash(window.location.hash));
    }

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    return () => window.removeEventListener("hashchange", syncSectionFromHash);
  }, []);

  useEffect(() => {
    if (!activeSection) return;
    window.requestAnimationFrame(() => {
      document.getElementById(activeSection)?.scrollIntoView({ block: "start" });
    });
  }, [activeSection]);

  function toggleSection(section: SettingsSection) {
    const baseUrl = `${window.location.pathname}${window.location.search}`;
    setActiveSection((current) => {
      // Tapping the open section again collapses it.
      const next = current === section ? null : section;
      window.history.replaceState(null, "", next ? `${baseUrl}#${next}` : baseUrl);
      return next;
    });
  }

  async function saveAll() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await Promise.all([
        saveSettings("general", general as unknown as Record<string, unknown>),
        saveSettings("menu", menu as unknown as Record<string, unknown>)
      ]);
      setSavedSignature(settingsSignature(general, menu));
      setMessage(text.settingsSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError(text.passwordsMustMatch);
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}/.test(newPassword)) {
      setError(text.passwordRequirements);
      return;
    }
    const user = getFirebaseAuth()?.currentUser;
    if (!user) {
      setError(text.authExpired);
      return;
    }
    try {
      await changeAdminPassword(user, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(text.passwordChanged);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.passwordChangeFailed);
    }
  }

  const currentSignature = useMemo(() => settingsSignature(general, menu), [general, menu]);
  const hasUnsavedChanges = savedSignature ? currentSignature !== savedSignature : false;
  const contactCount = [general.phone, general.whatsapp, general.email, general.googleMapsUrl].filter(Boolean).length;
  const menuEnabledCount = Object.entries(menu).filter(([key, value]) => key !== "updatedAt" && key !== "enableFilters" && Boolean(value)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold">{text.settings}</h1>
            {hasUnsavedChanges ? (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">{text.unsavedChanges}</Badge>
            ) : (
              <Badge className="border-primary/30 bg-primary/10 text-primary">
                <CheckCircle2 className="me-1 h-3 w-3" aria-hidden />
                {text.saved}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{text.settingsDescription}</p>
        </div>
        <Button onClick={saveAll} disabled={saving || !hasUnsavedChanges}>
          <Save className="h-4 w-4" aria-hidden />
          {saving ? text.saving : text.saveSettings}
        </Button>
      </div>
      {message ? <p className="rounded-md border border-primary p-3 text-primary">{message}</p> : null}
      {error ? <p className="rounded-md border border-destructive p-3 text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SettingsSectionButton
          icon={Building2}
          label={text.generalSettings}
          summary={`${contactCount}/4 ${text.contact}`}
          active={activeSection === "general"}
          onClick={() => toggleSection("general")}
        />
        <SettingsSectionButton
          icon={SlidersHorizontal}
          label={text.menuSettings}
          summary={`${menuEnabledCount} ${text.enabled}`}
          active={activeSection === "menu"}
          onClick={() => toggleSection("menu")}
        />
        <SettingsSectionButton
          icon={KeyRound}
          label={text.accountSettings}
          summary={text.accountSecurity}
          active={activeSection === "account"}
          onClick={() => toggleSection("account")}
        />
      </div>

      {activeSection === "general" ? (
        <Card id="general" className="settings-panel">
          <CardHeader><CardTitle>{text.generalSettings}</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <SettingsFormSection title={text.brandDetails}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={text.restaurantNameEnglish}><Input value={general.restaurantName.en} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, en: e.target.value } })} /></Field>
                <Field label={text.restaurantNameArabic}><Input dir="rtl" value={general.restaurantName.ar} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ar: e.target.value } })} /></Field>
                <Field label={text.restaurantNameKurdish}><Input dir="rtl" value={general.restaurantName.ckb} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ckb: e.target.value } })} /></Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={text.englishDescription}><Textarea value={general.description.en || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, en: e.target.value } })} /></Field>
                <Field label={text.arabicDescription}><Textarea dir="rtl" value={general.description.ar || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ar: e.target.value } })} /></Field>
                <Field label={text.kurdishDescription}><Textarea dir="rtl" value={general.description.ckb || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ckb: e.target.value } })} /></Field>
              </div>
            </SettingsFormSection>
            <SettingsFormSection title={text.contact}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={text.phone}><Input value={general.phone || ""} onChange={(e) => setGeneral({ ...general, phone: e.target.value })} /></Field>
                <Field label={text.whatsapp}><Input value={general.whatsapp || ""} onChange={(e) => setGeneral({ ...general, whatsapp: e.target.value })} /></Field>
                <Field label={text.email}><Input type="email" value={general.email || ""} onChange={(e) => setGeneral({ ...general, email: e.target.value })} /></Field>
              </div>
              <Field label={text.address}><Input value={general.address || ""} onChange={(e) => setGeneral({ ...general, address: e.target.value })} /></Field>
              <Field label={text.googleMapsUrl}><Input value={general.googleMapsUrl || ""} onChange={(e) => setGeneral({ ...general, googleMapsUrl: e.target.value })} /></Field>
            </SettingsFormSection>
            <SettingsFormSection title={text.socialLinks}>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Facebook"><Input value={general.socialLinks?.facebook || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, facebook: e.target.value } })} /></Field>
                <Field label="Instagram"><Input value={general.socialLinks?.instagram || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, instagram: e.target.value } })} /></Field>
                <Field label="TikTok"><Input value={general.socialLinks?.tiktok || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, tiktok: e.target.value } })} /></Field>
                <Field label="Snapchat"><Input value={general.socialLinks?.snapchat || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, snapchat: e.target.value } })} /></Field>
              </div>
            </SettingsFormSection>
            <SettingsFormSection title={text.media}>
              <div className="grid gap-4 md:grid-cols-2">
                <ImageUploadField
                  label={text.logo}
                  text={text}
                  path="branding"
                  fileName="logo"
                  imageUrl={general.logoUrl}
                  onUploaded={(result) => setGeneral({ ...general, logoUrl: result.imageUrl, logoPath: result.imagePath })}
                  onRemoved={() => setGeneral({ ...general, logoUrl: "", logoPath: "" })}
                />
                <ImageUploadField
                  label={text.invoiceLogo}
                  text={text}
                  path="branding"
                  fileName="invoice-logo"
                  imageUrl={general.invoiceLogoUrl}
                  helpText={text.invoiceLogoHint}
                  onUploaded={(result) =>
                    setGeneral({
                      ...general,
                      invoiceLogoUrl: result.imageUrl,
                      invoiceLogoPath: result.imagePath
                    })
                  }
                  onRemoved={() => setGeneral({ ...general, invoiceLogoUrl: "", invoiceLogoPath: "" })}
                />
              </div>
            </SettingsFormSection>
            <SettingsFormSection title={text.defaults}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={text.defaultLanguage}>
                  <Select value={general.defaultLanguage} onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value as GeneralSettings["defaultLanguage"] })}>
                    <option value="ckb">{text.kurdish}</option>
                    <option value="ar">{text.arabic}</option>
                    <option value="en">{text.english}</option>
                  </Select>
                </Field>
                <Field label={text.defaultCurrency}>
                  <Select value={general.defaultCurrency} onChange={(e) => setGeneral({ ...general, defaultCurrency: e.target.value as GeneralSettings["defaultCurrency"] })}>
                    <option value="IQD">IQD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TRY">TRY</option>
                  </Select>
                </Field>
                <Field label={text.serviceFee}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={general.serviceFeePercent ?? 10}
                    onChange={(e) => {
                      const next = Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0)));
                      setGeneral({ ...general, serviceFeePercent: next });
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{text.serviceFeeHint}</p>
                </Field>
              </div>
            </SettingsFormSection>
            <SettingsFormSection title={text.openingHours}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label={text.opensAt}>
                  <Select value={String(general.openHour ?? 9)} onChange={(e) => setGeneral({ ...general, openHour: Number(e.target.value) })}>
                    {hourOptions.slice(0, 24).map((h) => (
                      <option key={h} value={h}>{formatHourLabel(h)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={text.closesAt}>
                  <Select value={String(general.closeHour ?? 23)} onChange={(e) => setGeneral({ ...general, closeHour: Number(e.target.value) })}>
                    {hourOptions.slice(1).map((h) => (
                      <option key={h} value={h}>{formatHourLabel(h)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{text.hoursHint}</p>
            </SettingsFormSection>
            <SettingsFormSection title={text.posStationLabels}>
              <p className="text-xs text-muted-foreground">{text.posStationLabelsHint}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={text.kitchenStationLabel}>
                  <Input
                    value={general.posKitchenLabel || ""}
                    placeholder={text.kitchenStationPlaceholder}
                    onChange={(event) =>
                      setGeneral({ ...general, posKitchenLabel: event.target.value })
                    }
                  />
                </Field>
                <Field label={text.barStationLabel}>
                  <Input
                    value={general.posBarLabel || ""}
                    placeholder={text.barStationPlaceholder}
                    onChange={(event) =>
                      setGeneral({ ...general, posBarLabel: event.target.value })
                    }
                  />
                </Field>
              </div>
            </SettingsFormSection>
            <SettingsFormSection title={text.posPrinters}>
              <p className="text-xs text-muted-foreground">{text.posPrintersHint}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleDetectPrinters()}
                  disabled={detectingPrinters}
                >
                  <RefreshCw className={cn("h-4 w-4", detectingPrinters && "animate-spin")} aria-hidden />
                  {detectingPrinters ? text.detectingPrinters : text.detectPrinters}
                </Button>
              </div>
              {detectedPrinters.length ? (
                <div className="rounded-md border bg-background p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{text.connectedPrinters}</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                    {detectedPrinters.map((name) => (
                      <li key={name} className="flex items-center gap-2">
                        <Printer className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={printerDraft}
                  placeholder={text.posPrinterNamePlaceholder}
                  onChange={(event) => setPrinterDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addPrinterName();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addPrinterName()} disabled={!printerDraft.trim()}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {text.addPrinter}
                </Button>
              </div>
              {printerConfig.printers.length ? (
                <ul className="space-y-2">
                  {printerConfig.printers.map((name) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Printer className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate font-medium">{name}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={text.remove}
                        title={text.remove}
                        onClick={() => removePrinterName(name)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{text.noPrintersYet}</p>
              )}
              {printerError ? (
                <p className="text-sm text-destructive">
                  {printerError}{" "}
                  <a
                    href="https://qz.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {text.downloadQzTray}
                  </a>
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label={text.thermalPaperWidth}>
                  <Select
                    value={String(printerConfig.paperWidth)}
                    onChange={(event) =>
                      updatePrinterConfig({
                        ...printerConfig,
                        paperWidth: event.target.value === "58" ? 58 : 80
                      })
                    }
                  >
                    <option value="80">{text.thermalPaper80}</option>
                    <option value="58">{text.thermalPaper58}</option>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">{text.thermalPaperHint}</p>
                </Field>
                <Field label={text.invoicePrinter}>
                  <Select
                    value={printerConfig.invoice}
                    onChange={(event) => updatePrinterConfig({ ...printerConfig, invoice: event.target.value })}
                  >
                    <option value="">{text.usePrintDialog}</option>
                    {printerConfig.printers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={formatAdminText(text.stationPrinterAssign, { name: general.posKitchenLabel?.trim() || text.kitchenStationName })}>
                  <Select
                    value={printerConfig.kitchen}
                    onChange={(event) => updatePrinterConfig({ ...printerConfig, kitchen: event.target.value })}
                  >
                    <option value="">{text.usePrintDialog}</option>
                    {printerConfig.printers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={formatAdminText(text.stationPrinterAssign, { name: general.posBarLabel?.trim() || text.barStationName })}>
                  <Select
                    value={printerConfig.bar}
                    onChange={(event) => updatePrinterConfig({ ...printerConfig, bar: event.target.value })}
                  >
                    <option value="">{text.usePrintDialog}</option>
                    {printerConfig.printers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              {printerMessage ? (
                <p className="inline-flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {printerMessage}
                </p>
              ) : null}
            </SettingsFormSection>
            <div>
              <Button onClick={saveAll} disabled={saving || !hasUnsavedChanges}>{saving ? text.saving : text.saveSettings}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "menu" ? (
        <Card id="menu" className="settings-panel">
          <CardHeader><CardTitle>{text.menuSettings}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(menu).filter(([key]) => key !== "updatedAt" && key !== "enableFilters").map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm font-medium">{menuSettingLabel(key, text)}</span>
                <Switch label={menuSettingLabel(key, text)} checked={Boolean(value)} onCheckedChange={(checked) => setMenu({ ...menu, [key]: checked })} />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <Button onClick={saveAll} disabled={saving || !hasUnsavedChanges}>{saving ? text.saving : text.saveSettings}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "account" ? (
        <Card id="account" className="settings-panel">
          <CardHeader><CardTitle>{text.accountSettings}</CardTitle></CardHeader>
          <CardContent id="admin-password">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handlePasswordChange} noValidate>
              <Field label={text.currentPassword}><PasswordInput value={currentPassword} onChange={setCurrentPassword} toggleLabel={text.showPassword} autoComplete="current-password" /></Field>
              <Field label={text.newPassword}><PasswordInput value={newPassword} onChange={setNewPassword} toggleLabel={text.showPassword} autoComplete="new-password" /></Field>
              <Field label={text.confirmNewPassword}><PasswordInput value={confirmPassword} onChange={setConfirmPassword} toggleLabel={text.showPassword} autoComplete="new-password" /></Field>
              <div className="flex flex-wrap gap-2 md:col-span-3">
                <Button type="submit">{text.changePassword}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SettingsSectionButton({
  icon: Icon,
  label,
  summary,
  active,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  summary: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        "h-auto min-h-20 justify-start rounded-lg p-4 text-start transition-all duration-200",
        active && "shadow-soft"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block whitespace-normal leading-snug">{label}</span>
        <span className={cn("mt-1 block text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{summary}</span>
      </span>
    </Button>
  );
}

function SettingsFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-muted/15 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

// A password field with an Eye/EyeOff reveal toggle (same pattern as the login form).
function PasswordInput({
  value,
  onChange,
  toggleLabel,
  autoComplete
}: {
  value: string;
  onChange: (value: string) => void;
  toggleLabel: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <Input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        aria-label={toggleLabel}
        onClick={() => setShow((current) => !current)}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </Button>
    </div>
  );
}

function sectionFromHash(hash: string): SettingsSection | null {
  const value = hash.replace("#", "");
  if (value === "admin-password") return "account";
  if (value === "general" || value === "menu" || value === "account") return value;
  return null;
}

function settingsSignature(general: GeneralSettings, menu: MenuSettings) {
  return JSON.stringify({ general, menu });
}

// Whole-hour options 0–24 (24 = midnight, used as a closing time).
const hourOptions = Array.from({ length: 25 }, (_, i) => i);

function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const date = new Date(2000, 0, 1, normalized, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function menuSettingLabel(key: string, text: Record<string, string>) {
  return text[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}
