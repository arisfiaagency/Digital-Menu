"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LogOut,
  Menu,
  ShieldCheck,
  Star,
  X,
  type LucideIcon
} from "lucide-react";
import { AdminPreferences, useAdminLocale } from "@/components/admin/admin-preferences";
import { ClientsPanel, defaultBilling, defaultSubscription, defaultTrial } from "@/components/admin/clients-panel";
import { PaymentReports } from "@/components/admin/payment-reports";
import { SupervisorDashboard } from "@/components/admin/supervisor-dashboard";
import { SupervisorRatings } from "@/components/admin/supervisor-ratings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { formatExpiryDate, formatMoney } from "@/lib/client-access";
import { hasFirebaseClientConfig } from "@/lib/firebase/client";
import { deleteClient, listClients, patchClient, recordClientPayment, saveClient } from "@/lib/firebase/firestore";
import { logoutAdmin } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils/cn";
import type {
  ClientAccount,
  ClientBilling,
  ClientStatus,
  ClientSubscription,
  ClientTrial,
  Currency,
  Locale,
  MenuDesign
} from "@/types/models";

type SupervisorTab = "dashboard" | "clients" | "payments" | "ratings";

const supervisorNav: { id: SupervisorTab; href: string; labelKey: string; icon: LucideIcon }[] = [
  { id: "dashboard", href: "/admin/dashboard", labelKey: "supervisorDashboard", icon: BarChart3 },
  { id: "clients", href: "/admin/clients", labelKey: "supervisorClients", icon: Building2 },
  { id: "payments", href: "/admin/payments", labelKey: "supervisorPayments", icon: CreditCard },
  { id: "ratings", href: "/admin/ratings", labelKey: "supervisorRatings", icon: Star }
];

function tabFromPath(pathname: string, fallback: SupervisorTab): SupervisorTab {
  if (pathname.startsWith("/admin/dashboard")) return "dashboard";
  if (pathname.startsWith("/admin/payments")) return "payments";
  if (pathname.startsWith("/admin/ratings")) return "ratings";
  if (pathname.startsWith("/admin/clients")) return "clients";
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  return fallback;
}

