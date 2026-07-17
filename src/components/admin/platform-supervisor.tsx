"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Unlock
} from "lucide-react";
import { AdminPreferences, useAdminLocale } from "@/components/admin/admin-preferences";
import { MenuDesigner } from "@/components/admin/menu-designer";
import { QrDesigner } from "@/components/qr/qr-designer";
import { TenantProvider } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { formatMoney, isClientServiceActive, trialDaysRemaining } from "@/lib/client-access";
import { hasFirebaseClientConfig } from "@/lib/firebase/client";
import { deleteClient, listClients, patchClient, saveClient } from "@/lib/firebase/firestore";
import { logoutAdmin } from "@/lib/firebase/auth";
import { clientAdminPath, clientMenuPath, clientPublicPath, normalizeClientSlug } from "@/lib/tenant";
import type {
  ClientAccount,
  ClientBilling,
  ClientStatus,
  ClientSubscription,
  ClientSubscriptionPlan,
  ClientSubscriptionStatus,
  ClientTrial,
  Currency,
  Locale
} from "@/types/models";

const currencies: Currency[] = ["IQD", "USD", "EUR", "TRY"];
const languages: Locale[] = ["ckb", "en", "ar"];
const plans: ClientSubscriptionPlan[] = ["free", "basic", "pro", "custom"];
const subStatuses: ClientSubscriptionStatus[] = ["trialing", "active", "past_due", "canceled", "none"];

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

type SupervisorTab = "clients" | "design" | "qr";

