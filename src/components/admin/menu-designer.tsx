"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/forms/image-upload-field";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { menuThemeStyle } from "@/lib/utils/color";
import { getAdminAppData, listClients, saveSettings } from "@/lib/firebase/firestore";
import { setActiveClientSlug } from "@/lib/tenant";
import { defaultAppearanceSettings, defaultGeneralSettings, defaultMenuItems, defaultMenuSettings } from "@/data/default-data";
import type { AppearanceSettings, ClientAccount, GeneralSettings } from "@/types/models";

const SAMPLE_ITEMS = defaultMenuItems.slice(0, 2);

// Central per-cafe menu design editor, shown in the platform /admin panel. The
// design data lives on each tenant (clients/{slug}/settings/{general,appearance}),
// so we point the active client slug at the selected cafe only around the
// tenant-scoped load/save calls, then reset it — keeping the rest of /admin
// (listClients, auth) on the platform root scope.
export function MenuDesigner() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [slug, setSlug] = useState("");
  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneralSettings);
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearanceSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setError("Could not load cafes."));
  }, []);

  async function loadCafe(next: string) {
    setSlug(next);
    setMessage("");
    setError("");
    if (!next) return;
    setLoading(true);
    setActiveClientSlug(next);
    try {
      const data = await getAdminAppData();
      setGeneral(data.general);
      setAppearance(data.appearance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this cafe's design.");
    } finally {
      setActiveClientSlug(null);
      setLoading(false);
    }
  }

  async function save() {
    if (!slug) return;
    setSaving(true);
    setMessage("");
    setError("");
    setActiveClientSlug(slug);
    try {
      await Promise.all([
        saveSettings("general", general as unknown as Record<string, unknown>),
        saveSettings("appearance", appearance as unknown as Record<string, unknown>)
      ]);
      setMessage("Saved. The live menu updates within about a minute.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the design.");
    } finally {
      setActiveClientSlug(null);
      setSaving(false);
    }
  }

  const update = (patch: Partial<AppearanceSettings>) => setAppearance((prev) => ({ ...prev, ...patch }));
  const backgroundType = appearance.backgroundType ?? "preset";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Menu Design</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Cafe">
              <Select value={slug} onChange={(e) => loadCafe(e.target.value)}>
                <option value="">Select a cafe…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.slug}>
                    {client.name} (/{client.slug})
                  </option>
                ))}
              </Select>
            </Field>
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
              </p>
            ) : null}
            {!clients.length ? (
              <p className="text-sm text-muted-foreground">No cafes yet. Create one in the Clients tab first.</p>
            ) : null}
          </CardContent>
        </Card>

        {slug && !loading ? (
          <>
            <Card>
              <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <ImageUploadField
                  label="Logo"
                  path={`clients/${slug}/logo`}
                  imageUrl={general.logoUrl}
                  onUploaded={(result) => setGeneral({ ...general, logoUrl: result.imageUrl, logoPath: result.imagePath })}
                  onRemoved={() => setGeneral({ ...general, logoUrl: undefined, logoPath: undefined })}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Name (English)"><Input value={general.restaurantName.en} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, en: e.target.value } })} /></Field>
                  <Field label="Name (Arabic)"><Input dir="rtl" value={general.restaurantName.ar} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ar: e.target.value } })} /></Field>
                  <Field label="Name (Kurdish)"><Input dir="rtl" value={general.restaurantName.ckb} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ckb: e.target.value } })} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Description (English)"><Textarea value={general.description.en || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, en: e.target.value } })} /></Field>
                  <Field label="Description (Arabic)"><Textarea dir="rtl" value={general.description.ar || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ar: e.target.value } })} /></Field>
                  <Field label="Description (Kurdish)"><Textarea dir="rtl" value={general.description.ckb || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ckb: e.target.value } })} /></Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Colors &amp; Theme</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <Field label="Primary color"><Input type="color" value={appearance.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} /></Field>
                <Field label="Secondary color"><Input type="color" value={appearance.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })} /></Field>
                <Field label="Corner radius (px)"><Input type="number" value={appearance.borderRadius} onChange={(e) => update({ borderRadius: Number(e.target.value) })} /></Field>
                <Field label="Default theme">
                  <Select value={appearance.defaultTheme} onChange={(e) => update({ defaultTheme: e.target.value as AppearanceSettings["defaultTheme"] })}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Item Cards</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Card design">
                  <Select value={appearance.cardDesign ?? "classic"} onChange={(e) => update({ cardDesign: e.target.value as AppearanceSettings["cardDesign"] })}>
                    <option value="classic">Classic — photo on top</option>
                    <option value="compact">Compact list — thumbnail beside text</option>
                    <option value="overlay">Image overlay — text over photo</option>
                  </Select>
                </Field>
                <Field label="Surface style">
                  <Select value={appearance.cardStyle} onChange={(e) => update({ cardStyle: e.target.value as AppearanceSettings["cardStyle"] })}>
                    <option value="flat">Flat</option>
                    <option value="outlined">Outlined</option>
                    <option value="elevated">Elevated</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Category nav style">
                  <Select value={appearance.categoryNavStyle ?? "pills"} onChange={(e) => update({ categoryNavStyle: e.target.value as AppearanceSettings["categoryNavStyle"] })}>
                    <option value="pills">Pill tabs</option>
                    <option value="underline">Underline tabs</option>
                    <option value="cards">Category cards</option>
                  </Select>
                </Field>
                <Field label="Section header style">
                  <Select value={appearance.sectionHeaderStyle ?? "plain"} onChange={(e) => update({ sectionHeaderStyle: e.target.value as AppearanceSettings["sectionHeaderStyle"] })}>
                    <option value="plain">Plain</option>
                    <option value="divider">Centered with dividers</option>
                    <option value="banner">Filled banner</option>
                    <option value="centered">Centered</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Background</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Background type">
                  <Select value={backgroundType} onChange={(e) => update({ backgroundType: e.target.value as AppearanceSettings["backgroundType"] })}>
                    <option value="preset">Preset (animated café)</option>
                    <option value="solid">Solid color</option>
                    <option value="gradient">Gradient</option>
                    <option value="image">Uploaded image</option>
                  </Select>
                </Field>

                {backgroundType === "solid" ? (
                  <Field label="Background color"><Input type="color" value={appearance.backgroundColor || "#ffffff"} onChange={(e) => update({ backgroundColor: e.target.value })} /></Field>
                ) : null}

                {backgroundType === "gradient" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Gradient top"><Input type="color" value={appearance.backgroundGradientFrom || "#ecfdf5"} onChange={(e) => update({ backgroundGradientFrom: e.target.value })} /></Field>
                    <Field label="Gradient bottom"><Input type="color" value={appearance.backgroundGradientTo || "#ffffff"} onChange={(e) => update({ backgroundGradientTo: e.target.value })} /></Field>
                  </div>
                ) : null}

                {backgroundType === "image" ? (
                  <div className="grid gap-4">
                    <ImageUploadField
                      label="Background image"
                      path={`clients/${slug}/background`}
                      imageUrl={appearance.backgroundImageUrl}
                      onUploaded={(result) => update({ backgroundImageUrl: result.imageUrl, backgroundImagePath: result.imagePath })}
                      onRemoved={() => update({ backgroundImageUrl: undefined, backgroundImagePath: undefined })}
                    />
                    <Field label={`Darken for readability (${appearance.backgroundOverlay ?? 45}%)`}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={appearance.backgroundOverlay ?? 45}
                        onChange={(e) => update({ backgroundOverlay: Number(e.target.value) })}
                        className="w-full"
                      />
                    </Field>
                  </div>
                ) : null}

                {backgroundType === "preset" ? (
                  <p className="text-sm text-muted-foreground">The drifting café-icon animation (the original look).</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : <Save className="me-2 h-4 w-4" aria-hidden />}
                {saving ? "Saving…" : "Save design"}
              </Button>
              {message ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> {message}
                </span>
              ) : null}
              {error ? <span className="text-sm text-destructive">{error}</span> : null}
            </div>
          </>
        ) : null}
      </div>

      {/* Live preview */}
      {slug && !loading ? (
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
            <CardContent>
              <DesignPreview appearance={appearance} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function previewBackgroundStyle(appearance: AppearanceSettings): React.CSSProperties {
  const type = appearance.backgroundType ?? "preset";
  if (type === "solid") return { backgroundColor: appearance.backgroundColor || "#ffffff" };
  if (type === "gradient") return { backgroundImage: `linear-gradient(to bottom, ${appearance.backgroundGradientFrom || "#ecfdf5"}, ${appearance.backgroundGradientTo || "#ffffff"})` };
  if (type === "image" && appearance.backgroundImageUrl) return { backgroundImage: `url(${appearance.backgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
  return { backgroundImage: "linear-gradient(to bottom, #ecfdf5, #ffffff)" };
}

// Lightweight sample of the menu (background + two cards) rendered with the
// chosen appearance so changes are visible before saving. Uses the same
// MenuItemCard and theme-variable injection as the live menu.
function DesignPreview({ appearance }: { appearance: AppearanceSettings }) {
  const overlay = appearance.backgroundType === "image" ? Math.min(100, Math.max(0, appearance.backgroundOverlay ?? 45)) / 100 : 0;
  const cardDesign = appearance.cardDesign ?? "classic";
  const gridClass = cardDesign === "compact" ? "grid gap-3" : "grid gap-4 sm:grid-cols-2";
  const isDark = appearance.defaultTheme === "dark";

  const locale = useMemo(() => "en" as const, []);

  return (
    <div className={isDark ? "dark" : undefined}>
      <div className="relative overflow-hidden rounded-xl border" style={{ ...menuThemeStyle(appearance) }}>
        <div className="absolute inset-0" style={previewBackgroundStyle(appearance)} aria-hidden />
        {overlay ? <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} aria-hidden /> : null}
        <div className="relative space-y-3 bg-background/0 p-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Coffee</div>
          <div className={gridClass}>
            {SAMPLE_ITEMS.map((item) => (
              <MenuItemCard key={item.id} item={item} locale={locale} settings={defaultMenuSettings} appearance={appearance} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
