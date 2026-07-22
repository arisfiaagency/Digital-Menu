"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Plus,
  Save,
  Search,
  Trash2,
  Unlock,
  UtensilsCrossed
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  accessExpiryLabel,
  daysUntilExpiry,
  extendSubscriptionExpiry,
  formatExpiryDate,
  formatMoney,
  getAccessExpiryState,
  getServiceExpiresAt,
  isClientServiceActive
} from "@/lib/client-access";
import { clientAdminPath, normalizeClientSlug } from "@/lib/tenant";
import { cn } from "@/lib/utils/cn";
import type {
  ClientAccount,
  ClientBilling,
  ClientStatus,
  ClientSubscription,
  ClientSubscriptionPlan,
  ClientSubscriptionStatus,
  ClientTrial,
  Currency,
  Locale,
  MenuDesign
} from "@/types/models";

const currencies: Currency[] = ["IQD", "USD", "EUR", "TRY"];
const languages: Locale[] = ["ckb", "en", "ar"];

// The four customer-menu designs a cafe can be created with. Chosen once, then
// locked — there is no tenant-side control to change it later (the design lives
// on the client account doc, which only the platform admin can write).
const DESIGN_OPTIONS: { id: MenuDesign; name: string; blurb: string }[] = [
  { id: "classic", name: "Classic", blurb: "Printed-menu look, warm serif, dotted price leaders" },
  { id: "modern", name: "Modern", blurb: "Photo card grid, bold sans, sticky category bar" },
  { id: "luxury", name: "Luxury", blurb: "Editorial hero, serif display, floating cart" },
  { id: "minimal", name: "Minimal", blurb: "Stark, whitespace, monochrome + accent" },
  { id: "neon", name: "Neon Night", blurb: "Dark, high-contrast, glowing accent, big prices" },
  { id: "gallery", name: "Photo Gallery", blurb: "Full-bleed square photo tiles with text overlay" },
  { id: "chalkboard", name: "Chalkboard", blurb: "Slate board, chalk lettering, hand-drawn rules" },
  { id: "tabs", name: "App Tabs", blurb: "One category at a time via tabs — great for big menus" },
  { id: "retro", name: "Retro Diner", blurb: "Cream + red, checkerboard trim, bold condensed caps" },
  { id: "pastel", name: "Playful Pastel", blurb: "Soft gradients, rounded bubble cards, cheerful" },
  { id: "kraft", name: "Kraft Bakery", blurb: "Warm kraft paper, stamp badges, earthy serif" },
  { id: "bento", name: "Bento Mosaic", blurb: "Masonry tiles — featured items grow bigger" },
  { id: "elegant", name: "Fine Dining", blurb: "Ivory, airy, small-caps, tasting-menu calm" },
  { id: "magazine", name: "Magazine", blurb: "Masthead + multi-column flowing layout" },
  { id: "brutalist", name: "Brutalist", blurb: "Mono, thick borders, hard shadows, huge type" },
  { id: "zen", name: "Japanese Zen", blurb: "Muted, hairlines, vertical accent, spacious" }
];
const DEFAULT_ACCENT = "#2F7D4F";
const plans: ClientSubscriptionPlan[] = ["free", "basic", "pro", "custom"];
const subStatuses: ClientSubscriptionStatus[] = ["trialing", "active", "past_due", "canceled", "none"];

type ClientFilter = "all" | "online" | "near" | "expired" | "blocked" | "owed";

function defaultTrial(days = 14): ClientTrial {
  const start = new Date();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString(), days };
}

function defaultSubscription(currency: Currency, price = 0): ClientSubscription {
  return {
    plan: "basic",
    price,
    currency,
    status: "trialing",
    period: "monthly"
  };
}

function defaultBilling(currency: Currency, owed = 0): ClientBilling {
  return { amountPaid: 0, amountOwed: owed, currency };
}

function statusTone(client: ClientAccount) {
  if (client.blocked) return "blocked";
  return getAccessExpiryState(client);
}

