"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminPreferences, useAdminLocale } from "@/components/admin/admin-preferences";
import { ClientsPanel, defaultBilling, defaultSubscription, defaultTrial } from "@/components/admin/clients-panel";
import { MenuDesigner } from "@/components/admin/menu-designer";
import { PaymentReports } from "@/components/admin/payment-reports";
import { QrDesigner } from "@/components/qr/qr-designer";
import { TenantProvider } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { formatExpiryDate, formatMoney } from "@/lib/client-access";
import { hasFirebaseClientConfig } from "@/lib/firebase/client";
import { deleteClient, listClients, patchClient, recordClientPayment, saveClient } from "@/lib/firebase/firestore";
import { logoutAdmin } from "@/lib/firebase/auth";
import type {
  ClientAccount,
  ClientBilling,
  ClientStatus,
  ClientSubscription,
  ClientTrial,
  Currency,
  Locale
} from "@/types/models";

type SupervisorTab = "clients" | "design" | "qr" | "payments";

export function PlatformSupervisor({ initialTab = "clients" }: { initialTab?: SupervisorTab }) {
  const auth = useAdminAuth();
  const { text } = useAdminLocale();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<SupervisorTab>(initialTab);
  const [qrSlug, setQrSlug] = useState("");

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

  async function createClient(input: {
    name: string;
    slug: string;
    ownerEmail: string;
    status: ClientStatus;
    defaultCurrency: Currency;
    defaultLanguage: Locale;
    trialDays: number;
    planPrice: number;
  }) {
    setMessage("");
    setError("");
    if (!input.name.trim() || !input.slug) {
      setError("Cafe name and slug are required.");
      throw new Error("Cafe name and slug are required.");
    }
    setSaving(true);
    try {
      const trial = defaultTrial(Math.max(0, input.trialDays || 0));
      const subscription = {
        ...defaultSubscription(input.defaultCurrency, Math.max(0, input.planPrice || 0)),
        expiresAt: trial.endAt
      };
      const billing = defaultBilling(input.defaultCurrency, Math.max(0, input.planPrice || 0));
      await saveClient({
        name: input.name,
        slug: input.slug,
        ownerEmail: input.ownerEmail,
        status: input.status,
        defaultCurrency: input.defaultCurrency,
        defaultLanguage: input.defaultLanguage,
        blocked: false,
        subscription,
        trial,
        billing
      });
      setMessage(`Cafe /${input.slug} is ready with a ${trial.days}-day free trial.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function removeClient(client: ClientAccount) {
    const confirmed = window.confirm(
      `Delete cafe "/${client.slug}" and ALL of its data?\n\nThis permanently removes menu items, categories, settings, staff accounts, POS/orders, and expenses. This cannot be undone.`
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

  async function saveBilling(
    client: ClientAccount,
    next: {
      subscription: ClientSubscription;
      trial: ClientTrial;
      billing: ClientBilling;
      blockedReason?: string;
    }
  ) {
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
      setMessage(`Updated billing for /${client.slug}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subscription.");
    } finally {
      setUpdatingSlug(null);
    }
  }

  async function recordPayment(client: ClientAccount, amount: number, months = 1) {
    if (!amount || amount <= 0) return;
    const currency = client.billing?.currency || client.subscription?.currency || client.defaultCurrency || "IQD";
    setUpdatingSlug(client.slug);
    setError("");
    try {
      const payment = await recordClientPayment({
        client,
        amount,
        months,
        recordedByEmail: auth.user?.email || undefined
      });
      setMessage(
        `Recorded ${formatMoney(amount, currency)} for /${client.slug} · +${months} mo · expires ${formatExpiryDate(payment.expiresAtAfter)}.`
      );
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
              ["payments", "Payments"],
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
        {tab === "payments" ? <PaymentReports /> : null}

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

        {tab === "clients" ? (
          <ClientsPanel
            clients={clients}
            loading={loadingClients}
            saving={saving}
            deletingSlug={deletingSlug}
            updatingSlug={updatingSlug}
            onCreate={createClient}
            onBlock={(client) => void toggleBlock(client)}
            onDelete={(client) => void removeClient(client)}
            onSaveBilling={(client, next) => void saveBilling(client, next)}
            onRecordPayment={(client, amount, months) => void recordPayment(client, amount, months)}
            onOpenQr={(client) => {
              setQrSlug(client.slug);
              setTab("qr");
            }}
          />
        ) : null}
      </div>
    </main>
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
