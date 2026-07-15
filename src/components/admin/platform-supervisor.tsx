"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, LogOut, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { AdminPreferences, useAdminLocale } from "@/components/admin/admin-preferences";
import { MenuDesigner } from "@/components/admin/menu-designer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { hasFirebaseClientConfig } from "@/lib/firebase/client";
import { listClients, saveClient } from "@/lib/firebase/firestore";
import { logoutAdmin } from "@/lib/firebase/auth";
import { clientAdminPath, clientMenuPath, clientPublicPath, normalizeClientSlug } from "@/lib/tenant";
import type { ClientAccount, ClientStatus, Currency, Locale } from "@/types/models";

const currencies: Currency[] = ["IQD", "USD", "EUR", "TRY"];
const languages: Locale[] = ["ckb", "en", "ar"];

export function PlatformSupervisor() {
  const auth = useAdminAuth();
  const { text, dir: textDir } = useAdminLocale();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("IQD");
  const [defaultLanguage, setDefaultLanguage] = useState<Locale>("ckb");

  const [tab, setTab] = useState<"clients" | "design">("clients");

  const resolvedSlug = useMemo(() => normalizeClientSlug(slug || name), [name, slug]);

  async function refresh() {
    setLoadingClients(true);
    try {
      setClients(await listClients());
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
      await saveClient({
        name,
        slug: resolvedSlug,
        ownerEmail,
        status,
        defaultCurrency,
        defaultLanguage
      });
      setName("");
      setSlug("");
      setOwnerEmail("");
      setStatus("active");
      setDefaultCurrency("IQD");
      setDefaultLanguage("ckb");
      setMessage(`Client /${resolvedSlug} is ready with default settings. Open /${resolvedSlug}/admin to add menu content.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client.");
    } finally {
      setSaving(false);
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
            <p className="text-muted-foreground">Create clients and manage their menu/admin URLs.</p>
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

        <div className="inline-flex gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("clients")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "clients" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Clients
          </button>
          <button
            type="button"
            onClick={() => setTab("design")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === "design" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Menu Design
          </button>
        </div>

        {tab === "design" ? <MenuDesigner /> : null}

        <section className={`grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)] ${tab === "design" ? "hidden" : ""}`}>
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
                  <article key={client.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{client.name}</h2>
                        <p className="text-sm text-muted-foreground">/{client.slug} · {client.status}</p>
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
                        <Button asChild size="sm">
                          <Link href={clientAdminPath(client.slug)}>
                            <ExternalLink className="h-4 w-4" aria-hidden />
                            Admin
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
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
