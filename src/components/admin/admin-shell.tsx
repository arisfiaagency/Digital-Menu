"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  CircleUserRound,
  History,
  KeyRound,
  LineChart,
  ListTree,
  LogOut,
  Menu,
  MenuSquare,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Table2,
  type LucideIcon,
  UsersRound,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logoutAdmin } from "@/lib/firebase/auth";
import { setAuditActor } from "@/lib/firebase/audit";
import { cn } from "@/lib/utils/cn";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminPreferences, useAdminLocale } from "@/components/admin/admin-preferences";
import type { AdminFeature } from "@/types/models";
import { useTenant } from "@/components/tenant-provider";

const nav: { path: string; labelKey: string; icon: LucideIcon; feature: AdminFeature }[] = [
  { path: "/dashboard", labelKey: "dashboard", icon: BarChart3, feature: "dashboard" },
  { path: "/categories", labelKey: "categories", icon: ListTree, feature: "categories" },
  { path: "/menu-items", labelKey: "menuItems", icon: MenuSquare, feature: "menuItems" },
  { path: "/pos", labelKey: "pos", icon: Table2, feature: "pos" },
  { path: "/reports", labelKey: "reports", icon: LineChart, feature: "reports" },
  { path: "/expenses", labelKey: "expenses", icon: ReceiptText, feature: "expenses" },
  { path: "/settings", labelKey: "settings", icon: Settings, feature: "settings" }
];

