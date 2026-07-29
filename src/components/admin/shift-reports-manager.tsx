"use client";

import { useEffect, useMemo, useState, Fragment, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, DoorOpen, FileText, History, Printer, Receipt, Scale, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminErrorText, formatAdminText, useAdminLocale } from "@/components/admin/admin-preferences";
import { useTenant } from "@/components/tenant-provider";
import { getAdminAppData, getPosState, listShifts } from "@/lib/firebase/firestore";
import { localized } from "@/lib/i18n/config";
import { loadPosPrinterConfig, printerForRole } from "@/lib/pos-printers";
import { printThermalReport } from "@/lib/thermal-print";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CashShift, Currency, Locale, PosCompletedOrder } from "@/types/models";

type Mode = "daily" | "monthly" | "all";

export function ShiftReportsManager() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const { adminBasePath, clientSlug } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [orders, setOrders] = useState<PosCompletedOrder[]>([]);
  const [restaurantName, setRestaurantName] = useState("Cafe");
  const [mode, setMode] = useState<Mode>("daily");
  const [day, setDay] = useState(() => todayKey());
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listShifts(200), getPosState(), getAdminAppData()])
      .then(([nextShifts, pos, app]) => {
        setShifts(nextShifts);
        setOrders(pos.completedOrders || []);
        setRestaurantName(localized(app.general.restaurantName, locale, "Cafe"));
      })
      .catch((err) => setError(err instanceof Error ? err.message : text.settingsSaveFailed))
      .finally(() => setLoading(false));
  }, [locale, text.settingsSaveFailed]);

  const filtered = useMemo(() => {
    return shifts
      .filter((shift) => {
        if (mode === "all") return true;
        const key = localDateKey(shift.closedAt || shift.openedAt);
        if (!key) return false;
        return mode === "daily" ? key === day : key.slice(0, 7) === month;
      })
      .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
  }, [shifts, mode, day, month]);

  const currency: Currency = filtered[0]?.currency || shifts[0]?.currency || "IQD";

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, shift) => {
        const sales = shiftSales(shift, orders);
        acc.sales += sales.salesTotal;
        acc.orders += sales.ordersCount;
        if (shift.status === "closed") {
          acc.variance +=
            shift.variance ??
            (shift.closingCashCounted || 0) - (shift.expectedCash ?? shift.openingCash + sales.salesTotal);
        }
        return acc;
      },
      { sales: 0, orders: 0, variance: 0 }
    );
  }, [filtered, orders]);

  const periodLabel =
    mode === "all" ? text.allTime : mode === "monthly" ? formatMonthLabel(month, locale) : formatDayLabel(day, locale);

  const modes: { key: Mode; label: string }[] = [
    { key: "daily", label: text.daily },
    { key: "monthly", label: text.monthly },
    { key: "all", label: text.allTime }
  ];

  function printPdf() {
    document.body.classList.add("shift-report-pdf-printing");
    const cleanup = () => document.body.classList.remove("shift-report-pdf-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  function printThermal() {
    setMessage("");
    const printerConfig = loadPosPrinterConfig(clientSlug);
    const printerName = printerForRole(printerConfig, "invoice") || undefined;
    if (printerName) {
      setMessage(formatAdminText(text.selectAssignedPrinter, { name: printerName }));
    }

    const receiptLocale: Locale = locale === "ckb" || locale === "ar" ? locale : "en";
    const shiftLines = filtered.map((shift) => {
      const sales = shiftSales(shift, orders);
      const expected = shift.expectedCash ?? shift.openingCash + sales.salesTotal;
      const variance =
        shift.status === "closed" ? (shift.variance ?? (shift.closingCashCounted || 0) - expected) : null;
      return {
        left: formatDateTime(shift.openedAt, locale),
        right: formatMoney(sales.salesTotal, shift.currency, receiptLocale),
        note: [
          shift.status === "open" ? text.shiftStatusOpen : text.shiftStatusClosed,
          `${sales.ordersCount} ${text.ordersCount}`,
          variance == null ? null : `${text.shiftVariance}: ${formatMoney(variance, shift.currency, receiptLocale)}`
        ]
          .filter(Boolean)
          .join(" · ")
      };
    });

    void printThermalReport({
      title: text.shiftReports,
      subtitle: `${periodLabel} · ${filtered.length} ${text.shiftsCount}`,
      restaurantName,
      printerName,
      printerLabel: text.printerLabel,
      paperWidth: printerConfig.paperWidth,
      rows: [
        { label: text.shiftsCount, value: String(filtered.length) },
        { label: text.shiftSales, value: formatMoney(totals.sales, currency, receiptLocale), strong: true },
        { label: text.ordersCount, value: String(totals.orders) },
        { label: text.shiftTotalVariance, value: formatMoney(totals.variance, currency, receiptLocale) },
        {
          label: text.shiftAvgSales,
          value: formatMoney(filtered.length ? Math.round(totals.sales / filtered.length) : 0, currency, receiptLocale)
        }
      ],
      blocks: shiftLines.length
        ? [{ title: text.shiftReports, lines: shiftLines }]
        : undefined
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={textDir}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${adminBasePath}/reports`}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {text.backToReports}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">{text.shiftReports}</h1>
            <p className="text-muted-foreground">{text.shiftReportsDesc}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex gap-1.5">
            {modes.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setMode(entry.key)}
                className={cn(
                  "focus-ring rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === entry.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {mode === "daily" ? (
            <Input type="date" value={day} max={todayKey()} onChange={(event) => setDay(event.target.value)} className="h-9 w-auto" aria-label={text.daily} />
          ) : null}
          {mode === "monthly" ? (
            <Input type="month" value={month} max={todayKey().slice(0, 7)} onChange={(event) => setMonth(event.target.value)} className="h-9 w-auto" aria-label={text.monthly} />
          ) : null}
          <Button variant="outline" size="sm" onClick={printPdf} disabled={!filtered.length}>
            <FileText className="me-1.5 h-4 w-4" aria-hidden />
            {text.printPdf}
          </Button>
          <Button variant="outline" size="sm" onClick={printThermal} disabled={!filtered.length}>
            <Printer className="me-1.5 h-4 w-4" aria-hidden />
            {text.printThermal}
          </Button>
        </div>
      </div>

      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{adminErrorText(error, text)}</p> : null}
      {message ? <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary print:hidden">{message}</p> : null}

      <div className="shift-report-pdf-area space-y-6">
        <div className="hidden shift-report-pdf-only mb-4">
          <p className="text-lg font-semibold">{restaurantName}</p>
          <p className="text-base font-semibold">{text.shiftReports}</p>
          <p className="text-sm text-muted-foreground">
            {periodLabel} · {filtered.length} {text.shiftsCount}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<History className="h-5 w-5" aria-hidden />} label={text.shiftsCount} value={String(filtered.length)} />
          <StatCard icon={<Receipt className="h-5 w-5" aria-hidden />} label={text.shiftSales} value={formatMoney(totals.sales, currency, locale)} hint={`${totals.orders} ${text.ordersCount}`} />
          <StatCard icon={<Scale className="h-5 w-5" aria-hidden />} label={text.shiftTotalVariance} value={formatMoney(totals.variance, currency, locale)} tone={totals.variance === 0 ? "neutral" : "warn"} />
          <StatCard
            icon={<Wallet className="h-5 w-5" aria-hidden />}
            label={text.shiftAvgSales}
            value={formatMoney(filtered.length ? Math.round(totals.sales / filtered.length) : 0, currency, locale)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DoorOpen className="h-5 w-5" aria-hidden />
              {text.shiftReports}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!filtered.length ? (
              <p className="text-sm text-muted-foreground">{text.shiftNoReports}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-start text-muted-foreground">
                      <th className="px-2 py-2 font-medium">{text.shiftOpenedAt}</th>
                      <th className="px-2 py-2 font-medium">{text.shiftClosedAt}</th>
                      <th className="px-2 py-2 font-medium">{text.shiftOpeningCash}</th>
                      <th className="px-2 py-2 font-medium">{text.shiftSales}</th>
                      <th className="px-2 py-2 font-medium">{text.shiftExpectedCash}</th>
                      <th className="px-2 py-2 font-medium">{text.shiftClosingCash}</th>
                      <th className="px-2 py-2 font-medium">{text.shiftVariance}</th>
                      <th className="px-2 py-2 font-medium">{text.byWho}</th>
                      <th className="px-2 py-2 font-medium">{text.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((shift) => {
                      const sales = shiftSales(shift, orders);
                      const expected = shift.expectedCash ?? shift.openingCash + sales.salesTotal;
                      const variance =
                        shift.status === "closed"
                          ? (shift.variance ?? (shift.closingCashCounted || 0) - expected)
                          : null;
                      const open = expandedId === shift.id;
                      const shiftOrders = ordersForShift(shift, orders);
                      return (
                        <Fragment key={shift.id}>
                          <tr
                            className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                            onClick={() => setExpandedId(open ? null : shift.id)}
                          >
                            <td className="px-2 py-2.5">{formatDateTime(shift.openedAt, locale)}</td>
                            <td className="px-2 py-2.5">{shift.closedAt ? formatDateTime(shift.closedAt, locale) : "—"}</td>
                            <td className="px-2 py-2.5">{formatMoney(shift.openingCash, shift.currency, locale)}</td>
                            <td className="px-2 py-2.5">
                              {formatMoney(sales.salesTotal, shift.currency, locale)}
                              <span className="ms-1 text-muted-foreground">({sales.ordersCount})</span>
                            </td>
                            <td className="px-2 py-2.5">{formatMoney(expected, shift.currency, locale)}</td>
                            <td className="px-2 py-2.5">
                              {shift.status === "closed" ? formatMoney(shift.closingCashCounted || 0, shift.currency, locale) : "—"}
                            </td>
                            <td
                              className={cn(
                                "px-2 py-2.5 font-medium",
                                variance == null ? "text-muted-foreground" : variance === 0 ? "text-primary" : "text-amber-700 dark:text-amber-400"
                              )}
                            >
                              {variance == null ? "—" : formatMoney(variance, shift.currency, locale)}
                            </td>
                            <td className="px-2 py-2.5 text-muted-foreground">
                              {[shift.openedBy, shift.closedBy].filter(Boolean).join(" → ") || "—"}
                            </td>
                            <td className="px-2 py-2.5">
                              {shift.status === "open" ? (
                                <Badge className="bg-primary/15 text-primary">{text.shiftStatusOpen}</Badge>
                              ) : (
                                <Badge className="bg-muted text-muted-foreground">{text.shiftStatusClosed}</Badge>
                              )}
                            </td>
                          </tr>
                          {open ? (
                            <tr className="border-b bg-muted/20 last:border-0 print:hidden">
                              <td colSpan={9} className="px-3 py-3">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock3 className="h-3.5 w-3.5" aria-hidden />
                                      {text.shiftDuration}: {formatDuration(shift.openedAt, shift.closedAt, text)}
                                    </span>
                                    {shift.note ? <span>{text.note}: {shift.note}</span> : null}
                                    {shift.closeNote ? <span>{text.closeNote}: {shift.closeNote}</span> : null}
                                  </div>
                                  {!shiftOrders.length ? (
                                    <p className="text-sm text-muted-foreground">{text.noOrdersInShift}</p>
                                  ) : (
                                    <div className="overflow-x-auto rounded-lg border bg-card">
                                      <table className="w-full min-w-[480px] text-sm">
                                        <thead>
                                          <tr className="border-b text-start text-muted-foreground">
                                            <th className="px-2 py-2 font-medium">{text.time}</th>
                                            <th className="px-2 py-2 font-medium">{text.table}</th>
                                            <th className="px-2 py-2 font-medium">{text.ordersCount}</th>
                                            <th className="px-2 py-2 font-medium">{text.total}</th>
                                            <th className="px-2 py-2 font-medium">{text.byWho}</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {shiftOrders.map((order) => (
                                            <tr key={order.id} className="border-b last:border-0">
                                              <td className="px-2 py-2">{formatDateTime(order.completedAt, locale)}</td>
                                              <td className="px-2 py-2">{order.tableName}</td>
                                              <td className="px-2 py-2">{order.lines.reduce((sum, line) => sum + line.quantity, 0)}</td>
                                              <td className="px-2 py-2 font-medium">{formatMoney(order.total, order.currency, locale)}</td>
                                              <td className="px-2 py-2 text-muted-foreground">{order.completedBy || order.takenBy || "—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function shiftSales(shift: CashShift, orders: PosCompletedOrder[]) {
  if (shift.status === "closed" && typeof shift.salesTotal === "number") {
    return { salesTotal: shift.salesTotal, ordersCount: shift.ordersCount || 0 };
  }
  const shiftOrders = ordersForShift(shift, orders);
  return {
    salesTotal: shiftOrders.reduce((sum, order) => sum + (order.total || 0), 0),
    ordersCount: shiftOrders.length
  };
}

function ordersForShift(shift: CashShift, orders: PosCompletedOrder[]) {
  const end = shift.closedAt || new Date().toISOString();
  return orders
    .filter((order) => {
      if (order.status === "cancelled") return false;
      if (order.shiftId === shift.id) return true;
      if (order.shiftId) return false;
      return order.completedAt >= shift.openedAt && order.completedAt <= end;
    })
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warn";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-xs text-muted-foreground">{label}</span>
          <span className={cn("block truncate text-xl font-bold", tone === "warn" && "text-amber-700 dark:text-amber-400")}>{value}</span>
          {hint ? <span className="block truncate text-xs text-muted-foreground">{hint}</span> : null}
        </span>
      </CardContent>
    </Card>
  );
}

function localDateKey(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayKey(): string {
  return localDateKey(new Date().toISOString());
}

function formatDayLabel(key: string, locale: Locale): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString(locale === "ckb" ? "ar-IQ" : locale, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatMonthLabel(key: string, locale: Locale): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(locale === "ckb" ? "ar-IQ" : locale, {
    year: "numeric",
    month: "long"
  });
}

function formatDateTime(iso: string, locale: Locale | string) {
  try {
    return new Intl.DateTimeFormat(locale === "ckb" ? "ku" : locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(openedAt: string, closedAt: string | undefined, text: Record<string, string>) {
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  const ms = end - new Date(openedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}${text.shiftMinutesShort}`;
  return `${hours}${text.shiftHoursShort} ${minutes}${text.shiftMinutesShort}`;
}