export function ClientsPanel({
  clients,
  loading,
  saving,
  deletingSlug,
  updatingSlug,
  onCreate,
  onBlock,
  onDelete,
  onSaveBilling,
  onRecordPayment
}: {
  clients: ClientAccount[];
  loading: boolean;
  saving: boolean;
  deletingSlug: string | null;
  updatingSlug: string | null;
  onCreate: (input: {
    name: string;
    slug: string;
    ownerEmail: string;
    status: ClientStatus;
    defaultCurrency: Currency;
    defaultLanguage: Locale;
    menuDesign: MenuDesign;
    menuAccent: string;
    trialDays: number;
    planPrice: number;
  }) => Promise<void>;
  onBlock: (client: ClientAccount) => void;
  onDelete: (client: ClientAccount) => void;
  onSaveBilling: (
    client: ClientAccount,
    next: {
      subscription: ClientSubscription;
      trial: ClientTrial;
      billing: ClientBilling;
      blockedReason?: string;
    }
  ) => void;
  onRecordPayment: (client: ClientAccount, amount: number, months: number) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("IQD");
  const [defaultLanguage, setDefaultLanguage] = useState<Locale>("ckb");
  const [menuDesign, setMenuDesign] = useState<MenuDesign>("classic");
  const [menuAccent, setMenuAccent] = useState(DEFAULT_ACCENT);
  const [trialDays, setTrialDays] = useState(14);
  const [planPrice, setPlanPrice] = useState(0);

  const resolvedSlug = useMemo(() => normalizeClientSlug(slug || name), [name, slug]);

  const counts = useMemo(() => {
    let online = 0;
    let near = 0;
    let expired = 0;
    let blocked = 0;
    let owed = 0;
    for (const client of clients) {
      if (client.blocked) blocked += 1;
      else if (isClientServiceActive(client)) online += 1;
      const expiry = getAccessExpiryState(client);
      if (!client.blocked && expiry === "near_expiry") near += 1;
      if (!client.blocked && expiry === "expired") expired += 1;
      if ((client.billing?.amountOwed || 0) > 0) owed += 1;
    }
    return { total: clients.length, online, near, expired, blocked, owed };
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((client) => {
        if (q) {
          const hay = `${client.name} ${client.slug} ${client.ownerEmail || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        const expiry = getAccessExpiryState(client);
        switch (filter) {
          case "online":
            return !client.blocked && isClientServiceActive(client);
          case "near":
            return !client.blocked && expiry === "near_expiry";
          case "expired":
            return !client.blocked && expiry === "expired";
          case "blocked":
            return Boolean(client.blocked);
          case "owed":
            return (client.billing?.amountOwed || 0) > 0;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const rank = (client: ClientAccount) => {
          if (client.blocked) return 0;
          const expiry = getAccessExpiryState(client);
          if (expiry === "expired") return 1;
          if (expiry === "near_expiry") return 2;
          return 3;
        };
        const diff = rank(a) - rank(b);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [clients, query, filter]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      name,
      slug: resolvedSlug,
      ownerEmail,
      status,
      defaultCurrency,
      defaultLanguage,
      menuDesign,
      menuAccent,
      trialDays,
      planPrice
    });
    setName("");
    setSlug("");
    setOwnerEmail("");
    setStatus("active");
    setDefaultCurrency("IQD");
    setDefaultLanguage("ckb");
    setMenuDesign("classic");
    setMenuAccent(DEFAULT_ACCENT);
    setTrialDays(14);
    setPlanPrice(0);
    setShowCreate(false);
  }

  const filterChips: { id: ClientFilter; label: string; count: number; tone?: string }[] = [
    { id: "all", label: "All", count: counts.total },
    { id: "online", label: "Online", count: counts.online, tone: "text-emerald-700 dark:text-emerald-400" },
    { id: "near", label: "Near expiry", count: counts.near, tone: "text-amber-800 dark:text-amber-300" },
    { id: "expired", label: "Expired", count: counts.expired, tone: "text-destructive" },
    { id: "blocked", label: "Blocked", count: counts.blocked, tone: "text-destructive" },
    { id: "owed", label: "Owes money", count: counts.owed }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage cafes, renew monthly access, and block unpaid accounts yourself.
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate((open) => !open)}>
          <Plus className="h-4 w-4" aria-hidden />
          {showCreate ? "Close form" : "Add cafe"}
        </Button>
      </div>

      {showCreate ? (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Add a new cafe</CardTitle>
            <p className="text-sm text-muted-foreground">
              Creates cafe access and starts a free trial. You can renew or block later from the list.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => void handleCreate(e)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cafe name" htmlFor="client-name">
                  <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mihrako Cafe" required />
                </Field>
                <Field label="URL slug" htmlFor="client-slug">
                  <Input id="client-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={resolvedSlug || "mihrako"} />
                </Field>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">Admin link that will be created</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Cafe admin → <span className="font-medium text-foreground">/{resolvedSlug || "cafe"}/admin</span></li>
                  <li>Public site → <span className="font-medium text-foreground">/{resolvedSlug || "cafe"}</span> (welcome → menu)</li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium">Menu design</p>
                <p className="text-xs text-muted-foreground">
                  Chosen now and locked — the cafe can edit its items but not switch design later.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {DESIGN_OPTIONS.map((option) => {
                    const active = menuDesign === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMenuDesign(option.id)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-xl border p-3 text-start transition-colors",
                          active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full ring-1 ring-black/10"
                            style={{ backgroundColor: menuAccent }}
                            aria-hidden
                          />
                          <span className="text-sm font-semibold">{option.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{option.blurb}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label htmlFor="client-accent" className="text-sm font-medium">Accent color</label>
                  <input
                    id="client-accent"
                    type="color"
                    value={menuAccent}
                    onChange={(e) => setMenuAccent(e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded-md border bg-background p-1"
                  />
                  <span className="text-xs text-muted-foreground">Tints the chosen design ({menuAccent}).</span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Owner email" htmlFor="client-owner">
                  <Input id="client-owner" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@example.com" />
                </Field>
                <Field label="Currency" htmlFor="client-currency">
                  <Select id="client-currency" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value as Currency)}>
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Free trial days" htmlFor="client-trial">
                  <Input id="client-trial" type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value) || 0)} />
                </Field>
                <Field label="Monthly price" htmlFor="client-price">
                  <Input id="client-price" type="number" min={0} value={planPrice} onChange={(e) => setPlanPrice(Number(e.target.value) || 0)} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Language" htmlFor="client-language">
                  <Select id="client-language" value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value as Locale)}>
                    {languages.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Account status" htmlFor="client-status">
                  <Select id="client-status" value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </Select>
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating…" : "Create cafe"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryStat label="Total cafes" value={counts.total} />
        <SummaryStat label="Online" value={counts.online} hint="Not blocked" className="text-emerald-700 dark:text-emerald-400" />
        <SummaryStat label="Near expiry" value={counts.near} hint="≤ 5 days left" className="text-amber-800 dark:text-amber-300" />
        <SummaryStat label="Expired" value={counts.expired} hint="Still online until you block" className="text-destructive" />
        <SummaryStat label="Blocked" value={counts.blocked} hint="Admin access disabled" className="text-destructive" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                className="ps-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, slug, or email…"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    filter === chip.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/60",
                    filter !== chip.id && chip.tone
                  )}
                >
                  {chip.label} ({chip.count})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="space-y-3">
              {filtered.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  expanded={expandedSlug === client.slug}
                  onToggleExpand={() => setExpandedSlug((s) => (s === client.slug ? null : client.slug))}
                  deleting={deletingSlug === client.slug}
                  updating={updatingSlug === client.slug}
                  onBlock={() => onBlock(client)}
                  onDelete={() => onDelete(client)}
                  onSaveBilling={(next) => onSaveBilling(client, next)}
                  onRecordPayment={(amount, months) => onRecordPayment(client, amount, months)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {clients.length ? "No cafes match this search or filter." : "No cafes yet. Click “Add cafe” to create the first one."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  className
}: {
  label: string;
  value: number;
  hint?: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold", className)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function ClientCard({
  client,
  expanded,
  onToggleExpand,
  deleting,
  updating,
  onBlock,
  onDelete,
  onSaveBilling,
  onRecordPayment
}: {
  client: ClientAccount;
  expanded: boolean;
  onToggleExpand: () => void;
  deleting: boolean;
  updating: boolean;
  onBlock: () => void;
  onDelete: () => void;
  onSaveBilling: (next: {
    subscription: ClientSubscription;
    trial: ClientTrial;
    billing: ClientBilling;
    blockedReason?: string;
  }) => void;
  onRecordPayment: (amount: number, months: number) => void;
}) {
  const currency = client.billing?.currency || client.subscription?.currency || client.defaultCurrency || "IQD";
  const tone = statusTone(client);
  const expiresAt = getServiceExpiresAt(client);
  const daysLeft = daysUntilExpiry(expiresAt);
  const monthlyPrice = client.subscription?.price ?? 0;
  const owed = client.billing?.amountOwed ?? 0;
  const paid = client.billing?.amountPaid ?? 0;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [plan, setPlan] = useState<ClientSubscriptionPlan>(client.subscription?.plan || "basic");
  const [subStatus, setSubStatus] = useState<ClientSubscriptionStatus>(client.subscription?.status || "trialing");
  const [period, setPeriod] = useState<"monthly" | "yearly">(client.subscription?.period || "monthly");
  const [price, setPrice] = useState(monthlyPrice);
  const [paidAmount, setPaidAmount] = useState(paid);
  const [owedAmount, setOwedAmount] = useState(owed);
  const [billCurrency, setBillCurrency] = useState<Currency>(currency);
  const [trialDayCount, setTrialDayCount] = useState(client.trial?.days ?? 14);
  const [trialEnd, setTrialEnd] = useState(client.trial?.endAt?.slice(0, 10) || "");
  const [expiresDate, setExpiresDate] = useState(client.subscription?.expiresAt?.slice(0, 10) || "");
  const [reason, setReason] = useState(client.blockedReason || "");
  const [paymentAmount, setPaymentAmount] = useState(monthlyPrice || 0);
  const [paymentMonths, setPaymentMonths] = useState(1);

  useEffect(() => {
    setPlan(client.subscription?.plan || "basic");
    setSubStatus(client.subscription?.status || "trialing");
    setPeriod(client.subscription?.period || "monthly");
    setPrice(client.subscription?.price ?? 0);
    setPaidAmount(client.billing?.amountPaid ?? 0);
    setOwedAmount(client.billing?.amountOwed ?? 0);
    setBillCurrency(client.billing?.currency || client.subscription?.currency || client.defaultCurrency || "IQD");
    setTrialDayCount(client.trial?.days ?? 14);
    setTrialEnd(client.trial?.endAt?.slice(0, 10) || "");
    setExpiresDate(client.subscription?.expiresAt?.slice(0, 10) || "");
    setReason(client.blockedReason || "");
    setPaymentAmount(client.subscription?.price ?? 0);
    setPaymentMonths(1);
  }, [client]);

  const previewExpiry = useMemo(
    () => formatExpiryDate(extendSubscriptionExpiry(client.subscription?.expiresAt || client.trial?.endAt, paymentMonths)),
    [client.subscription?.expiresAt, client.trial?.endAt, paymentMonths]
  );

  function submitBilling() {
    const endIso = trialEnd
      ? new Date(`${trialEnd}T23:59:59.000Z`).toISOString()
      : defaultTrial(trialDayCount).endAt;
    const startIso = client.trial?.startAt || new Date().toISOString();
    const subscriptionExpiresAt = expiresDate
      ? new Date(`${expiresDate}T23:59:59.000Z`).toISOString()
      : client.subscription?.expiresAt;
    onSaveBilling({
      subscription: {
        plan,
        price: Math.max(0, price),
        currency: billCurrency,
        status: subStatus,
        period,
        expiresAt: subscriptionExpiresAt
      },
      trial: {
        startAt: startIso,
        endAt: endIso,
        days: trialDayCount
      },
      billing: {
        amountPaid: Math.max(0, paidAmount),
        amountOwed: Math.max(0, owedAmount),
        currency: billCurrency
      },
      blockedReason: reason
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        tone === "blocked" || tone === "expired"
          ? "border-destructive/35"
          : tone === "near_expiry"
            ? "border-amber-500/40"
            : "border-border"
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold tracking-tight">{client.name}</h3>
              <StatusBadge client={client} />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">/{client.slug}</span>
              {client.ownerEmail ? ` · ${client.ownerEmail}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={clientAdminPath(client.slug)}>
                <ExternalLink className="h-4 w-4" aria-hidden />
                Admin
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/${client.slug}`} target="_blank" rel="noopener noreferrer">
                <UtensilsCrossed className="h-4 w-4" aria-hidden />
                Menu
              </a>
            </Button>
            <Button
              type="button"
              variant={client.blocked ? "default" : "destructive"}
              size="sm"
              disabled={updating}
              onClick={onBlock}
            >
              {client.blocked ? <Unlock className="h-4 w-4" aria-hidden /> : <Ban className="h-4 w-4" aria-hidden />}
              {client.blocked ? "Unblock" : "Block"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onToggleExpand}>
              <CalendarClock className="h-4 w-4" aria-hidden />
              {expanded ? "Close" : "Renew / billing"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Fact
            label="Access until"
            value={expiresAt ? formatExpiryDate(expiresAt) : "Not set"}
            hint={
              daysLeft === null
                ? "Set an expiry or record a payment"
                : daysLeft < 0
                  ? "Expired — still online until you block"
                  : daysLeft <= 5
                    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · renew soon`
                    : `${daysLeft} days left`
            }
            warn={tone === "near_expiry" || tone === "expired"}
          />
          <Fact
            label="Monthly price"
            value={formatMoney(monthlyPrice, currency)}
            hint={`${client.subscription?.plan || "basic"} · ${client.subscription?.period || "monthly"}`}
          />
          <Fact
            label="Money"
            value={`Owed ${formatMoney(owed, currency)}`}
            hint={`Collected ${formatMoney(paid, currency)}`}
            warn={owed > 0}
          />
        </div>

        {tone === "near_expiry" ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Near expiry. Record a payment to add months, or Block manually if they did not pay.
          </p>
        ) : null}
        {tone === "expired" ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Subscription expired. Cafe stays online until you press Block.
          </p>
        ) : null}
        {client.blocked ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Blocked{client.blockedReason ? ` — ${client.blockedReason}` : ""}. Cafe admin access is offline.
          </p>
        ) : null}
      </div>

      {expanded ? (
        <div className="space-y-4 border-t bg-muted/20 p-4 sm:p-5">
          <div className="rounded-2xl border bg-background p-4">
            <div className="mb-3">
              <p className="font-medium">Renew access</p>
              <p className="text-sm text-muted-foreground">
                Most common action: take payment and add months to the expiry date.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
              <Field label="Amount received">
                <Input
                  type="number"
                  min={0}
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  placeholder={String(monthlyPrice || 0)}
                />
              </Field>
              <Field label="Months">
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={paymentMonths}
                  onChange={(e) => setPaymentMonths(Math.max(1, Number(e.target.value) || 1))}
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full"
                  disabled={updating || !paymentAmount}
                  onClick={() => onRecordPayment(paymentAmount, paymentMonths)}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Renew +{paymentMonths} mo
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              New access end date will be <span className="font-medium text-foreground">{previewExpiry}</span>
              {expiresAt ? ` (now ${formatExpiryDate(expiresAt)})` : ""}.
            </p>
          </div>

          <div className="rounded-2xl border bg-background">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-start"
              onClick={() => setShowAdvanced((open) => !open)}
            >
              <div>
                <p className="font-medium">Advanced billing details</p>
                <p className="text-sm text-muted-foreground">Edit plan, prices, trial, and manual expiry.</p>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showAdvanced && "rotate-180")} aria-hidden />
            </button>
            {showAdvanced ? (
              <div className="space-y-4 border-t px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Plan">
                    <Select value={plan} onChange={(e) => setPlan(e.target.value as ClientSubscriptionPlan)}>
                      {plans.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Status label">
                    <Select value={subStatus} onChange={(e) => setSubStatus(e.target.value as ClientSubscriptionStatus)}>
                      {subStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Period">
                    <Select value={period} onChange={(e) => setPeriod(e.target.value as "monthly" | "yearly")}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </Select>
                  </Field>
                  <Field label="Monthly price">
                    <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Access expires">
                    <Input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)} />
                  </Field>
                  <Field label="Amount paid (total)">
                    <Input type="number" min={0} value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Amount owed">
                    <Input type="number" min={0} value={owedAmount} onChange={(e) => setOwedAmount(Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Currency">
                    <Select value={billCurrency} onChange={(e) => setBillCurrency(e.target.value as Currency)}>
                      {currencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Trial ends">
                    <Input type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} />
                  </Field>
                  <Field label="Trial days">
                    <Input type="number" min={0} value={trialDayCount} onChange={(e) => setTrialDayCount(Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Block reason">
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Payment overdue" />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={updating} onClick={submitBilling}>
                    <Save className="h-4 w-4" aria-hidden />
                    Save details
                  </Button>
                  <Button type="button" variant="destructive" disabled={deleting} onClick={onDelete}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    {deleting ? "Deleting…" : "Delete cafe"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function StatusBadge({ client }: { client: ClientAccount }) {
  if (client.blocked) {
    return <Badge className="border-destructive/40 bg-destructive/10 text-destructive">Blocked · offline</Badge>;
  }
  const expiry = getAccessExpiryState(client);
  if (expiry === "near_expiry") {
    return <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">{accessExpiryLabel(client)}</Badge>;
  }
  if (expiry === "expired") {
    return <Badge className="border-destructive/40 bg-destructive/10 text-destructive">Expired · still online</Badge>;
  }
  if (!isClientServiceActive(client)) {
    return <Badge className="border-destructive/40 bg-destructive/10 text-destructive">Offline</Badge>;
  }
  return <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">Online · {accessExpiryLabel(client)}</Badge>;
}

function Fact({
  label,
  value,
  hint,
  warn
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", warn ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/30")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export { defaultTrial, defaultSubscription, defaultBilling };
