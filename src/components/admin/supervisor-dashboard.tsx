"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Clock3,
  CreditCard,
  ShieldOff,
  Sparkles
} from "lucide-react";
import { useAdminLocale } from "@/components/admin/admin-preferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  accessExpiryLabel,
  formatExpiryDate,
  formatMoney,
  getAccessExpiryState,
  getServiceExpiresAt,
  isClientServiceActive
} from "@/lib/client-access";
import { listClients, listPlatformPayments } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils/cn";
import type { ClientAccount, Currency, PlatformPayment } from "@/types/models";

function monthKey(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function SupervisorDashboard() {
  const { text, dir: textDir } = useAdminLocale();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listClients(), listPlatformPayments()])
      .then(([nextClients, nextPayments]) => {
        if (cancelled) return;
        setClients(nextClients);
        setPayments(nextPayments);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : text.settingsSaveFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [text.settingsSaveFailed]);

  const summary = useMemo(() => {
    let active = 0;
    let blocked = 0;
    let disabled = 0;
    let live = 0;
    let nearExpiry = 0;
    let expired = 0;
    let trialing = 0;

    for (const client of clients) {
      if (client.blocked) blocked += 1;
      else if (client.status === "disabled") disabled += 1;
      else if (isClientServiceActive(client)) active += 1;

      const expiry = getAccessExpiryState(client);
      if (expiry === "live") live += 1;
      if (expiry === "near_expiry") nearExpiry += 1;
      if (expiry === "expired") expired += 1;
      if (client.subscription?.status === "trialing" || (client.trial?.days || 0) > 0) {
        const trialEnd = client.trial?.endAt ? new Date(client.trial.endAt).getTime() : 0;
        if (trialEnd > Date.now()) trialing += 1;
      }
    }

    const thisMonth = monthKey(new Date().toISOString());
    const monthTotals = new Map<Currency, number>();
    const allTotals = new Map<Currency, number>();
    for (const payment of payments) {
      allTotals.set(payment.currency, (allTotals.get(payment.currency) || 0) + payment.amount);
      if (monthKey(payment.createdAt) === thisMonth) {
        monthTotals.set(payment.currency, (monthTotals.get(payment.currency) || 0) + payment.amount);
      }
    }

    const outstanding = new Map<Currency, number>();
    for (const client of clients) {
      const owed = client.billing?.amountOwed || 0;
      if (owed <= 0) continue;
      const currency = (client.billing?.currency || client.defaultCurrency || "IQD") as Currency;
      outstanding.set(currency, (outstanding.get(currency) || 0) + owed);
    }

    const attention = [...clients]
      .filter((client) => {
        if (client.blocked) return true;
        const state = getAccessExpiryState(client);
        return state === "near_expiry" || state === "expired";
      })
      .sort((a, b) => {
        const rank = (client: ClientAccount) => {
          if (client.blocked) return 0;
          const state = getAccessExpiryState(client);
          if (state === "expired") return 1;
          if (state === "near_expiry") return 2;
          return 3;
        };
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      })
      .slice(0, 8);

    const recentPayments = [...payments]
      .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
      .slice(0, 6);

    return {
      total: clients.length,
      active,
      blocked,
      disabled,
      live,
      nearExpiry,
      expired,
      trialing,
      monthTotals: [...monthTotals.entries()],
      allTotals: [...allTotals.entries()],
      outstanding: [...outstanding.entries()],
      attention,
      recentPayments
    };
  }, [clients, payments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          label={text.supervisorStatCafes}
          value={String(summary.total)}
          hint={`${summary.active} ${text.supervisorStatActive}`}
          textDir={textDir}
        />
        <StatCard
          icon={<ShieldOff className="h-5 w-5" aria-hidden />}
          label={text.supervisorStatBlocked}
          value={String(summary.blocked)}
          hint={`${summary.disabled} ${text.supervisorStatDisabled}`}
          tone={summary.blocked > 0 ? "warn" : "neutral"}
          textDir={textDir}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          label={text.supervisorStatAttention}
          value={String(summary.nearExpiry + summary.expired)}
          hint={`${summary.nearExpiry} ${text.supervisorStatNearExpiry} · ${summary.expired} ${text.supervisorStatExpired}`}
          tone={summary.nearExpiry + summary.expired > 0 ? "warn" : "neutral"}
          textDir={textDir}
        />
        <StatCard
          icon={<Sparkles className="h-5 w-5" aria-hidden />}
          label={text.supervisorStatTrialing}
          value={String(summary.trialing)}
          hint={`${summary.live} ${text.supervisorStatLive}`}
          textDir={textDir}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MoneyCard
          title={text.supervisorRevenueMonth}
          rows={summary.monthTotals}
          empty={text.supervisorNoPayments}
          textDir={textDir}
        />
        <MoneyCard
          title={text.supervisorRevenueAll}
          rows={summary.allTotals}
          empty={text.supervisorNoPayments}
          textDir={textDir}
        />
        <MoneyCard
          title={text.supervisorOutstanding}
          rows={summary.outstanding}
          empty={text.supervisorNoOutstanding}
          tone="warn"
          textDir={textDir}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock3 className="h-5 w-5 text-primary" aria-hidden />
              <span dir={textDir}>{text.supervisorNeedsAttention}</span>
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients">{text.supervisorClients}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!summary.attention.length ? (
              <p dir={textDir} className="text-sm text-muted-foreground">
                {text.supervisorAllClear}
              </p>
            ) : (
              <ul className="space-y-2">
                {summary.attention.map((client) => {
                  const state = getAccessExpiryState(client);
                  const badge = client.blocked
                    ? text.supervisorStatBlocked
                    : state === "expired"
                      ? text.supervisorStatExpired
                      : text.supervisorStatNearExpiry;
                  return (
                    <li
                      key={client.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{client.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /{client.slug} · {accessExpiryLabel(client)} · {formatExpiryDate(getServiceExpiresAt(client))}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          client.blocked || state === "expired"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {badge}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" aria-hidden />
              <span dir={textDir}>{text.supervisorRecentPayments}</span>
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/payments">{text.supervisorPayments}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!summary.recentPayments.length ? (
              <p dir={textDir} className="text-sm text-muted-foreground">
                {text.supervisorNoPayments}
              </p>
            ) : (
              <ul className="space-y-2">
                {summary.recentPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {payment.clientName || payment.clientSlug}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{payment.clientSlug} · {formatWhen(payment.createdAt)}
                        {payment.monthsAdded ? ` · +${payment.monthsAdded} mo` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(payment.amount, payment.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
  textDir
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warn";
  textDir: "ltr" | "rtl";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            tone === "warn" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span dir={textDir} className="block truncate text-xs text-muted-foreground">
            {label}
          </span>
          <span className={cn("block truncate text-2xl font-bold", tone === "warn" && "text-amber-700 dark:text-amber-400")}>
            {value}
          </span>
          {hint ? (
            <span dir={textDir} className="block truncate text-xs text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>
      </CardContent>
    </Card>
  );
}

function MoneyCard({
  title,
  rows,
  empty,
  tone = "neutral",
  textDir
}: {
  title: string;
  rows: Array<[Currency, number]>;
  empty: string;
  tone?: "neutral" | "warn";
  textDir: "ltr" | "rtl";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4 text-primary" aria-hidden />
          <span dir={textDir}>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p dir={textDir} className="text-sm text-muted-foreground">
            {empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map(([currency, amount]) => (
              <li key={currency} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{currency}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    tone === "warn" && "text-amber-700 dark:text-amber-400"
                  )}
                >
                  {formatMoney(amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