export function PlatformSupervisor({ initialTab = "clients" }: { initialTab?: SupervisorTab }) {
  const auth = useAdminAuth();
  const pathname = usePathname();
  const { text, dir: textDir } = useAdminLocale();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClientAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.sessionStorage.getItem("supervisor-sidebar-collapsed") === "1");
    } catch {
      // Ignore storage errors.
    }
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.sessionStorage.setItem("supervisor-sidebar-collapsed", next ? "1" : "0");
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  }

  const tab = tabFromPath(pathname, initialTab);

  async function refresh() {
    setLoadingClients(true);
    try {
      const list = await listClients();
      setClients(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load clients.");
    } finally {
      setLoadingClients(false);
    }
  }

  useEffect(() => {
    if (auth.isAdmin && tab === "clients") void refresh();
  }, [auth.isAdmin, tab]);

  async function createClient(input: {
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
        menuDesign: input.menuDesign,
        menuAccent: input.menuAccent,
        demoMenuEnabled: true,
        blocked: false,
        subscription,
        trial,
        billing
      });
      setMessage(`Cafe /${input.slug} is ready and a ${trial.days}-day free trial.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function removeClient(client: ClientAccount) {
    setDeleteConfirmText("");
    setPendingDelete(client);
  }

  async function confirmDelete() {
    const client = pendingDelete;
    if (!client || deleteConfirmText !== client.slug) return;
    setMessage("");
    setError("");
    setDeletingSlug(client.slug);
    try {
      await deleteClient(client.slug);
      setMessage(`Deleted /${client.slug} and all of its data.`);
      setPendingDelete(null);
      setDeleteConfirmText("");
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

  async function changeDesign(
    client: ClientAccount,
    next: {
      menuDesign: MenuDesign;
      menuAccent: string;
      menuBackdrop: boolean;
      menuMascot: boolean;
      menuMascotSpeed: number;
      qrEnabled: boolean;
      ratingEnabled: boolean;
      auditEnabled: boolean;
      demoMenuEnabled: boolean;
    }
  ) {
    setUpdatingSlug(client.slug);
    setMessage("");
    setError("");
    try {
      await patchClient(client.slug, {
        menuDesign: next.menuDesign,
        menuAccent: next.menuAccent,
        menuBackdrop: next.menuBackdrop,
        menuMascot: next.menuMascot,
        menuMascotSpeed: next.menuMascotSpeed,
        qrEnabled: next.qrEnabled,
        ratingEnabled: next.ratingEnabled,
        auditEnabled: next.auditEnabled,
        demoMenuEnabled: next.demoMenuEnabled
      });
      setMessage(`Updated menu design for /${client.slug}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update menu design.");
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
            <h1 className="text-2xl font-semibold">{text.supervisorTitle}</h1>
            <p className="text-muted-foreground">Sign in with a platform supervisor account to manage client menus.</p>
            <Button asChild>
              <Link href="/admin/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const profileName = auth.profile?.displayName || auth.profile?.username || "Supervisor";
  const profileHandle = auth.profile?.username ? `@${auth.profile.username}` : auth.user.email || "";
  const roleLabel = auth.role === "employee" ? text.roleEmployee : text.roleAdmin;

  return (
    <div dir="ltr" className="min-h-screen bg-background">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="fixed left-3 top-3 z-40 rounded-full bg-card shadow-sm sm:hidden"
        aria-label="Open supervisor navigation"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-4 w-4" aria-hidden />
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden border-r bg-card p-3 transition-[width] duration-200 sm:block",
          sidebarCollapsed ? "w-[4.5rem]" : "w-64 p-4"
        )}
      >
        <SupervisorNavigation
          pathname={pathname}
          text={text}
          textDir={textDir}
          profileName={profileName}
          profileHandle={profileHandle}
          roleLabel={roleLabel}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          onLogout={signOut}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity sm:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card p-4 shadow-xl transition-transform duration-300 sm:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute right-3 top-3 rounded-full"
          aria-label="Close supervisor navigation"
          onClick={() => setMobileNavOpen(false)}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
        <SupervisorNavigation
          pathname={pathname}
          text={text}
          textDir={textDir}
          profileName={profileName}
          profileHandle={profileHandle}
          roleLabel={roleLabel}
          collapsed={false}
          onNavigate={() => setMobileNavOpen(false)}
          onLogout={signOut}
        />
      </aside>

      <main className={cn("pt-14 transition-[margin] duration-200 sm:pt-0", sidebarCollapsed ? "sm:ml-[4.5rem]" : "sm:ml-64")}>
        <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6">
          <header>
            <h1 dir={textDir} className="text-3xl font-semibold">
              {tab === "dashboard"
                ? text.supervisorDashboard
                : tab === "payments"
                  ? text.supervisorPayments
                  : tab === "ratings"
                    ? text.supervisorRatings
                    : text.supervisorClients}
            </h1>
            <p dir={textDir} className="text-muted-foreground">
              {tab === "dashboard"
                ? text.supervisorDashboardDesc
                : tab === "ratings"
                  ? text.supervisorRatingsDesc
                  : text.supervisorDesc}
            </p>
          </header>

          {message ? (
            <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
          ) : null}

          {tab === "dashboard" ? <SupervisorDashboard /> : null}

          {tab === "payments" ? <PaymentReports /> : null}

          {tab === "ratings" ? <SupervisorRatings /> : null}

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
              onSaveDesign={(client, next) => void changeDesign(client, next)}
            />
          ) : null}
        </div>
      </main>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        variant="destructive"
        dir={textDir}
        loading={deletingSlug === pendingDelete?.slug}
        confirmDisabled={deleteConfirmText !== pendingDelete?.slug}
        title={pendingDelete ? `Delete /${pendingDelete.slug}?` : "Delete cafe?"}
        description={
          pendingDelete ? (
            <div className="space-y-3">
              <p>
                This permanently removes menu items, categories, settings, staff accounts, POS/orders, and expenses for{" "}
                <span className="font-semibold text-foreground">/{pendingDelete.slug}</span>. This cannot be undone.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">
                  Type <span className="font-mono font-semibold">{pendingDelete.slug}</span> to confirm
                </span>
                <Input
                  autoFocus
                  dir="ltr"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && deleteConfirmText === pendingDelete.slug) void confirmDelete();
                  }}
                  placeholder={pendingDelete.slug}
                />
              </label>
            </div>
          ) : null
        }
        confirmLabel={deletingSlug === pendingDelete?.slug ? "Deleting…" : "Delete cafe"}
        cancelLabel="Cancel"
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteConfirmText("");
        }}
      />
    </div>
  );
}

