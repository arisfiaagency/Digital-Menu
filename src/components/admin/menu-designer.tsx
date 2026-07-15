"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/forms/image-upload-field";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import { cn } from "@/lib/utils/cn";
import { hexToRgba, menuThemeStyle, readableForegroundHslVar } from "@/lib/utils/color";
import { getAdminAppData, listClients, saveSettings } from "@/lib/firebase/firestore";
import { setActiveClientSlug } from "@/lib/tenant";
import { defaultAppearanceSettings, defaultGeneralSettings, defaultMenuItems, defaultMenuSettings } from "@/data/default-data";
import { localeLabels } from "@/lib/i18n/config";
import type { AppearanceSettings, ClientAccount, GeneralSettings, Locale, MenuSettings } from "@/types/models";

const MENU_SETTING_LABELS: Record<string, string> = {
  showImages: "Show item photos",
  showPrices: "Show prices & cart",
  showCalories: "Show calories",
  showIngredients: "Show ingredients",
  showAllergens: "Show allergens",
  showSoldOutItems: "Show sold-out items",
  enableSearch: "Enable search bar",
  enableDarkMode: "Enable dark mode"
};

const ALL_LOCALES: Locale[] = ["ckb", "ar", "en"];
const CURRENCIES = ["IQD", "USD", "EUR", "TRY"] as const;

type LookPreset = {
  id: string;
  name: string;
  blurb: string;
  swatch: [string, string];
  patch: Partial<AppearanceSettings>;
};

const LOOK_PRESETS: LookPreset[] = [
  {
    id: "fresh-green",
    name: "Fresh Green",
    blurb: "Bright cafe classic",
    swatch: ["#0f766e", "#be123c"],
    patch: {
      primaryColor: "#0f766e",
      secondaryColor: "#be123c",
      defaultTheme: "light",
      cardDesign: "classic",
      categoryNavStyle: "pills",
      sectionHeaderStyle: "plain",
      backgroundType: "preset",
      fontPreset: "brand",
      pageDensity: "comfortable",
      borderRadius: 12,
      welcomeAccentColor: "#A4D8A6",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#d7efd8",
      welcomeBackgroundGradientTo: "#86cc8a"
    }
  },
  {
    id: "espresso",
    name: "Espresso",
    blurb: "Dark roast lounge",
    swatch: ["#6f4e37", "#c4a484"],
    patch: {
      primaryColor: "#6f4e37",
      secondaryColor: "#c4a484",
      defaultTheme: "dark",
      cardDesign: "overlay",
      categoryNavStyle: "bubble",
      sectionHeaderStyle: "accent",
      backgroundType: "solid",
      pageSurfaceColor: "#1c1410",
      cardSurfaceColor: "#2a1f18",
      fontPreset: "classic",
      pageDensity: "cozy",
      borderRadius: 16,
      priceStyle: "large",
      welcomeAccentColor: "#c4a484",
      welcomeBackgroundStyle: "solid",
      welcomeBackgroundColor: "#2a1f18",
      welcomeCardStyle: "solid",
      welcomeEnterStyle: "rounded"
    }
  },
  {
    id: "coral-bistro",
    name: "Coral Bistro",
    blurb: "Warm & playful",
    swatch: ["#e11d48", "#fb923c"],
    patch: {
      primaryColor: "#e11d48",
      secondaryColor: "#fb923c",
      defaultTheme: "light",
      cardDesign: "poster",
      categoryNavStyle: "cards",
      sectionHeaderStyle: "banner",
      backgroundType: "gradient",
      backgroundGradientFrom: "#fff1f2",
      backgroundGradientTo: "#fff7ed",
      fontPreset: "soft",
      itemColumns: "2",
      priceStyle: "badge",
      borderRadius: 20,
      welcomeAccentColor: "#fb7185",
      welcomeLanguageStyle: "cards",
      welcomeCardStyle: "floating",
      welcomeEnterStyle: "pill"
    }
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Cool urban night",
    swatch: ["#6366f1", "#22d3ee"],
    patch: {
      primaryColor: "#6366f1",
      secondaryColor: "#22d3ee",
      defaultTheme: "dark",
      cardDesign: "minimal",
      categoryNavStyle: "segmented",
      sectionHeaderStyle: "numbered",
      backgroundType: "pattern",
      backgroundColor: "#0f172a",
      backgroundPattern: "mesh",
      backgroundPatternColor: "#6366f1",
      fontPreset: "modern",
      pageDensity: "compact",
      navSurface: "tinted",
      borderRadius: 8,
      welcomeAccentColor: "#818cf8",
      welcomeBackgroundStyle: "gradient",
      welcomeBackgroundGradientFrom: "#1e1b4b",
      welcomeBackgroundGradientTo: "#0f172a",
      welcomeCardStyle: "glass",
      welcomeEnterStyle: "outline"
    }
  },
  {
    id: "sand",
    name: "Warm Sand",
    blurb: "Soft daylight menu",
    swatch: ["#b45309", "#78716c"],
    patch: {
      primaryColor: "#b45309",
      secondaryColor: "#78716c",
      defaultTheme: "light",
      cardDesign: "compact",
      categoryNavStyle: "underline",
      sectionHeaderStyle: "overline",
      backgroundType: "solid",
      pageSurfaceColor: "#faf7f2",
      cardSurfaceColor: "#ffffff",
      fontPreset: "classic",
      contentWidth: "narrow",
      imageAspect: "square",
      borderRadius: 10,
      welcomeAccentColor: "#d97706",
      welcomeBackgroundStyle: "pattern",
      welcomeBackgroundColor: "#faf7f2",
      welcomeBackgroundPattern: "dots",
      welcomeCardWidth: "narrow",
      welcomeEnterStyle: "square"
    }
  },
  {
    id: "berry",
    name: "Berry Cafe",
    blurb: "Bold dessert shop",
    swatch: ["#9d174d", "#a21caf"],
    patch: {
      primaryColor: "#9d174d",
      secondaryColor: "#a21caf",
      defaultTheme: "light",
      cardDesign: "classic",
      categoryNavStyle: "iconOnly",
      sectionHeaderStyle: "boxed",
      backgroundType: "image",
      fontPreset: "soft",
      itemColumns: "3",
      priceStyle: "badge",
      sectionTitleCase: "uppercase",
      borderRadius: 18,
      welcomeAccentColor: "#db2777",
      welcomeLanguageStyle: "segmented",
      welcomeCardAlign: "bottom",
      welcomeCardWidth: "wide",
      welcomeEnterStyle: "rounded"
    }
  }
];

const SAMPLE_ITEMS = defaultMenuItems.slice(0, 2);
const HOUR_OPTIONS = Array.from({ length: 25 }, (_, hour) => hour);
const WELCOME_BACKGROUND_MEDIA_HINT = "Supports images or videos. Recommended: 1080x1920 px mobile / 1920x1080 px desktop. Max upload: 100 MB.";
const WELCOME_BACKGROUND_MEDIA_MAX_BYTES = 100 * 1024 * 1024;
type DesignerTab = "menu" | "welcome";