// Shown while the session resolves and during redirects — a skeleton, so the admin never sees a
// spinner or "loading…" text (skeletons are the only loading style across the app).
function AdminShellSkeleton() {
  return (
    <div dir="ltr" className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col gap-3 border-e bg-card p-4 sm:flex">
        <Skeleton className="h-10 w-40" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
        <Skeleton className="mt-auto h-12 w-full" />
      </aside>
      <main className="flex-1 space-y-6 p-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAdminAuth();
  const { text, dir: textDir } = useAdminLocale();
  const { adminBasePath } = useTenant();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const loginPath = `${adminBasePath}/login`;
  const usersHref = `${adminBasePath}/users`;
  const settingsHref = `${adminBasePath}/settings`;
  const auditHref = `${adminBasePath}/audit`;
  const navItems = nav.map((entry) => ({ ...entry, href: `${adminBasePath}${entry.path}` }));
  const isLogin = pathname === loginPath;

  // Attribute every audited write to the signed-in staff member. Set once the
  // session resolves so the data layer can record who did what without threading
  // the actor through each call site; cleared on sign-out.
  useEffect(() => {
    if (auth.user && auth.isAdmin) {
      const name = auth.profile?.displayName || auth.profile?.username || auth.user.email || undefined;
      setAuditActor({ uid: auth.user.uid, name, email: auth.user.email || undefined });
    } else {
      setAuditActor(null);
    }
  }, [auth.user, auth.isAdmin, auth.profile]);

  if (isLogin) return <>{children}</>;

  if (!auth.isConfigured) {
    return (
      <main dir="ltr" className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-xl" dir="ltr">
          <CardContent className="space-y-4 pt-5">
            <AdminPreferences />
            <h1 dir={textDir} className="text-2xl font-semibold">
              {text.firebaseRequiredTitle}
            </h1>
            <p dir={textDir} className="text-muted-foreground">
              {text.firebaseRequiredDescription}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (auth.loading) {
    return <AdminShellSkeleton />;
  }

  if (!auth.user || !auth.isAdmin) {
    router.replace(loginPath);
    return <AdminShellSkeleton />;
  }

  // Feature gating: employees only reach the sections they were granted.
  const allowedNav = navItems.filter((entry) => auth.can(entry.feature));
  const firstAllowedHref = allowedNav[0]?.href ?? (auth.canManageUsers ? usersHref : null);

  const onUsersRoute = pathname.startsWith(usersHref);
  const onAuditRoute = pathname.startsWith(auditHref);
  const currentNav = navItems.find((entry) => pathname.startsWith(entry.href));
  const routeAllowed = onAuditRoute
    ? auth.isMainAdmin
    : onUsersRoute
      ? auth.canManageUsers
      : currentNav
        ? auth.can(currentNav.feature)
        : true;

  if (!routeAllowed) {
    if (firstAllowedHref) {
      router.replace(firstAllowedHref);
      return <AdminShellSkeleton />;
    }
    return (
      <main dir="ltr" className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md" dir="ltr">
          <CardContent className="space-y-4 pt-5 text-center">
            <AdminPreferences />
            <h1 dir={textDir} className="text-2xl font-semibold">{text.noAccessTitle}</h1>
            <p dir={textDir} className="text-muted-foreground">{text.noAccessDesc}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="destructive" onClick={() => void handleLogout()}>
                <span dir={textDir}>{text.logout}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  async function handleLogout() {
    await logoutAdmin();
    router.replace(loginPath);
  }

  return (
    <div dir="ltr" className="min-h-screen bg-background">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="no-print fixed left-3 top-3 z-40 rounded-full bg-card shadow-sm sm:hidden"
        aria-label="Open admin navigation"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-4 w-4" aria-hidden />
      </Button>

      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 border-r bg-card p-4 sm:block">
        <AdminNavigation
          pathname={pathname}
          text={text}
          textDir={textDir}
          userEmail={auth.user.email || ""}
          navItems={allowedNav}
          canManageUsers={auth.canManageUsers}
          canSettings={auth.can("settings")}
          isMainAdmin={auth.isMainAdmin}
          usersHref={usersHref}
          settingsHref={settingsHref}
          auditHref={auditHref}
          homeHref={adminBasePath}
          onLogout={handleLogout}
        />
      </aside>

      <div
        className={cn(
          "no-print fixed inset-0 z-50 bg-background/70 backdrop-blur-sm transition-opacity sm:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!mobileNavOpen}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 w-64 border-r bg-card p-4 shadow-xl transition-transform duration-300 sm:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute right-3 top-3 rounded-full"
          aria-label="Close admin navigation"
          onClick={() => setMobileNavOpen(false)}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
        <AdminNavigation
          pathname={pathname}
          text={text}
          textDir={textDir}
          userEmail={auth.user.email || ""}
          navItems={allowedNav}
          canManageUsers={auth.canManageUsers}
          canSettings={auth.can("settings")}
          isMainAdmin={auth.isMainAdmin}
          usersHref={usersHref}
          settingsHref={settingsHref}
          auditHref={auditHref}
          homeHref={adminBasePath}
          onNavigate={() => setMobileNavOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      <main className="pt-14 sm:ml-64 sm:pt-0">
        {/* Admin content uses a wider cap than the global `container` (1180px) so grid-heavy pages
            like POS actually fill big screens, staying fluid on laptops and centered on ultrawides. */}
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

function AdminNavigation({
  pathname,
  text,
  textDir,
  userEmail,
  navItems,
  canManageUsers,
  canSettings,
  isMainAdmin,
  usersHref,
  settingsHref,
  auditHref,
  homeHref,
  onNavigate,
  onLogout
}: {
  pathname: string;
  text: Record<string, string>;
  textDir: "ltr" | "rtl";
  userEmail: string;
  navItems: { href: string; labelKey: string; icon: LucideIcon; feature: AdminFeature }[];
  canManageUsers: boolean;
  canSettings: boolean;
  isMainAdmin: boolean;
  usersHref: string;
  settingsHref: string;
  auditHref: string;
  homeHref: string;
  onNavigate?: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const items = [
    ...navItems,
    ...(canManageUsers ? [{ href: usersHref, labelKey: "users", icon: UsersRound }] : []),
    // The Activity Log is the Main Admin's oversight view — only they see the nav item.
    ...(isMainAdmin ? [{ href: auditHref, labelKey: "auditLog", icon: History }] : [])
  ];

  return (
    <div className="flex h-full flex-col">
      <Link href={homeHref} dir={textDir} className="mb-6 block pr-10 text-xl font-semibold" onClick={onNavigate}>
        {text.brand}
      </Link>
      <nav className="grid gap-1">
        {items.map((entry) => {
          const Icon = entry.icon;
          const label = text[entry.labelKey];
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onNavigate}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                pathname === entry.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span dir={textDir}>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 rounded-md border p-3">
        <AdminPreferences />
      </div>
      <AdminProfileMenu
        text={text}
        textDir={textDir}
        userEmail={userEmail}
        canManageUsers={canManageUsers}
        canSettings={canSettings}
        usersHref={usersHref}
        settingsHref={settingsHref}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    </div>
  );
}

function AdminProfileMenu({
  text,
  textDir,
  userEmail,
  canManageUsers,
  canSettings,
  usersHref,
  settingsHref,
  onNavigate,
  onLogout
}: {
  text: Record<string, string>;
  textDir: "ltr" | "rtl";
  userEmail: string;
  canManageUsers: boolean;
  canSettings: boolean;
  usersHref: string;
  settingsHref: string;
  onNavigate?: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  function handleNavigate() {
    setOpen(false);
    onNavigate?.();
  }

  async function handleLogoutClick() {
    setOpen(false);
    onNavigate?.();
    await onLogout();
  }

  return (
    <div ref={ref} className="relative mt-auto pt-4">
      {open ? (
        <div
          role="menu"
          className="pop-in absolute bottom-full left-0 z-20 mb-2 max-h-[calc(100vh-7rem)] w-full overflow-y-auto rounded-2xl border bg-card p-1.5 shadow-xl"
        >
          <a
            href={settingsHref.replace(/\/admin\/settings$/, "")}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={handleNavigate}
            className="focus-ring mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <MenuSquare className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span dir={textDir}>{text.viewPublicMenu}</span>
          </a>
          {canSettings ? (
            <div className="rounded-xl bg-muted/40 p-1">
              <ProfileMenuLink href={settingsHref} icon={Settings} label={text.settings} textDir={textDir} onClick={handleNavigate} />
              <ProfileMenuLink
                href={`${settingsHref}#general`}
                icon={Building2}
                label={text.generalSettings}
                textDir={textDir}
                onClick={handleNavigate}
                nested
              />
              <ProfileMenuLink
                href={`${settingsHref}#menu`}
                icon={SlidersHorizontal}
                label={text.menuSettings}
                textDir={textDir}
                onClick={handleNavigate}
                nested
              />
              <ProfileMenuLink
                href={`${settingsHref}#account`}
                icon={KeyRound}
                label={text.accountSettings}
                textDir={textDir}
                onClick={handleNavigate}
                nested
              />
            </div>
          ) : null}
          {canManageUsers ? (
            <ProfileMenuLink href={usersHref} icon={UsersRound} label={text.userManagement} textDir={textDir} onClick={handleNavigate} />
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogoutClick}
            className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span dir={textDir}>{text.logout}</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="focus-ring flex w-full items-center gap-3 rounded-2xl border bg-background/60 p-2.5 text-start transition-colors hover:bg-muted"
        aria-label={text.adminProfile}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CircleUserRound className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span dir={textDir} className="block truncate text-sm font-semibold">
            {text.adminProfile}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{userEmail || text.email}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
    </div>
  );
}

function ProfileMenuLink({
  href,
  icon: Icon,
  label,
  textDir,
  onClick,
  nested = false
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  textDir: "ltr" | "rtl";
  onClick: () => void;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={cn(
        "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
        nested && "pl-9 text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 text-primary", nested && "text-muted-foreground")} aria-hidden />
      <span dir={textDir}>{label}</span>
    </Link>
  );
}