export function PlatformSupervisor({ initialTab = "clients" }: { initialTab?: SupervisorTab }) {
  const auth = useAdminAuth();
  const { text, dir: textDir } = useAdminLocale();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("IQD");
  const [defaultLanguage, setDefaultLanguage] = useState<Locale>("ckb");
  const [trialDays, setTrialDays] = useState(14);
  const [planPrice, setPlanPrice] = useState(0);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<SupervisorTab>(initialTab);
  const [qrSlug, setQrSlug] = useState("");

  const resolvedSlug = useMemo(() => normalizeClientSlug(slug || name), [name, slug]);

  async function refresh() {
    setLoadingClients(true);
    try {
      const list = await listClients();
      setClients(list);
      if (!qrSlug && list[0]) setQrSlug(list[0].slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load clients.");
    } finally {
      setLoadingClients(false);
    }
  }

  useEffect(() => {
    if (auth.isAdmin) void refresh();
  }, [auth.isAdmin]);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!name.trim() || !resolvedSlug) {
      setError("Client name and slug are required.");
      return;
    }
    setSaving(true);
    try {
      const trial = defaultTrial(Math.max(0, trialDays || 0));
      const subscription = defaultSubscription(defaultCurrency, Math.max(0, planPrice || 0));
      const billing = defaultBilling(defaultCurrency, Math.max(0, planPrice || 0));
      await saveClient({
        name,
        slug: resolvedSlug,
        ownerEmail,
        status,
        defaultCurrency,
        defaultLanguage,
        blocked: false,
        subscription,
        trial,
        billing
      });
      setName("");
      setSlug("");
      setOwnerEmail("");
      setStatus("active");
      setDefaultCurrency("IQD");
      setDefaultLanguage("ckb");
      setTrialDays(14);
      setPlanPrice(0);
      setMessage(`Client /${resolvedSlug} is ready with a ${trial.days}-day free trial.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client.");
    } finally {
      setSaving(false);
    }
  }

  async function removeClient(client: ClientAccount) {
    const confirmed = window.confirm(
      `Delete client "/${client.slug}" and ALL of its data?\n\nThis permanently removes menu items, categories, settings, staff accounts, POS/orders, and expenses for this cafe. This cannot be undone.`
    );
    if (!confirmed) return;
    const typed = window.prompt(`Type the slug "${client.slug}" to confirm deletion:`);
    if (typed !== client.slug) {
      setError("Deletion cancelled — slug did not match.");
      return;
    }
    setMessage("");
    setError("");
    setDeletingSlug(client.slug);
    try {
      await deleteClient(client.slug);
      setMessage(`Deleted /${client.slug} and all of its data.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete client.");
    } finally {
      setDeletingSlug(null);
    }
  }

  async function toggleBlock(client: ClientAccount) {
    setUpdatingSlug(client.slug);
    setMessage("");
    setError("");
    const nextBlocked = !client.blocked;
    try {
      await patchClient(client.slug, {
        blocked: nextBlocked,
        blockedReason: nextBlocked ? client.blockedReason || "Payment overdue" : "",
        blockedAt: nextBlocked ? new Date().toISOString() : ""
      });
      setMessage(nextBlocked ? `Blocked /${client.slug}.` : `Unblocked /${client.slug}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update block status.");
    } finally {
      setUpdatingSlug(null);
    }
  }

  async function saveBilling(client: ClientAccount, next: {
    subscription: ClientSubscription;
    trial: ClientTrial;
    billing: ClientBilling;
    blockedReason?: string;
  }) {
    setUpdatingSlug(client.slug);
    setMessage("");
    setError("");
    try {
      await patchClient(client.slug, {
        subscription: next.subscription,
        trial: next.trial,
        billing: next.billing,
        blockedReason: next.blockedReason
      });
      setMessage(`Updated subscription for /${client.slug}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subscription.");
    } finally {
      setUpdatingSlug(null);
    }
  }

  async function recordPayment(client: ClientAccount, amount: number) {
    if (!amount || amount <= 0) return;
    const currency = client.billing?.currency || client.subscription?.currency || client.defaultCurrency || "IQD";
    const paid = (client.billing?.amountPaid || 0) + amount;
    const owed = Math.max(0, (client.billing?.amountOwed || 0) - amount);
    setUpdatingSlug(client.slug);
    setError("");
    try {
      await patchClient(client.slug, {
        billing: { amountPaid: paid, amountOwed: owed, currency },
        subscription: {
          plan: client.subscription?.plan || "basic",
          price: client.subscription?.price || 0,
          currency,
          status: owed === 0 ? "active" : client.subscription?.status || "past_due",
          period: client.subscription?.period || "monthly",
          note: client.subscription?.note
        },
        blocked: owed === 0 ? false : client.blocked,
        blockedReason: owed === 0 ? "" : client.blockedReason,
        blockedAt: owed === 0 ? "" : client.blockedAt
      });
      setMessage(`Recorded ${formatMoney(amount, currency)} for /${client.slug}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      setUpdatingSlug(null);
    }
  }

  async function signOut() {
    await logoutAdmin();
    window.location.href = "/admin/login";
  }

  if (!hasFirebaseClientConfig()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-xl">
          <CardContent className="space-y-4 pt-5">
            <AdminPreferences />
            <h1 className="text-2xl font-semibold">Firebase is not configured</h1>
            <p className="text-muted-foreground">
              Add Firebase Web and Admin environment variables, then use this supervisor panel to create clients in the same project.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (auth.loading) return <SupervisorSkeleton />;

  if (!auth.user || !auth.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-5 text-center">
            <AdminPreferences />
            <ShieldCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold">Supervisor Admin</h1>
            <p className="text-muted-foreground">Sign in with a platform supervisor account to manage client menus.</p>
            <Button asChild>
              <Link href="/admin/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Digital Menu Supervisor</h1>
            <p className="text-muted-foreground">Clients, billing, menu design, and QR codes.</p>
          </div>
          <div className="flex items-center gap-2">
            <AdminPreferences />
            <Button type="button" variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
            <Button type="button" variant="destructive" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden />
              {text.logout}
            </Button>
          </div>
        </header>

        {message ? <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}
        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

        <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
          {(
            [
              ["clients", "Clients"],
              ["design", "Menu Design"],
              ["qr", "QR Codes"]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "design" ? <MenuDesigner /> : null}

        {tab === "qr" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" aria-hidden />
                Menu QR codes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Cafe" htmlFor="qr-client">
                <Select id="qr-client" value={qrSlug} onChange={(e) => setQrSlug(e.target.value)}>
                  <option value="">Select a cafe…</option>
                  {clients.map((client) => (
                    <option key={client.slug} value={client.slug}>
                      {client.name} (/{client.slug})
                    </option>
                  ))}
                </Select>
              </Field>
              {qrSlug ? (
                <TenantProvider clientSlug={qrSlug}>
                  <QrDesigner printPath="/admin/qr-code/print" />
                </TenantProvider>
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Choose a cafe to generate its menu QR code.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <section className={`grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)] ${tab === "clients" ? "" : "hidden"}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" aria-hidden />
                Create client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={createClient}>
                <Field label="Client name" htmlFor="client-name">
                  <Input id="client-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My Cafe" required />
                </Field>
                <Field label="Slug" htmlFor="client-slug">
                  <Input id="client-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder={resolvedSlug || "stone"} />
                </Field>
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  Welcome: <span className="font-medium text-foreground">/{resolvedSlug || "client"}</span>
                  <br />
                  Menu: <span className="font-medium text-foreground">/{resolvedSlug || "client"}/menu</span>
                  <br />
                  Admin: <span className="font-medium text-foreground">/{resolvedSlug || "client"}/admin</span>
                </p>
                <Field label="Owner email" htmlFor="client-owner">
                  <Input id="client-owner" type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="owner@example.com" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Status" htmlFor="client-status">
                    <Select id="client-status" value={status} onChange={(event) => setStatus(event.target.value as ClientStatus)}>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </Select>
                  </Field>
                  <Field label="Currency" htmlFor="client-currency">
                    <Select id="client-currency" value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value as Currency)}>
                      {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </Select>
                  </Field>
                  <Field label="Language" htmlFor="client-language">
                    <Select id="client-language" value={defaultLanguage} onChange={(event) => setDefaultLanguage(event.target.value as Locale)}>
                      {languages.map((language) => <option key={language} value={language}>{language}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Free trial (days)" htmlFor="client-trial">
                    <Input
                      id="client-trial"
                      type="number"
                      min={0}
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value) || 0)}
                    />
                  </Field>
                  <Field label="Plan price" htmlFor="client-price">
                    <Input
                      id="client-price"
                      type="number"
                      min={0}
                      value={planPrice}
                      onChange={(e) => setPlanPrice(Number(e.target.value) || 0)}
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create client"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingClients ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)
              ) : clients.length ? (
                clients.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    expanded={expandedSlug === client.slug}
                    onToggleExpand={() => setExpandedSlug((s) => (s === client.slug ? null : client.slug))}
                    deleting={deletingSlug === client.slug}
                    updating={updatingSlug === client.slug}
                    onBlock={() => void toggleBlock(client)}
                    onDelete={() => void removeClient(client)}
                    onSaveBilling={(next) => void saveBilling(client, next)}
                    onRecordPayment={(amount) => void recordPayment(client, amount)}
                    onOpenQr={() => {
                      setQrSlug(client.slug);
                      setTab("qr");
                    }}
                  />
                ))
              ) : (
                <p dir={textDir} className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  No clients yet.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function ClientRow({
  client,
  expanded,
  onToggleExpand,
  deleting,
  updating,
  onBlock,
  onDelete,
  onSaveBilling,
  onRecordPayment,
  onOpenQr
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
  onRecordPayment: (amount: number) => void;
  onOpenQr: () => void;
}) {
  const currency = client.billing?.currency || client.subscription?.currency || client.defaultCurrency || "IQD";
  const daysLeft = trialDaysRemaining(client);
  const live = isClientServiceActive(client);
  const [plan, setPlan] = useState<ClientSubscriptionPlan>(client.subscription?.plan || "basic");
  const [subStatus, setSubStatus] = useState<ClientSubscriptionStatus>(client.subscription?.status || "trialing");
  const [period, setPeriod] = useState<"monthly" | "yearly">(client.subscription?.period || "monthly");
  const [price, setPrice] = useState(client.subscription?.price ?? 0);
  const [paid, setPaid] = useState(client.billing?.amountPaid ?? 0);
  const [owed, setOwed] = useState(client.billing?.amountOwed ?? 0);
  const [billCurrency, setBillCurrency] = useState<Currency>(currency);
  const [trialDayCount, setTrialDayCount] = useState(client.trial?.days ?? 14);
  const [trialEnd, setTrialEnd] = useState(client.trial?.endAt?.slice(0, 10) || "");
  const [reason, setReason] = useState(client.blockedReason || "");
  const [paymentAmount, setPaymentAmount] = useState(0);

  useEffect(() => {
    setPlan(client.subscription?.plan || "basic");
    setSubStatus(client.subscription?.status || "trialing");
    setPeriod(client.subscription?.period || "monthly");
    setPrice(client.subscription?.price ?? 0);
    setPaid(client.billing?.amountPaid ?? 0);
    setOwed(client.billing?.amountOwed ?? 0);
    setBillCurrency(client.billing?.currency || client.subscription?.currency || client.defaultCurrency || "IQD");
    setTrialDayCount(client.trial?.days ?? 14);
    setTrialEnd(client.trial?.endAt?.slice(0, 10) || "");
    setReason(client.blockedReason || "");
  }, [client]);

  function submitBilling() {
    const endIso = trialEnd
      ? new Date(`${trialEnd}T23:59:59.000Z`).toISOString()
      : defaultTrial(trialDayCount).endAt;
    const startIso = client.trial?.startAt || new Date().toISOString();
    onSaveBilling({
      subscription: {
        plan,
        price: Math.max(0, price),
        currency: billCurrency,
        status: subStatus,
        period
      },
      trial: {
        startAt: startIso,
        endAt: endIso,
        days: trialDayCount
      },
      billing: {
        amountPaid: Math.max(0, paid),
        amountOwed: Math.max(0, owed),
        currency: billCurrency
      },
      blockedReason: reason
    });
  }

  return (
    <article className={`rounded-lg border p-4 ${client.blocked ? "border-destructive/40 bg-destructive/5" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{client.name}</h2>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                live ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "border-destructive/40 text-destructive"
              }`}
            >
              {client.blocked ? "Blocked" : live ? "Live" : "Offline"}
            </span>
            {client.subscription?.status ? (
              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                {client.subscription.status}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            /{client.slug} · {client.status}
            {daysLeft !== null ? ` · trial ${daysLeft > 0 ? `${daysLeft}d left` : "ended"}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Paid {formatMoney(client.billing?.amountPaid || 0, currency)} · Owed{" "}
            {formatMoney(client.billing?.amountOwed || 0, currency)}
            {client.subscription?.price != null
              ? ` · Plan ${formatMoney(client.subscription.price, client.subscription.currency || currency)}/${client.subscription.period || "month"}`
              : ""}
          </p>
          {client.ownerEmail ? <p className="text-sm text-muted-foreground">{client.ownerEmail}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={clientPublicPath(client.slug)} target="_blank">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Welcome
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={clientMenuPath(client.slug)} target="_blank">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Menu
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={clientAdminPath(client.slug)}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Admin
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onOpenQr}>
            <QrCode className="h-4 w-4" aria-hidden />
            QR
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
            {expanded ? "Hide billing" : "Billing"}
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Plan">
              <Select value={plan} onChange={(e) => setPlan(e.target.value as ClientSubscriptionPlan)}>
                {plans.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sub status">
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
            <Field label="Plan price">
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Amount paid">
              <Input type="number" min={0} value={paid} onChange={(e) => setPaid(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Amount owed">
              <Input type="number" min={0} value={owed} onChange={(e) => setOwed(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Billing currency">
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
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" disabled={updating} onClick={submitBilling}>
              {updating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ms-2">Save billing</span>
            </Button>
            <div className="flex items-end gap-2">
              <Field label="Record payment">
                <Input
                  type="number"
                  min={0}
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                disabled={updating || !paymentAmount}
                onClick={() => {
                  onRecordPayment(paymentAmount);
                  setPaymentAmount(0);
                }}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Add payment
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SupervisorSkeleton() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </main>
  );
}