// Central per-cafe menu design editor, shown in the platform /admin panel. The
// design data lives on each tenant (clients/{slug}/settings/{general,appearance}),
// so we point the active client slug at the selected cafe only around the
// tenant-scoped load/save calls, then reset it — keeping the rest of /admin
// (listClients, auth) on the platform root scope.
export function MenuDesigner() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [slug, setSlug] = useState("");
  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneralSettings);
  const [menu, setMenu] = useState<MenuSettings>(defaultMenuSettings);
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearanceSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeDesignerTab, setActiveDesignerTab] = useState<DesignerTab>("menu");

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
      setMenu(data.menu);
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
        saveSettings("menu", menu as unknown as Record<string, unknown>),
        saveSettings("appearance", appearance as unknown as Record<string, unknown>)
      ]);
      setMessage("Saved. The live menu updates within about 20 seconds.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the design.");
    } finally {
      setActiveClientSlug(null);
      setSaving(false);
    }
  }

  const update = (patch: Partial<AppearanceSettings>) => setAppearance((prev) => ({ ...prev, ...patch }));
  const updateMenu = (patch: Partial<MenuSettings>) => setMenu((prev) => ({ ...prev, ...patch }));
  const backgroundType = appearance.backgroundType ?? "preset";

  function toggleEnabledLanguage(entry: Locale) {
    const current = general.enabledLanguages?.length ? general.enabledLanguages : ALL_LOCALES;
    const next = current.includes(entry) ? current.filter((locale) => locale !== entry) : [...current, entry];
    if (!next.length) return;
    setGeneral({ ...general, enabledLanguages: next });
  }

  const enabledLanguageList = general.enabledLanguages?.length ? general.enabledLanguages : ALL_LOCALES;

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
            <div className="inline-flex w-full max-w-md gap-1 rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Design sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeDesignerTab === "menu"}
                onClick={() => setActiveDesignerTab("menu")}
                className={cn(
                  "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeDesignerTab === "menu" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Menu Page
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeDesignerTab === "welcome"}
                onClick={() => setActiveDesignerTab("welcome")}
                className={cn(
                  "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeDesignerTab === "welcome" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Welcome Page
              </button>
            </div>

            <Card className={activeDesignerTab === "welcome" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Welcome Page</CardTitle></CardHeader>
              <CardContent className="grid gap-6">
                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Header &amp; cafe name</h3>
                    <p className="text-sm text-muted-foreground">This controls the first screen at /{slug} before customers enter the menu.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Cafe name (English)"><Input value={general.restaurantName.en} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, en: e.target.value } })} /></Field>
                    <Field label="Cafe name (Arabic)"><Input dir="rtl" value={general.restaurantName.ar} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ar: e.target.value } })} /></Field>
                    <Field label="Cafe name (Kurdish)"><Input dir="rtl" value={general.restaurantName.ckb} onChange={(e) => setGeneral({ ...general, restaurantName: { ...general.restaurantName, ckb: e.target.value } })} /></Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Welcome header (English)"><Input value={general.welcomeHeader?.en || ""} placeholder="Welcome to" onChange={(e) => setGeneral({ ...general, welcomeHeader: { ...general.welcomeHeader, en: e.target.value } })} /></Field>
                    <Field label="Welcome header (Arabic)"><Input dir="rtl" value={general.welcomeHeader?.ar || ""} placeholder="أهلاً بك في" onChange={(e) => setGeneral({ ...general, welcomeHeader: { ...general.welcomeHeader, ar: e.target.value } })} /></Field>
                    <Field label="Welcome header (Kurdish)"><Input dir="rtl" value={general.welcomeHeader?.ckb || ""} placeholder="بەخێربێیت بۆ" onChange={(e) => setGeneral({ ...general, welcomeHeader: { ...general.welcomeHeader, ckb: e.target.value } })} /></Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Tagline (English)"><Input value={general.welcomeTagline?.en || ""} placeholder="Freshly brewed, just for you" onChange={(e) => setGeneral({ ...general, welcomeTagline: { ...general.welcomeTagline, en: e.target.value } })} /></Field>
                    <Field label="Tagline (Arabic)"><Input dir="rtl" value={general.welcomeTagline?.ar || ""} placeholder="قهوة طازجة، خصيصاً لك" onChange={(e) => setGeneral({ ...general, welcomeTagline: { ...general.welcomeTagline, ar: e.target.value } })} /></Field>
                    <Field label="Tagline (Kurdish)"><Input dir="rtl" value={general.welcomeTagline?.ckb || ""} placeholder="قاوەی تازە، تایبەت بۆ تۆ" onChange={(e) => setGeneral({ ...general, welcomeTagline: { ...general.welcomeTagline, ckb: e.target.value } })} /></Field>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Logo</h3>
                    <p className="text-sm text-muted-foreground">Shown on the welcome card before guests enter the menu.</p>
                  </div>
                  <ImageUploadField
                    label="Welcome logo"
                    path={`clients/${slug}/logo`}
                    imageUrl={general.logoUrl}
                    onUploaded={(result) => setGeneral({ ...general, logoUrl: result.imageUrl, logoPath: result.imagePath })}
                    onRemoved={() => setGeneral({ ...general, logoUrl: undefined, logoPath: undefined })}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Logo shape">
                      <Select value={appearance.welcomeLogoStyle ?? "circle"} onChange={(e) => update({ welcomeLogoStyle: e.target.value as AppearanceSettings["welcomeLogoStyle"] })}>
                        <option value="circle">Circle</option>
                        <option value="rounded">Rounded square</option>
                        <option value="square">Square</option>
                      </Select>
                    </Field>
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Show social links</p>
                        <p className="text-xs text-muted-foreground">Hide the social row on the welcome screen.</p>
                      </div>
                      <Switch label="Show social links on welcome" checked={appearance.welcomeShowSocialLinks !== false} onCheckedChange={(v) => update({ welcomeShowSocialLinks: v })} />
                    </div>
                  </div>
                </section>

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Languages on welcome</h3>
                    <p className="text-sm text-muted-foreground">Choose which languages guests can pick before entering the menu.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LOCALES.map((entry) => {
                      const active = enabledLanguageList.includes(entry);
                      return (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => toggleEnabledLanguage(entry)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                            active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {localeLabels[entry]}
                        </button>
                      );
                    })}
                  </div>
                  <Field label="Default menu language">
                    <Select value={general.defaultLanguage} onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value as GeneralSettings["defaultLanguage"] })}>
                      {enabledLanguageList.map((entry) => (
                        <option key={entry} value={entry}>{localeLabels[entry]}</option>
                      ))}
                    </Select>
                  </Field>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-2">
                    <div>
                      <p className="text-sm font-medium">Show dark/night mode toggle</p>
                      <p className="text-xs text-muted-foreground">Turn this off if this cafe should not offer dark mode to customers.</p>
                    </div>
                    <Switch label="Show dark/night mode toggle" checked={menu.enableDarkMode !== false} onCheckedChange={(v) => updateMenu({ enableDarkMode: v })} />
                  </div>
                  {menu.enableDarkMode !== false ? (
                    <>
                      <Field label="Theme icon design">
                        <Select value={appearance.welcomeThemeToggleStyle ?? "circle"} onChange={(e) => update({ welcomeThemeToggleStyle: e.target.value as AppearanceSettings["welcomeThemeToggleStyle"] })}>
                          <option value="circle">Circle button</option>
                          <option value="pill">Pill button</option>
                          <option value="segmented">Segmented button</option>
                        </Select>
                      </Field>
                      <Field label="Theme icon set">
                        <Select value={appearance.welcomeThemeIconStyle ?? "sunMoon"} onChange={(e) => update({ welcomeThemeIconStyle: e.target.value as AppearanceSettings["welcomeThemeIconStyle"] })}>
                          <option value="sunMoon">Sun / moon</option>
                          <option value="coffeeMoon">Coffee / moon</option>
                          <option value="sparkles">Sparkles / moon</option>
                          <option value="contrast">Contrast icon</option>
                        </Select>
                      </Field>
                    </>
                  ) : null}
                  <Field label="Language selector design">
                    <Select value={appearance.welcomeLanguageStyle ?? "buttons"} onChange={(e) => update({ welcomeLanguageStyle: e.target.value as AppearanceSettings["welcomeLanguageStyle"] })}>
                      <option value="buttons">Icon + buttons</option>
                      <option value="segmented">Segmented control</option>
                      <option value="cards">Language cards</option>
                      <option value="minimal">Minimal text</option>
                    </Select>
                  </Field>
                  <Field label="Enter button style">
                    <Select value={appearance.welcomeEnterStyle ?? "pill"} onChange={(e) => update({ welcomeEnterStyle: e.target.value as AppearanceSettings["welcomeEnterStyle"] })}>
                      <option value="pill">Pill</option>
                      <option value="rounded">Rounded</option>
                      <option value="square">Square</option>
                      <option value="outline">Outline</option>
                    </Select>
                  </Field>
                  <Field label="Welcome card width">
                    <Select value={appearance.welcomeCardWidth ?? "normal"} onChange={(e) => update({ welcomeCardWidth: e.target.value as AppearanceSettings["welcomeCardWidth"] })}>
                      <option value="narrow">Narrow</option>
                      <option value="normal">Normal</option>
                      <option value="wide">Wide</option>
                    </Select>
                  </Field>
                  <Field label="Welcome card position">
                    <Select value={appearance.welcomeCardAlign ?? "center"} onChange={(e) => update({ welcomeCardAlign: e.target.value as AppearanceSettings["welcomeCardAlign"] })}>
                      <option value="center">Centered</option>
                      <option value="bottom">Lower on screen</option>
                    </Select>
                  </Field>
                  <Field label="Accent color"><Input type="color" value={appearance.welcomeAccentColor || "#A4D8A6"} onChange={(e) => update({ welcomeAccentColor: e.target.value })} /></Field>
                  <Field label="Welcome text color"><Input type="color" value={appearance.welcomeHeaderTextColor || appearance.welcomeAccentColor || "#A4D8A6"} onChange={(e) => update({ welcomeHeaderTextColor: e.target.value })} /></Field>
                  <Field label="Tagline/helper text color"><Input type="color" value={appearance.welcomeHelperTextColor || appearance.welcomeFormTextColor || "#6b7280"} onChange={(e) => update({ welcomeHelperTextColor: e.target.value })} /></Field>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <Field label="Form/card design">
                    <Select value={appearance.welcomeCardStyle ?? "glass"} onChange={(e) => update({ welcomeCardStyle: e.target.value as AppearanceSettings["welcomeCardStyle"] })}>
                      <option value="glass">Glass card</option>
                      <option value="solid">Solid card</option>
                      <option value="outlined">Outlined card</option>
                      <option value="floating">Floating card</option>
                    </Select>
                  </Field>
                  <Field label="Form/card pattern">
                    <Select value={appearance.welcomeCardPattern ?? "none"} onChange={(e) => update({ welcomeCardPattern: e.target.value as AppearanceSettings["welcomeCardPattern"] })}>
                      <option value="none">None</option>
                      <option value="dots">Dots</option>
                      <option value="grid">Grid</option>
                      <option value="diagonal">Diagonal lines</option>
                      <option value="waves">Waves</option>
                    </Select>
                  </Field>
                  <Field label="Form/card color"><Input type="color" value={appearance.welcomeFormColor || "#ffffff"} onChange={(e) => update({ welcomeFormColor: e.target.value })} /></Field>
                  <Field label="Form/card text color"><Input type="color" value={appearance.welcomeFormTextColor || "#111827"} onChange={(e) => update({ welcomeFormTextColor: e.target.value })} /></Field>
                  <Field label="Form/card border color"><Input type="color" value={appearance.welcomeFormBorderColor || "#A4D8A6"} onChange={(e) => update({ welcomeFormBorderColor: e.target.value })} /></Field>
                  <Field label={`Form/card blur (${appearance.welcomeFormBlur ?? 24}px)`}>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={appearance.welcomeFormBlur ?? 24}
                      onChange={(e) => update({ welcomeFormBlur: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </Field>
                  <Field label={`Form/card transparency (${appearance.welcomeFormTransparency ?? 15}%)`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={appearance.welcomeFormTransparency ?? 15}
                      onChange={(e) => update({ welcomeFormTransparency: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </Field>
                </section>

                <section className="grid gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">Welcome background</h3>
                    <p className="text-sm text-muted-foreground">Choose a background style, pattern, and colors for the /{slug} welcome screen.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Background design">
                      <Select value={appearance.welcomeBackgroundStyle ?? "gradient"} onChange={(e) => update({ welcomeBackgroundStyle: e.target.value as AppearanceSettings["welcomeBackgroundStyle"] })}>
                        <option value="gradient">Gradient</option>
                        <option value="solid">Solid color</option>
                        <option value="pattern">Pattern over color</option>
                        <option value="image">Uploaded image/video design</option>
                      </Select>
                    </Field>
                    <Field label="Pattern">
                      <Select value={appearance.welcomeBackgroundPattern ?? "cafe"} onChange={(e) => update({ welcomeBackgroundPattern: e.target.value as AppearanceSettings["welcomeBackgroundPattern"] })}>
                        <option value="none">None</option>
                        <option value="cafe">Floating cafe icons</option>
                        <option value="dots">Dots</option>
                        <option value="grid">Grid</option>
                        <option value="diagonal">Diagonal lines</option>
                        <option value="waves">Waves</option>
                      </Select>
                    </Field>
                    <Field label="Background color"><Input type="color" value={appearance.welcomeBackgroundColor || "#d7efd8"} onChange={(e) => update({ welcomeBackgroundColor: e.target.value })} /></Field>
                    <Field label="Pattern color"><Input type="color" value={appearance.welcomeBackgroundPatternColor || "#3f8a49"} onChange={(e) => update({ welcomeBackgroundPatternColor: e.target.value })} /></Field>
                    <Field label="Gradient start"><Input type="color" value={appearance.welcomeBackgroundGradientFrom || "#d7efd8"} onChange={(e) => update({ welcomeBackgroundGradientFrom: e.target.value })} /></Field>
                    <Field label="Gradient end"><Input type="color" value={appearance.welcomeBackgroundGradientTo || "#86cc8a"} onChange={(e) => update({ welcomeBackgroundGradientTo: e.target.value })} /></Field>
                  </div>
                  {(appearance.welcomeBackgroundStyle ?? "gradient") === "image" ? (
                    <>
                      <ImageUploadField
                        label="Welcome background image or video"
                        path={`clients/${slug}/welcome-background`}
                        imageUrl={appearance.welcomeBackgroundImageUrl}
                        mediaType={appearance.welcomeBackgroundMediaType}
                        helpText={WELCOME_BACKGROUND_MEDIA_HINT}
                        inputHint="Images or MP4/WebM videos up to 100 MB."
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                        allowVideo
                        maxBytes={WELCOME_BACKGROUND_MEDIA_MAX_BYTES}
                        maxBytesLabel="100 MB"
                        onUploaded={(result) => update({ welcomeBackgroundImageUrl: result.imageUrl, welcomeBackgroundImagePath: result.imagePath, welcomeBackgroundMediaType: result.mediaType ?? "image" })}
                        onRemoved={() => update({ welcomeBackgroundImageUrl: undefined, welcomeBackgroundImagePath: undefined, welcomeBackgroundMediaType: undefined })}
                      />
                      <Field label={`Background darken overlay (${appearance.welcomeBackgroundOverlay ?? 15}%)`}>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={appearance.welcomeBackgroundOverlay ?? 15}
                          onChange={(e) => update({ welcomeBackgroundOverlay: Number(e.target.value) })}
                          className="w-full accent-primary"
                        />
                      </Field>
                    </>
                  ) : null}
                </section>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader>
                <CardTitle>Look Presets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Instant starting looks so each cafe can feel different. You can still fine-tune every option below.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {LOOK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => update(preset.patch)}
                      className="rounded-xl border p-3 text-start transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div className="mb-2 flex gap-1.5">
                        <span className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.swatch[0] }} />
                        <span className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.swatch[1] }} />
                      </div>
                      <p className="text-sm font-semibold">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">{preset.blurb}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Menu Display &amp; Behavior</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(menu)
                  .filter(([key]) => key !== "updatedAt" && key !== "enableFilters")
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-md border p-3">
                      <span className="text-sm font-medium">{MENU_SETTING_LABELS[key] || key}</span>
                      <Switch
                        label={MENU_SETTING_LABELS[key] || key}
                        checked={Boolean(value)}
                        onCheckedChange={(checked) => updateMenu({ [key]: checked } as Partial<MenuSettings>)}
                      />
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Languages &amp; Currency</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Enabled menu languages</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LOCALES.map((entry) => {
                      const active = enabledLanguageList.includes(entry);
                      return (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => toggleEnabledLanguage(entry)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                            active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {localeLabels[entry]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Default language">
                    <Select value={general.defaultLanguage} onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value as GeneralSettings["defaultLanguage"] })}>
                      {enabledLanguageList.map((entry) => (
                        <option key={entry} value={entry}>{localeLabels[entry]}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Default currency">
                    <Select value={general.defaultCurrency} onChange={(e) => setGeneral({ ...general, defaultCurrency: e.target.value as GeneralSettings["defaultCurrency"] })}>
                      {CURRENCIES.map((entry) => (
                        <option key={entry} value={entry}>{entry}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
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
                  <Field label="Description (English)"><Textarea value={general.description.en || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, en: e.target.value } })} /></Field>
                  <Field label="Description (Arabic)"><Textarea dir="rtl" value={general.description.ar || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ar: e.target.value } })} /></Field>
                  <Field label="Description (Kurdish)"><Textarea dir="rtl" value={general.description.ckb || ""} onChange={(e) => setGeneral({ ...general, description: { ...general.description, ckb: e.target.value } })} /></Field>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
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
                <Field label="Font style">
                  <Select value={appearance.fontPreset ?? "brand"} onChange={(e) => update({ fontPreset: e.target.value as AppearanceSettings["fontPreset"] })}>
                    <option value="brand">Brand (Cairo / Readex)</option>
                    <option value="modern">Modern system</option>
                    <option value="classic">Classic serif</option>
                    <option value="soft">Soft rounded</option>
                  </Select>
                </Field>
                <Field label="Page surface color"><Input type="color" value={appearance.pageSurfaceColor || "#f8fafc"} onChange={(e) => update({ pageSurfaceColor: e.target.value })} /></Field>
                <Field label="Card surface color"><Input type="color" value={appearance.cardSurfaceColor || "#ffffff"} onChange={(e) => update({ cardSurfaceColor: e.target.value })} /></Field>
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={() => update({ pageSurfaceColor: undefined, cardSurfaceColor: undefined })}>
                    Reset surfaces
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Layout</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Menu layout">
                  <Select value={appearance.menuLayout} onChange={(e) => update({ menuLayout: e.target.value as AppearanceSettings["menuLayout"] })}>
                    <option value="list">List</option>
                    <option value="grid">Grid</option>
                  </Select>
                </Field>
                <Field label="Item columns">
                  <Select value={appearance.itemColumns ?? "auto"} onChange={(e) => update({ itemColumns: e.target.value as AppearanceSettings["itemColumns"] })}>
                    <option value="auto">Auto (by card design)</option>
                    <option value="1">1 column</option>
                    <option value="2">2 columns</option>
                    <option value="3">3 columns</option>
                  </Select>
                </Field>
                <Field label="Page density">
                  <Select value={appearance.pageDensity ?? "comfortable"} onChange={(e) => update({ pageDensity: e.target.value as AppearanceSettings["pageDensity"] })}>
                    <option value="cozy">Cozy (more space)</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </Select>
                </Field>
                <Field label="Content width">
                  <Select value={appearance.contentWidth ?? "normal"} onChange={(e) => update({ contentWidth: e.target.value as AppearanceSettings["contentWidth"] })}>
                    <option value="narrow">Narrow</option>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                  </Select>
                </Field>
                <Field label="Header density">
                  <Select value={appearance.headerLayout} onChange={(e) => update({ headerLayout: e.target.value as AppearanceSettings["headerLayout"] })}>
                    <option value="expanded">Expanded</option>
                    <option value="compact">Compact</option>
                  </Select>
                </Field>
                <Field label="Category bar surface">
                  <Select value={appearance.navSurface ?? "solid"} onChange={(e) => update({ navSurface: e.target.value as AppearanceSettings["navSurface"] })}>
                    <option value="solid">Solid</option>
                    <option value="muted">Muted</option>
                    <option value="tinted">Primary tint</option>
                    <option value="transparent">Soft transparent</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-2">
                  <div>
                    <p className="text-sm font-medium">Show description under cafe name</p>
                    <p className="text-xs text-muted-foreground">Uses the multilingual description from Branding.</p>
                  </div>
                  <Switch label="Show header description" checked={appearance.showHeaderDescription !== false} onCheckedChange={(v) => update({ showHeaderDescription: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Header</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Logo design">
                  <Select value={appearance.menuLogoStyle ?? "rounded"} onChange={(e) => update({ menuLogoStyle: e.target.value as AppearanceSettings["menuLogoStyle"] })}>
                    <option value="rounded">Rounded square</option>
                    <option value="circle">Circle</option>
                    <option value="square">Sharp square</option>
                    <option value="badge">Badge frame</option>
                    <option value="wordmark">Wide wordmark</option>
                  </Select>
                </Field>
                <Field label="Alignment">
                  <Select value={appearance.headerAlign ?? "left"} onChange={(e) => update({ headerAlign: e.target.value as AppearanceSettings["headerAlign"] })}>
                    <option value="left">Left</option>
                    <option value="center">Centered</option>
                  </Select>
                </Field>
                <Field label="Open / closed badge">
                  <Select value={appearance.openStatusStyle ?? "pill"} onChange={(e) => update({ openStatusStyle: e.target.value as AppearanceSettings["openStatusStyle"] })}>
                    <option value="pill">Pill with time</option>
                    <option value="compact">Compact status</option>
                    <option value="outline">Outlined</option>
                    <option value="card">Small card</option>
                    <option value="banner">Filled banner</option>
                  </Select>
                </Field>
                <Field label="Header background">
                  <Select value={appearance.headerBackgroundType ?? "theme"} onChange={(e) => update({ headerBackgroundType: e.target.value as AppearanceSettings["headerBackgroundType"] })}>
                    <option value="theme">Theme (default)</option>
                    <option value="solid">Solid color</option>
                    <option value="gradient">Gradient</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 pt-6">
                  <span className="text-sm font-medium">Show contact row</span>
                  <Switch label="Show contact row" checked={appearance.showContactRow !== false} onCheckedChange={(v) => update({ showContactRow: v })} />
                </div>
                {(appearance.headerBackgroundType ?? "theme") === "solid" ? (
                  <Field label="Header color"><Input type="color" value={appearance.headerBackgroundColor || "#ffffff"} onChange={(e) => update({ headerBackgroundColor: e.target.value })} /></Field>
                ) : null}
                {(appearance.headerBackgroundType ?? "theme") === "gradient" ? (
                  <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                    <Field label="Header gradient top"><Input type="color" value={appearance.headerGradientFrom || "#ecfdf5"} onChange={(e) => update({ headerGradientFrom: e.target.value })} /></Field>
                    <Field label="Header gradient bottom"><Input type="color" value={appearance.headerGradientTo || "#ffffff"} onChange={(e) => update({ headerGradientTo: e.target.value })} /></Field>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Hours &amp; Contact Links</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Open time">
                    <Select value={String(general.openHour ?? 9)} onChange={(e) => setGeneral({ ...general, openHour: Number(e.target.value) })}>
                      {HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{formatHourLabel(hour)}</option>)}
                    </Select>
                  </Field>
                  <Field label="Close time">
                    <Select value={String(general.closeHour ?? 23)} onChange={(e) => setGeneral({ ...general, closeHour: Number(e.target.value) })}>
                      {HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{formatHourLabel(hour)}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Phone number"><Input value={general.phone || ""} onChange={(e) => setGeneral({ ...general, phone: e.target.value })} /></Field>
                  <Field label="WhatsApp"><Input value={general.whatsapp || ""} onChange={(e) => setGeneral({ ...general, whatsapp: e.target.value })} /></Field>
                  <Field label="Email"><Input type="email" value={general.email || ""} onChange={(e) => setGeneral({ ...general, email: e.target.value })} /></Field>
                  <Field label="Address"><Input value={general.address || ""} onChange={(e) => setGeneral({ ...general, address: e.target.value })} /></Field>
                  <Field label="Map URL"><Input value={general.googleMapsUrl || ""} onChange={(e) => setGeneral({ ...general, googleMapsUrl: e.target.value })} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Facebook"><Input value={general.socialLinks?.facebook || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, facebook: e.target.value } })} /></Field>
                  <Field label="Instagram"><Input value={general.socialLinks?.instagram || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, instagram: e.target.value } })} /></Field>
                  <Field label="TikTok"><Input value={general.socialLinks?.tiktok || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, tiktok: e.target.value } })} /></Field>
                  <Field label="Snapchat"><Input value={general.socialLinks?.snapchat || ""} onChange={(e) => setGeneral({ ...general, socialLinks: { ...general.socialLinks, snapchat: e.target.value } })} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Contact layout">
                    <Select value={appearance.contactLayout ?? "inline"} onChange={(e) => update({ contactLayout: e.target.value as AppearanceSettings["contactLayout"] })}>
                      <option value="inline">Inline row</option>
                      <option value="centered">Centered row</option>
                      <option value="stacked">Stacked list</option>
                      <option value="grid">Grid</option>
                    </Select>
                  </Field>
                  <Field label="Contact chip design">
                    <Select value={appearance.contactChipStyle ?? "pill"} onChange={(e) => update({ contactChipStyle: e.target.value as AppearanceSettings["contactChipStyle"] })}>
                      <option value="pill">Pill</option>
                      <option value="soft">Soft filled</option>
                      <option value="outline">Primary outline</option>
                      <option value="square">Square</option>
                      <option value="iconOnly">Icon only</option>
                    </Select>
                  </Field>
                  <Field label="Social button design">
                    <Select value={appearance.socialLinkStyle ?? "icons"} onChange={(e) => update({ socialLinkStyle: e.target.value as AppearanceSettings["socialLinkStyle"] })}>
                      <option value="icons">Circle icons</option>
                      <option value="soft">Soft with label</option>
                      <option value="outline">Outline with label</option>
                      <option value="square">Square with label</option>
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Search Bar</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Field label="Shape">
                  <Select value={appearance.searchShape ?? "pill"} onChange={(e) => update({ searchShape: e.target.value as AppearanceSettings["searchShape"] })}>
                    <option value="pill">Pill</option>
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="soft">Soft large radius</option>
                  </Select>
                </Field>
                <Field label="Fill">
                  <Select value={appearance.searchStyle ?? "outlined"} onChange={(e) => update({ searchStyle: e.target.value as AppearanceSettings["searchStyle"] })}>
                    <option value="outlined">Outlined</option>
                    <option value="filled">Filled</option>
                    <option value="glass">Glass</option>
                    <option value="underline">Underline</option>
                    <option value="shadow">Floating shadow</option>
                  </Select>
                </Field>
                <Field label="Size">
                  <Select value={appearance.searchSize ?? "normal"} onChange={(e) => update({ searchSize: e.target.value as AppearanceSettings["searchSize"] })}>
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </Select>
                </Field>
                <Field label="Placement">
                  <Select value={appearance.searchPlacement ?? "header"} onChange={(e) => update({ searchPlacement: e.target.value as AppearanceSettings["searchPlacement"] })}>
                    <option value="header">In header</option>
                    <option value="sticky">Docked with categories</option>
                  </Select>
                </Field>
                <Field label="Icon position">
                  <Select value={appearance.searchIconPosition ?? "left"} onChange={(e) => update({ searchIconPosition: e.target.value as AppearanceSettings["searchIconPosition"] })}>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="none">No icon</option>
                  </Select>
                </Field>
                <Field label="Width">
                  <Select value={appearance.searchWidth ?? "wide"} onChange={(e) => update({ searchWidth: e.target.value as AppearanceSettings["searchWidth"] })}>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                    <option value="full">Full width</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-3">
                  <span className="text-sm font-medium">Show search label</span>
                  <Switch label="Show search label" checked={appearance.searchShowLabel === true} onCheckedChange={(v) => update({ searchShowLabel: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Item Cards</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Card design">
                  <Select value={appearance.cardDesign ?? "classic"} onChange={(e) => update({ cardDesign: e.target.value as AppearanceSettings["cardDesign"] })}>
                    <option value="classic">Classic — photo on top</option>
                    <option value="compact">Compact list — thumbnail beside text</option>
                    <option value="overlay">Image overlay — text over photo</option>
                    <option value="minimal">Minimal — text first, no photo</option>
                    <option value="poster">Poster — tall photo with title</option>
                  </Select>
                </Field>
                <Field label="Surface style">
                  <Select value={appearance.cardStyle} onChange={(e) => update({ cardStyle: e.target.value as AppearanceSettings["cardStyle"] })}>
                    <option value="flat">Flat</option>
                    <option value="outlined">Outlined</option>
                    <option value="elevated">Elevated</option>
                  </Select>
                </Field>
                <Field label="Photo aspect">
                  <Select value={appearance.imageAspect ?? "wide"} onChange={(e) => update({ imageAspect: e.target.value as AppearanceSettings["imageAspect"] })}>
                    <option value="wide">Wide</option>
                    <option value="square">Square</option>
                    <option value="tall">Tall</option>
                    <option value="auto">Auto</option>
                  </Select>
                </Field>
                <Field label="Price style">
                  <Select value={appearance.priceStyle ?? "plain"} onChange={(e) => update({ priceStyle: e.target.value as AppearanceSettings["priceStyle"] })}>
                    <option value="plain">Plain</option>
                    <option value="badge">Badge chip</option>
                    <option value="large">Large bold</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Category nav style">
                  <Select value={appearance.categoryNavStyle ?? "pills"} onChange={(e) => update({ categoryNavStyle: e.target.value as AppearanceSettings["categoryNavStyle"] })}>
                    <option value="pills">Pill tabs</option>
                    <option value="underline">Underline tabs</option>
                    <option value="cards">Category cards</option>
                    <option value="segmented">Segmented control</option>
                    <option value="minimal">Minimal text</option>
                    <option value="iconOnly">Icon only</option>
                    <option value="bubble">Bubble chips</option>
                  </Select>
                </Field>
                <Field label="Section header style">
                  <Select value={appearance.sectionHeaderStyle ?? "plain"} onChange={(e) => update({ sectionHeaderStyle: e.target.value as AppearanceSettings["sectionHeaderStyle"] })}>
                    <option value="plain">Plain</option>
                    <option value="divider">Centered with dividers</option>
                    <option value="banner">Filled banner</option>
                    <option value="centered">Centered</option>
                    <option value="boxed">Boxed</option>
                    <option value="accent">Accent bar</option>
                    <option value="numbered">Numbered</option>
                    <option value="overline">Overline</option>
                  </Select>
                </Field>
                <Field label="Section title case">
                  <Select value={appearance.sectionTitleCase ?? "normal"} onChange={(e) => update({ sectionTitleCase: e.target.value as AppearanceSettings["sectionTitleCase"] })}>
                    <option value="normal">Normal</option>
                    <option value="uppercase">UPPERCASE</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <span className="text-sm font-medium">Show category icons</span>
                  <Switch label="Show category icons" checked={appearance.showCategoryIcons !== false} onCheckedChange={(v) => update({ showCategoryIcons: v })} />
                </div>
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Above Categories</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Region">
                  <Select value={appearance.aboveCategory ?? "none"} onChange={(e) => update({ aboveCategory: e.target.value as AppearanceSettings["aboveCategory"] })}>
                    <option value="none">None</option>
                    <option value="cover">Cover / hero image</option>
                    <option value="promo">Promo strip</option>
                    <option value="featured">Featured categories row</option>
                  </Select>
                </Field>

                {(appearance.aboveCategory ?? "none") === "cover" ? (
                  <ImageUploadField
                    label="Cover image"
                    path={`clients/${slug}/cover`}
                    imageUrl={general.coverImageUrl}
                    onUploaded={(result) => setGeneral({ ...general, coverImageUrl: result.imageUrl, coverImagePath: result.imagePath })}
                    onRemoved={() => setGeneral({ ...general, coverImageUrl: undefined, coverImagePath: undefined })}
                  />
                ) : null}

                {(appearance.aboveCategory ?? "none") === "promo" ? (
                  <div className="grid gap-4">
                    <Field label="Strip color"><Input type="color" value={appearance.promoColor || "#0f766e"} onChange={(e) => update({ promoColor: e.target.value })} /></Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Message (English)"><Input value={general.promoText?.en || ""} onChange={(e) => setGeneral({ ...general, promoText: { ...general.promoText, en: e.target.value } })} /></Field>
                      <Field label="Message (Arabic)"><Input dir="rtl" value={general.promoText?.ar || ""} onChange={(e) => setGeneral({ ...general, promoText: { ...general.promoText, ar: e.target.value } })} /></Field>
                      <Field label="Message (Kurdish)"><Input dir="rtl" value={general.promoText?.ckb || ""} onChange={(e) => setGeneral({ ...general, promoText: { ...general.promoText, ckb: e.target.value } })} /></Field>
                    </div>
                  </div>
                ) : null}

                {(appearance.aboveCategory ?? "none") === "featured" ? (
                  <p className="text-sm text-muted-foreground">Shows a quick-jump row of this cafe&apos;s categories above the sticky bar.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className={activeDesignerTab === "menu" ? undefined : "hidden"}>
              <CardHeader><CardTitle>Background</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Background type">
                  <Select value={backgroundType} onChange={(e) => update({ backgroundType: e.target.value as AppearanceSettings["backgroundType"] })}>
                    <option value="preset">Preset (animated café)</option>
                    <option value="solid">Solid color</option>
                    <option value="gradient">Gradient</option>
                    <option value="image">Uploaded image</option>
                    <option value="pattern">Pattern design</option>
                  </Select>
                </Field>

                {(backgroundType === "solid" || backgroundType === "pattern") ? (
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
                    <Field label="Image design">
                      <Select value={appearance.backgroundImageStyle ?? "cover"} onChange={(e) => update({ backgroundImageStyle: e.target.value as AppearanceSettings["backgroundImageStyle"] })}>
                        <option value="cover">Cover full screen</option>
                        <option value="contain">Contain full image</option>
                        <option value="tile">Tile pattern</option>
                        <option value="fixed">Fixed cover</option>
                      </Select>
                    </Field>
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

                {backgroundType === "pattern" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Pattern">
                      <Select value={appearance.backgroundPattern ?? "dots"} onChange={(e) => update({ backgroundPattern: e.target.value as AppearanceSettings["backgroundPattern"] })}>
                        <option value="none">None</option>
                        <option value="cafe">Floating cafe icons</option>
                        <option value="dots">Dots</option>
                        <option value="grid">Grid</option>
                        <option value="diagonal">Diagonal lines</option>
                        <option value="waves">Waves</option>
                        <option value="checker">Checker</option>
                        <option value="confetti">Confetti</option>
                        <option value="stars">Stars</option>
                        <option value="mesh">Soft mesh</option>
                      </Select>
                    </Field>
                    <Field label="Pattern color"><Input type="color" value={appearance.backgroundPatternColor || "#3f8a49"} onChange={(e) => update({ backgroundPatternColor: e.target.value })} /></Field>
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3 md:col-span-2">
                      <span className="text-sm font-medium">Animate pattern</span>
                      <Switch label="Animate pattern" checked={appearance.backgroundPatternAnimated !== false} onCheckedChange={(v) => update({ backgroundPatternAnimated: v })} />
                    </div>
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
              <DesignPreview activeTab={activeDesignerTab} appearance={appearance} general={general} menu={menu} />
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
  if (type === "image" && appearance.backgroundImageUrl) {
    const imageStyle = appearance.backgroundImageStyle ?? "cover";
    return {
      backgroundImage: `url(${appearance.backgroundImageUrl})`,
      backgroundSize: imageStyle === "tile" ? "120px auto" : imageStyle,
      backgroundPosition: "center",
      backgroundRepeat: imageStyle === "tile" ? "repeat" : "no-repeat"
    };
  }
  if (type === "pattern") {
    return {
      backgroundColor: appearance.backgroundColor || "#ffffff",
      ...designerPatternStyle(appearance.backgroundPattern ?? "dots", appearance.backgroundPatternColor || "#3f8a49")
    };
  }
  return { backgroundImage: "linear-gradient(to bottom, #ecfdf5, #ffffff)" };
}

function formatHourLabel(hour: number) {
  if (hour === 24) return "24:00";
  return `${String(hour).padStart(2, "0")}:00`;
}

function designerPatternStyle(pattern: string, color: string): React.CSSProperties {
  const base: React.CSSProperties = { color, opacity: 0.2 };
  if (pattern === "grid") return { ...base, backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", backgroundSize: "28px 28px" };
  if (pattern === "diagonal") return { ...base, backgroundImage: "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 16px)" };
  if (pattern === "waves") return { ...base, backgroundImage: "radial-gradient(70% 60% at 50% 100%, transparent 58%, currentColor 60%, transparent 62%)", backgroundSize: "42px 24px" };
  if (pattern === "checker") return { ...base, backgroundImage: "linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%)", backgroundSize: "24px 24px" };
  if (pattern === "confetti") return { ...base, backgroundImage: "radial-gradient(circle at 20% 30%, currentColor 0 2px, transparent 2px), radial-gradient(circle at 70% 65%, currentColor 0 1.5px, transparent 1.5px)", backgroundSize: "54px 54px" };
  if (pattern === "stars") return { ...base, backgroundImage: "radial-gradient(circle at 50% 50%, currentColor 0 1.4px, transparent 1.6px), radial-gradient(circle at 15% 20%, currentColor 0 1px, transparent 1.2px)", backgroundSize: "38px 38px" };
  if (pattern === "mesh") return { ...base, opacity: 0.28, backgroundImage: "radial-gradient(circle at 20% 20%, currentColor, transparent 30%), radial-gradient(circle at 80% 30%, currentColor, transparent 28%)", backgroundSize: "260px 260px" };
  return { ...base, backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" };
}

// Lightweight sample of the menu (header + background + two cards) rendered with
// the chosen appearance so header/search/card/background changes are visible
// before saving. Uses the same MenuItemCard and theme-variable injection as the
// live menu.
function DesignPreview({
  activeTab,
  appearance,
  general,
  menu
}: {
  activeTab: DesignerTab;
  appearance: AppearanceSettings;
  general: GeneralSettings;
  menu: MenuSettings;
}) {
  const overlay = appearance.backgroundType === "image" ? Math.min(100, Math.max(0, appearance.backgroundOverlay ?? 45)) / 100 : 0;
  const cardDesign = appearance.cardDesign ?? "classic";
  const gridClass = cardDesign === "compact" ? "grid gap-3" : "grid gap-4 sm:grid-cols-2";
  const isDark = appearance.defaultTheme === "dark";
  const align = appearance.headerAlign ?? "left";
  const headerBg = appearance.headerBackgroundType ?? "theme";
  const headerStyle: React.CSSProperties | undefined =
    headerBg === "solid"
      ? { backgroundColor: appearance.headerBackgroundColor || "#ffffff" }
      : headerBg === "gradient"
        ? { backgroundImage: `linear-gradient(to bottom, ${appearance.headerGradientFrom || "#ecfdf5"}, ${appearance.headerGradientTo || "#ffffff"})` }
        : undefined;
  const searchSample = cn(
    "mt-2 flex items-center border px-3 text-xs text-muted-foreground",
    (appearance.searchSize ?? "normal") === "large" ? "h-9" : "h-8",
    (appearance.searchShape ?? "pill") === "pill" ? "rounded-full" : appearance.searchShape === "square" ? "rounded-none" : "rounded-md",
    (appearance.searchStyle ?? "outlined") === "filled" ? "border-transparent bg-muted" : "bg-background"
  );
  const name = general.restaurantName.en || "Cafe";
  const promo = general.promoText?.en;
  const locale = useMemo(() => "en" as const, []);

  if (activeTab === "welcome") {
    return <WelcomePreview appearance={appearance} general={general} menu={menu} />;
  }

  return (
    <div className={cn("space-y-4", isDark && "dark")}>
      <div className="relative overflow-hidden rounded-xl border" style={{ ...menuThemeStyle(appearance) }}>
        <div className="absolute inset-0" style={previewBackgroundStyle(appearance)} aria-hidden />
        {overlay ? <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} aria-hidden /> : null}
        <div className="relative">
          {/* header sample */}
          <div className={cn("border-b p-3", headerBg === "theme" && "bg-gradient-to-b from-accent/55 to-card/90")} style={headerStyle}>
            <div className={cn("flex items-center gap-2", align === "center" && "flex-col text-center")}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">{name.slice(0, 2)}</span>
              <span className="text-sm font-bold">{name}</span>
            </div>
            {(appearance.searchPlacement ?? "header") === "header" ? <div className={searchSample}>Search…</div> : null}
          </div>
          {/* promo sample */}
          {(appearance.aboveCategory ?? "none") === "promo" && promo ? (
            <div className="px-3 py-1.5 text-center text-xs font-semibold" style={{ backgroundColor: appearance.promoColor || "#0f766e", color: `hsl(${readableForegroundHslVar(appearance.promoColor || "#0f766e") || "0 0% 100%"})` }}>
              {promo}
            </div>
          ) : null}
          {/* body sample */}
          <div className="space-y-3 p-4">
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Coffee</div>
            <div className={gridClass}>
              {SAMPLE_ITEMS.map((item) => (
                <MenuItemCard key={item.id} item={item} locale={locale} settings={menu} appearance={appearance} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomePreview({ appearance, general, menu }: { appearance: AppearanceSettings; general: GeneralSettings; menu: MenuSettings }) {
  const accent = appearance.welcomeAccentColor || appearance.primaryColor || "#A4D8A6";
  const name = general.restaurantName.en || "Cafe";
  const header = general.welcomeHeader?.en || "Welcome to";
  const tagline = general.welcomeTagline?.en || "Freshly brewed, just for you";
  const pattern = appearance.welcomeBackgroundPattern ?? "cafe";
  const cardPattern = appearance.welcomeCardPattern ?? "none";
  const foreground = appearance.welcomeFormTextColor || undefined;
  const headerColor = appearance.welcomeHeaderTextColor || accent;
  const helperColor = appearance.welcomeHelperTextColor || foreground;
  const helperStyle = helperColor ? { color: helperColor } : undefined;
  const previewThemeStyle = menuThemeStyle({ ...appearance, primaryColor: accent });

  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border p-4" style={{ ...previewThemeStyle, ...welcomePreviewBackgroundStyle(appearance) }}>
      <WelcomePreviewBackgroundVideo appearance={appearance} />
      {pattern !== "none" ? <div className="absolute inset-0" style={welcomePreviewPatternStyle(pattern, appearance.welcomeBackgroundPatternColor || accent, pattern === "cafe" ? 0.14 : 0.2)} aria-hidden /> : null}
      <div
        className={cn("relative mx-auto mt-5 max-w-[260px] overflow-hidden p-5 text-center", welcomePreviewCardClass(appearance))}
        style={{
          backgroundColor: welcomePreviewFormBackgroundColor(appearance),
          borderColor: appearance.welcomeFormBorderColor || undefined,
          color: foreground,
          ...welcomePreviewBlurStyle(appearance.welcomeFormBlur)
        }}
      >
        {cardPattern !== "none" ? <div className="absolute inset-0" style={welcomePreviewPatternStyle(cardPattern, appearance.welcomeBackgroundPatternColor || accent, 0.08)} aria-hidden /> : null}
        <div className="relative space-y-3">
          {menu.enableDarkMode !== false ? <div className="absolute right-0 top-0 h-8 w-8 rounded-full border bg-background/80" /> : null}
          <p className={cn("text-sm font-bold", menu.enableDarkMode !== false && "pr-10")} style={{ color: headerColor }}>{header}</p>
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 ring-4 ring-white/60" style={welcomePreviewLogoStyle(appearance)} />
          <h3 className="text-xl font-bold" style={{ color: foreground }}>{name}</h3>
          <p className="text-xs text-muted-foreground" style={helperStyle}>{tagline}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" style={helperStyle}>Choose your language</p>
          <div className={cn("mx-auto flex justify-center gap-1.5", (appearance.welcomeLanguageStyle ?? "buttons") === "cards" && "grid w-full grid-cols-3")}>
            {["کوردی", "العربية", "EN"].map((label, index) => (
              <span
                key={label}
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] font-semibold",
                  index === 0 ? "bg-primary text-primary-foreground" : "bg-background/70 text-muted-foreground",
                  (appearance.welcomeLanguageStyle ?? "buttons") === "cards" && "rounded-lg py-2"
                )}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="h-9 rounded-full bg-primary" />
          <p className="text-[10px] font-medium text-muted-foreground" style={helperStyle}>Find us on social media</p>
        </div>
      </div>
    </div>
  );
}

function welcomePreviewLogoStyle(appearance: AppearanceSettings): React.CSSProperties {
  const style = appearance.welcomeLogoStyle ?? "circle";
  if (style === "square") return { borderRadius: "0.5rem" };
  if (style === "rounded") return { borderRadius: "1rem" };
  return { borderRadius: "9999px" };
}

function welcomePreviewBackgroundStyle(appearance: AppearanceSettings): React.CSSProperties {
  const style = appearance.welcomeBackgroundStyle ?? "gradient";
  const overlay = Math.min(100, Math.max(0, appearance.welcomeBackgroundOverlay ?? 15)) / 100;
  if (style === "image" && appearance.welcomeBackgroundImageUrl && !isWelcomePreviewBackgroundVideo(appearance)) {
    return {
      backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8",
      backgroundImage: `linear-gradient(rgba(0, 0, 0, ${overlay}), rgba(0, 0, 0, ${overlay})), url(${appearance.welcomeBackgroundImageUrl})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover"
    };
  }
  if (style === "image") return { backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8" };
  if (style === "solid" || style === "pattern") return { backgroundColor: appearance.welcomeBackgroundColor || "#d7efd8" };
  return {
    backgroundImage: `linear-gradient(135deg, ${appearance.welcomeBackgroundGradientFrom || "#d7efd8"}, ${appearance.welcomeAccentColor || "#A4D8A6"}, ${appearance.welcomeBackgroundGradientTo || "#86cc8a"})`
  };
}

function WelcomePreviewBackgroundVideo({ appearance }: { appearance: AppearanceSettings }) {
  if (!isWelcomePreviewBackgroundVideo(appearance)) return null;
  return (
    <>
      <video
        src={appearance.welcomeBackgroundImageUrl}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: Math.min(100, Math.max(0, appearance.welcomeBackgroundOverlay ?? 15)) / 100 }} aria-hidden />
    </>
  );
}

function isWelcomePreviewBackgroundVideo(appearance: AppearanceSettings) {
  const url = appearance.welcomeBackgroundImageUrl;
  if (!url || (appearance.welcomeBackgroundStyle ?? "gradient") !== "image") return false;
  return appearance.welcomeBackgroundMediaType === "video" || /\.(mp4|webm)(\?.*)?$/i.test(url);
}

function welcomePreviewCardClass(appearance: AppearanceSettings) {
  const style = appearance.welcomeCardStyle ?? "glass";
  if (style === "solid") return "rounded-2xl border bg-card shadow-xl";
  if (style === "outlined") return "rounded-2xl border-2 border-primary/35 bg-background/80 shadow-xl backdrop-blur";
  if (style === "floating") return "rounded-[2rem] border bg-card shadow-2xl shadow-primary/20";
  return "rounded-3xl border border-primary/35 bg-card/85 shadow-2xl backdrop-blur-xl";
}

function welcomePreviewBlurStyle(value: number | undefined): React.CSSProperties {
  if (typeof value !== "number" || Number.isNaN(value)) return {};
  const blur = Math.min(40, Math.max(0, value));
  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`
  };
}

function welcomePreviewFormBackgroundColor(appearance: AppearanceSettings) {
  const transparency = normalizeWelcomePreviewTransparency(appearance.welcomeFormTransparency);
  if (transparency === undefined) return appearance.welcomeFormColor || undefined;
  const alpha = 1 - transparency / 100;
  if (!appearance.welcomeFormColor) return `hsl(var(--card) / ${alpha.toFixed(2)})`;
  return hexToRgba(appearance.welcomeFormColor, alpha) || appearance.welcomeFormColor;
}

function normalizeWelcomePreviewTransparency(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, value));
}

function welcomePreviewPatternStyle(pattern: string, color: string, opacity: number): React.CSSProperties {
  const base: React.CSSProperties = { color, opacity };
  if (pattern === "cafe") {
    return {
      ...base,
      backgroundImage: "radial-gradient(currentColor 2px, transparent 2px), radial-gradient(currentColor 1.5px, transparent 1.5px)",
      backgroundPosition: "0 0, 24px 24px",
      backgroundSize: "48px 48px"
    };
  }
  if (pattern === "dots") return { ...base, backgroundImage: "radial-gradient(currentColor 1.4px, transparent 1.4px)", backgroundSize: "18px 18px" };
  if (pattern === "grid") return { ...base, backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)", backgroundSize: "28px 28px" };
  if (pattern === "diagonal") return { ...base, backgroundImage: "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 16px)" };
  return { ...base, backgroundImage: "radial-gradient(70% 60% at 50% 100%, transparent 58%, currentColor 60%, transparent 62%)", backgroundSize: "42px 24px" };
}
