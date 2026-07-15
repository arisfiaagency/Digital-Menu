"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  Languages,
  ListTree,
  MenuSquare,
  Plus,
  QrCode,
  Receipt,
  ReceiptText,
  Settings,
  ShoppingBag,
  Table2,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLocale } from "@/components/admin/admin-preferences";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { getAdminAppData, getPosState } from "@/lib/firebase/firestore";
import { localized } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useTenant } from "@/components/tenant-provider";
import type { AppData, Currency, PosCompletedOrder } from "@/types/models";

export function DashboardStats() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  const { adminBasePath, menuPath } = useTenant();
  const [data, setData] = useState<AppData | null>(null);
  const [completed, setCompleted] = useState<PosCompletedOrder[]>([]);

  useEffect(() => {
    getAdminAppData().then(setData).catch(() => undefined);
    getPosState().then((state) => setCompleted(state.completedOrders || [])).catch(() => undefined);
  }, []);

  if (!data) return <DashboardSkeleton />;

  const categories = data?.categories || [];
  const items = data?.menuItems || [];

  const activeCategories = categories.filter((entry) => entry.isActive).length;
  const availableItems = items.filter((entry) => entry.isAvailable && !entry.isSoldOut).length;
  const soldOut = items.filter((entry) => entry.isSoldOut).length;
  const missingTranslations = items.filter((entry) => !entry.name.en || !entry.name.ar || !entry.name.ckb).length;
  const missingImages = items.filter((entry) => !entry.imageUrl).length;

  const today = localDateKey(new Date());
  const activeCompleted = completed.filter((order) => order.status !== "cancelled");
  const todaysOrders = activeCompleted.filter((order) => localDateKey(new Date(order.completedAt)) === today);
  const todayRevenue = todaysOrders.reduce((sum, order) => sum + order.total, 0);
  const currency: Currency = todaysOrders[0]?.currency || activeCompleted[0]?.currency || data?.general.defaultCurrency || "IQD";
  const canSeeSales = auth.can("reports") || auth.can("pos");

  const restaurantName = localized(data?.general.restaurantName, locale, "Cafe");
  const dateLabel = new Date().toLocaleDateString(locale === "ckb" ? "ar-IQ" : locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const kpis: { icon: LucideIcon; label: string; value: string; accent?: boolean }[] = [
    ...(canSeeSales
      ? [
          { icon: TrendingUp, label: text.todayRevenue, value: formatMoney(todayRevenue, currency, locale), accent: true },
          { icon: Receipt, label: text.todayOrders, value: String(todaysOrders.length) }
        ]
      : []),
    { icon: MenuSquare, label: text.availableItems, value: String(availableItems) },
    { icon: ListTree, label: text.activeCategories, value: String(activeCategories) }
  ];

  const catalogRows = [
    { label: text.totalCategories, value: categories.length },
    { label: text.activeCategories, value: activeCategories },
    { label: text.totalMenuItems, value: items.length },
    { label: text.availableItems, value: availableItems },
    { label: text.soldOutItems, value: soldOut }
  ];

  const canMenuItems = auth.can("menuItems");
  const issues = [
    { icon: Languages, label: text.missingTranslations, count: missingTranslations },
    { icon: ImageOff, label: text.missingImages, count: missingImages },
    { icon: AlertTriangle, label: text.soldOutItems, count: soldOut }
  ].filter((issue) => issue.count > 0);

  const actions: { href: string; icon: LucideIcon; label: string; show: boolean; target?: string }[] = [
    { href: `${adminBasePath}/menu-items`, icon: Plus, label: text.addMenuItem, show: canMenuItems },
    { href: `${adminBasePath}/categories`, icon: Plus, label: text.addCategory, show: auth.can("categories") },
    { href: `${adminBasePath}/pos`, icon: Table2, label: text.pos, show: auth.can("pos") },
    { href: `${adminBasePath}/reports`, icon: BarChart3, label: text.reports, show: auth.can("reports") },
    { href: `${adminBasePath}/expenses`, icon: ReceiptText, label: text.expenses, show: auth.can("expenses") },
    { href: `${adminBasePath}/qr-code`, icon: QrCode, label: text.qrCode, show: auth.can("qrCode") },
    { href: `${adminBasePath}/settings`, icon: Settings, label: text.settings, show: auth.can("settings") },
    { href: menuPath, icon: ExternalLink, label: text.viewPublicMenu, show: true, target: "_blank" }
  ];
  const visibleActions = actions.filter((action) => action.show);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{text.dashboard}</h1>
          <p dir={textDir} className="text-muted-foreground">
            <span className="font-medium text-foreground">{restaurantName}</span> · {dateLabel}
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatTile key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} accent={kpi.accent} textDir={textDir} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Catalog overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="h-5 w-5 text-primary" aria-hidden />
              {text.catalogOverview}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {catalogRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-0">
                <span dir={textDir} className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Needs attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-primary" aria-hidden />
              {text.needsAttention}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.length ? (
              issues.map((issue) => {
                const Icon = issue.icon;
                const row = (
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span dir={textDir} className="min-w-0 flex-1 truncate">{issue.label}</span>
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">{issue.count}</span>
                    {canMenuItems ? <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden /> : null}
                  </div>
                );
                return canMenuItems ? (
                  <Link key={issue.label} href={`${adminBasePath}/menu-items`} className="focus-ring block rounded-lg">{row}</Link>
                ) : (
                  <div key={issue.label}>{row}</div>
                );
              })
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span dir={textDir} className="text-muted-foreground">{text.allGood}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{text.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  target={action.target}
                  className="focus-ring group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span dir={textDir} className="min-w-0 flex-1 truncate text-sm font-medium">{action.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  textDir
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
  textDir: "ltr" | "rtl";
}) {
  return (
    <Card className={cn(accent && "border-primary/30 bg-primary/5")}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span dir={textDir} className="block truncate text-xs text-muted-foreground">{label}</span>
          <span className="block truncate text-2xl font-bold">{value}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function localDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