function SupervisorNavigation({
  pathname,
  text,
  textDir,
  profileName,
  profileHandle,
  roleLabel,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  onLogout
}: {
  pathname: string;
  text: Record<string, string>;
  textDir: "ltr" | "rtl";
  profileName: string;
  profileHandle: string;
  roleLabel: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("mb-6 flex items-start gap-2", collapsed ? "flex-col items-center" : "pr-2")}>
        <Link
          href="/admin/dashboard"
          dir={textDir}
          className={cn("min-w-0 flex-1", collapsed && "flex justify-center")}
          onClick={onNavigate}
          title={text.supervisorBrand}
        >
          {collapsed ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
              DM
            </span>
          ) : (
            <>
              <span className="block text-xl font-semibold">{text.supervisorBrand}</span>
              <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{text.supervisorTitle}</span>
            </>
          )}
        </Link>
        {onToggleCollapsed ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label={collapsed ? text.expandSidebar : text.collapseSidebar}
            title={collapsed ? text.expandSidebar : text.collapseSidebar}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
          </Button>
        ) : null}
      </div>

      <nav className={cn("grid gap-1", collapsed && "justify-items-center")}>
        {supervisorNav.map((entry) => {
          const Icon = entry.icon;
          const label = text[entry.labelKey];
          const active =
            entry.id === "dashboard"
              ? pathname.startsWith("/admin/dashboard") || pathname === "/admin" || pathname === "/admin/"
              : entry.id === "payments"
                ? pathname.startsWith("/admin/payments")
                : entry.id === "ratings"
                  ? pathname.startsWith("/admin/ratings")
                  : pathname.startsWith("/admin/clients");
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onNavigate}
              title={label}
              aria-label={label}
              className={cn(
                "focus-ring flex items-center rounded-md text-sm transition-colors",
                collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2",
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {!collapsed ? <span dir={textDir}>{label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-6", collapsed ? "flex justify-center" : "")}>
        <AdminPreferences compact className={collapsed ? "flex-col" : undefined} />
      </div>

      <SupervisorProfileMenu
        profileName={profileName}
        profileHandle={profileHandle}
        roleLabel={roleLabel}
        text={text}
        textDir={textDir}
        collapsed={collapsed}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function SupervisorProfileMenu({
  profileName,
  profileHandle,
  roleLabel,
  text,
  textDir,
  collapsed = false,
  onLogout,
  onNavigate
}: {
  profileName: string;
  profileHandle: string;
  roleLabel: string;
  text: Record<string, string>;
  textDir: "ltr" | "rtl";
  collapsed?: boolean;
  onLogout: () => void | Promise<void>;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const avatarText = getProfileInitials(profileName || profileHandle || text.adminProfile);
  const secondaryProfileText = profileHandle || text.email;

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    onNavigate?.();
    await onLogout();
  }

  return (
    <div ref={ref} className={cn("relative mt-auto pt-4", collapsed && "flex justify-center")}>
      {open ? (
        <div
          role="menu"
          className={cn(
            "pop-in absolute bottom-full z-20 mb-2 overflow-hidden rounded-2xl border bg-card p-1.5 shadow-xl",
            collapsed ? "left-0 w-64" : "left-0 w-full"
          )}
        >
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {avatarText}
              </span>
              <span className="min-w-0 flex-1">
                <span dir={textDir} className="block truncate text-sm font-semibold">
                  {profileName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{secondaryProfileText}</span>
              </span>
            </div>
            <div className="mt-2">
              <span dir={textDir} className="block truncate text-xs text-muted-foreground">
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="focus-ring mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span dir={textDir}>{text.logout}</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          "focus-ring flex items-center rounded-2xl border bg-background/60 text-start transition-colors hover:bg-muted",
          collapsed ? "h-11 w-11 justify-center p-0" : "w-full gap-3 p-2.5"
        )}
        aria-label={text.adminProfile}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${profileName} - ${secondaryProfileText}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {avatarText}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span dir={textDir} className="block truncate text-sm font-semibold">
                {profileName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{secondaryProfileText}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
          </>
        ) : null}
      </button>
    </div>
  );
}

function getProfileInitials(value: string) {
  const cleaned = value.trim();
  const name = cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2);
  return (letters || "A").toLocaleUpperCase();
}

function SupervisorSkeleton() {
  return (
    <div dir="ltr" className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card p-4 sm:block">
        <Skeleton className="mb-6 h-10 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="mt-6 h-16 w-full" />
        <Skeleton className="mt-auto h-14 w-full" />
      </aside>
      <main className="pt-14 sm:ml-64 sm:pt-0">
        <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
