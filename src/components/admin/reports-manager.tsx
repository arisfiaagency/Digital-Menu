"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, BarChart3, FileText, ListOrdered, Pencil, Printer, Receipt, Scale, ShoppingBag, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminErrorText, useAdminLocale } from "@/components/admin/admin-preferences";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { deleteCompletedOrder, getAdminAppData, getPosState, listExpenses, updateCompletedOrder } from "@/lib/firebase/firestore";
import { localized } from "@/lib/i18n/config";
import { formatMoney, roundCashTotal } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Currency, Expense, Locale, MenuItem, PosCompletedOrder, PosDiscountType, PosOrderLine } from "@/types/models";

type Mode = "daily" | "monthly" | "all";

export function ReportsManager() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  const canManageOrders = !auth.loading && auth.role === "admin";
  const [orders, setOrders] = useState<PosCompletedOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: MenuItem["name"] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PosCompletedOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<PosCompletedOrder | null>(null);
  const [mode, setMode] = useState<Mode>("daily");
  const [day, setDay] = useState(() => todayKey());
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));

  useEffect(() => {
    Promise.all([getPosState(), listExpenses(), getAdminAppData()])
      .then(([state, nextExpenses, appData]) => {
        setOrders(state.completedOrders || []);
        setExpenses(nextExpenses);
        setMenuItems(appData.menuItems);
        setCategories(appData.categories.map((category) => ({ id: category.id, name: category.name })));
      })
      .catch((err) => setError(err instanceof Error ? err.message : text.settingsSaveFailed))
      .finally(() => setLoading(false));
  }, [text.settingsSaveFailed]);

  const periodOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (mode === "all") return true;
        const key = localDateKey(order.completedAt);
        if (!key) return false;
        return mode === "daily" ? key === day : key.slice(0, 7) === month;
      })
      .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  }, [orders, mode, day, month]);
  const filtered = useMemo(() => periodOrders.filter((order) => order.status !== "cancelled"), [periodOrders]);

  const currency: Currency = filtered[0]?.currency || orders[0]?.currency || "IQD";

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, order) => {
        acc.revenue += order.total;
        acc.subtotal += order.subtotal;
        acc.discount += order.discountAmount;
        acc.serviceFee += order.serviceFeeAmount || 0;
        acc.items += order.lines.reduce((sum, line) => sum + line.quantity, 0);
        return acc;
      },
      { revenue: 0, subtotal: 0, discount: 0, serviceFee: 0, items: 0 }
    );
  }, [filtered]);

  const topItems = useMemo(() => {
    const map = new Map<string, { name: PosCompletedOrder["lines"][number]["name"]; variantName?: PosCompletedOrder["lines"][number]["variantName"]; quantity: number; revenue: number }>();
    for (const order of filtered) {
      for (const line of order.lines) {
        const key = `${line.itemId}:${line.variantId || "base"}`;
        const current = map.get(key) || { name: line.name, variantName: line.variantName, quantity: 0, revenue: 0 };
        current.quantity += line.quantity;
        current.revenue += line.quantity * line.unitPrice;
        map.set(key, current);
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [filtered]);

  const topMax = topItems[0]?.quantity || 1;

  // Revenue bucketed across the selected period: by hour (daily), by day
  // (monthly), or by month (all time). Sorted chronologically for the bar chart.
  const trend = useMemo(() => {
    const map = new Map<string, { revenue: number; sort: number; label: string }>();
    for (const order of filtered) {
      const date = new Date(order.completedAt);
      if (Number.isNaN(date.getTime())) continue;
      let key: string;
      let sort: number;
      let label: string;
      if (mode === "daily") {
        const hour = date.getHours();
        key = String(hour);
        sort = hour;
        label = `${(hour % 12) || 12}${hour < 12 ? "a" : "p"}`;
      } else if (mode === "monthly") {
        const dayOfMonth = date.getDate();
        key = String(dayOfMonth);
        sort = dayOfMonth;
        label = String(dayOfMonth);
      } else {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        sort = date.getFullYear() * 12 + date.getMonth();
        label = date.toLocaleDateString(locale === "ckb" ? "ar-IQ" : locale, { month: "short" });
      }
      const current = map.get(key) || { revenue: 0, sort, label };
      current.revenue += order.total;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => a.sort - b.sort);
  }, [filtered, mode, locale]);

  const trendMax = Math.max(1, ...trend.map((entry) => entry.revenue));

  const avgOrder = filtered.length ? Math.round(totals.revenue / filtered.length) : 0;

  // Expenses logged for the selected period (expense.date is already a local
  // YYYY-MM-DD key), and the resulting sale-after-expense figure.
  const expensesTotal = useMemo(() => {
    return expenses
      .filter((expense) => expense.status !== "cancelled")
      .filter((expense) => {
        if (mode === "all") return true;
        if (!expense.date) return false;
        return mode === "daily" ? expense.date === day : expense.date.slice(0, 7) === month;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, mode, day, month]);

  const saleAfterExpense = totals.revenue - expensesTotal;

  const periodLabel = mode === "all" ? text.allTime : mode === "monthly" ? formatMonthLabel(month, locale) : formatDayLabel(day, locale);

  function printSummary() {
    document.body.classList.add("report-printing");
    const cleanup = () => document.body.classList.remove("report-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  async function confirmDeleteOrder() {
    if (!deleteTarget || !canManageOrders) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await deleteCompletedOrder(deleteTarget.id, deleteTarget.tableName);
      setOrders((current) => current.filter((order) => order.id !== deleteTarget.id));
      setMessage(text.orderDeleted);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  function handleOrderSaved(updated: PosCompletedOrder) {
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    setEditingOrder(null);
    setMessage(text.orderUpdated);
  }

  const modes: { key: Mode; label: string }[] = [
    { key: "daily", label: text.daily },
    { key: "monthly", label: text.monthly },
    { key: "all", label: text.allTime }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{text.reports}</h1>
          <p dir={textDir} className="text-muted-foreground">{text.reportsDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {error ? <p dir={textDir} className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{adminErrorText(error, text)}</p> : null}
      {message ? <p dir={textDir} className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}

      {/* Sales minus expenses = total sale after expense */}
      <Card className="overflow-hidden">
        <CardContent dir="ltr" className="flex flex-col items-stretch gap-3 p-5 sm:flex-row sm:items-center sm:gap-4">
          <SummaryFigure icon={<TrendingUp className="h-4 w-4" aria-hidden />} label={text.totalSales} value={formatMoney(totals.revenue, currency, locale)} tone="positive" textDir={textDir} />
          <Operator>−</Operator>
          <SummaryFigure icon={<TrendingDown className="h-4 w-4" aria-hidden />} label={text.totalExpenses} value={formatMoney(expensesTotal, currency, locale)} tone="negative" textDir={textDir} />
          <Operator>=</Operator>
          <SummaryFigure icon={<Scale className="h-4 w-4" aria-hidden />} label={text.saleAfterExpense} value={formatMoney(saleAfterExpense, currency, locale)} tone={saleAfterExpense >= 0 ? "positive" : "negative"} emphasized textDir={textDir} />
        </CardContent>
      </Card>

      {/* Close / shift summary — a printable end-of-period breakdown (Z-report style). */}
      <Card className="report-print-area">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" aria-hidden />
              {text.closeSummary}
            </CardTitle>
            <p dir={textDir} className="mt-1 text-xs text-muted-foreground">{periodLabel} · {filtered.length} {text.ordersCount}</p>
          </div>
          <Button variant="outline" size="sm" onClick={printSummary} className="shrink-0 print:hidden">
            <Printer className="me-1.5 h-4 w-4" aria-hidden />
            {text.printSummary}
          </Button>
        </CardHeader>
        <CardContent dir="ltr">
          <dl className="space-y-0.5 text-sm">
            <CloseLine label={text.grossSales} value={formatMoney(totals.subtotal, currency, locale)} textDir={textDir} />
            <CloseLine label={text.totalDiscounts} value={`− ${formatMoney(totals.discount, currency, locale)}`} tone="negative" textDir={textDir} />
            {totals.serviceFee > 0 ? (
              <CloseLine label={text.serviceFees} value={`+ ${formatMoney(totals.serviceFee, currency, locale)}`} textDir={textDir} />
            ) : null}
            <div className="my-1 border-t" />
            <CloseLine label={text.netSales} value={formatMoney(totals.revenue, currency, locale)} strong textDir={textDir} />
            <CloseLine label={text.totalExpenses} value={`− ${formatMoney(expensesTotal, currency, locale)}`} tone="negative" textDir={textDir} />
            <div className="my-1 border-t" />
            <CloseLine label={text.saleAfterExpense} value={formatMoney(saleAfterExpense, currency, locale)} tone={saleAfterExpense >= 0 ? "positive" : "negative"} emphasized textDir={textDir} />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{totals.items} {text.itemsSold}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<TrendingUp className="h-5 w-5" aria-hidden />} label={text.totalRevenue} value={formatMoney(totals.revenue, currency, locale)} />
        <StatCard icon={<Receipt className="h-5 w-5" aria-hidden />} label={text.ordersCount} value={String(filtered.length)} />
        <StatCard icon={<ShoppingBag className="h-5 w-5" aria-hidden />} label={text.itemsSold} value={String(totals.items)} />
        <StatCard icon={<BadgePercent className="h-5 w-5" aria-hidden />} label={text.totalDiscounts} value={formatMoney(totals.discount, currency, locale)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={<TrendingUp className="h-5 w-5" aria-hidden />} label={text.avgOrder} value={formatMoney(avgOrder, currency, locale)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
            {text.revenueTrend}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length ? (
            <div dir="ltr" className="flex h-44 items-end gap-1.5 overflow-x-auto pb-1">
              {trend.map((entry) => (
                <div key={entry.sort} className="flex h-full min-w-[26px] flex-1 flex-col items-center justify-end gap-1.5">
                  <div
                    className="w-full rounded-t bg-primary/80 transition-colors hover:bg-primary"
                    style={{ height: `${Math.max(3, Math.round((entry.revenue / trendMax) * 100))}%` }}
                    title={formatMoney(entry.revenue, currency, locale)}
                  />
                  <span className="text-[10px] tabular-nums text-muted-foreground">{entry.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p dir={textDir} className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text.noSales}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListOrdered className="h-5 w-5 text-primary" aria-hidden />
            {text.topItems}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{text.checkingSession}</p>
          ) : topItems.length ? (
            <div className="space-y-2">
              {topItems.map((item, index) => (
                <div key={index} className="relative flex items-center gap-3 overflow-hidden rounded-lg border bg-card p-3">
                  <span
                    className="absolute inset-y-0 left-0 bg-primary/10"
                    style={{ width: `${Math.round((item.quantity / topMax) * 100)}%` }}
                    aria-hidden
                  />
                  <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                  <span dir={textDir} className="relative z-10 min-w-0 flex-1 truncate text-sm font-medium">
                    {localized(item.name, locale)}{item.variantName ? ` · ${localized(item.variantName, locale)}` : ""}
                  </span>
                  <span className="relative z-10 shrink-0 text-sm font-semibold">{item.quantity}×</span>
                  <span className="relative z-10 shrink-0 text-sm text-muted-foreground">{formatMoney(item.revenue, currency, locale)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p dir={textDir} className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text.noSales}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" aria-hidden />
            {text.allOrders}
            {periodOrders.length ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">{periodOrders.length}</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {periodOrders.length ? (
            <div className="space-y-2">
              {periodOrders.map((order) => (
                <div key={order.id} className={cn("flex items-center justify-between gap-3 rounded-lg border bg-card p-3", order.status === "cancelled" && "opacity-60")}>
                  <div className="min-w-0">
                    <p dir={textDir} className="flex items-center gap-2 truncate text-sm font-medium">
                      {order.tableName}
                      {order.status === "cancelled" ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">{text.cancelled}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.completedAt).toLocaleString(locale === "ckb" ? "ar-IQ" : locale)} ·{" "}
                      {order.lines.reduce((sum, line) => sum + line.quantity, 0)} {text.itemsSold}
                    </p>
                    {order.takenBy || order.completedBy ? (
                      <p dir={textDir} className="mt-0.5 text-xs text-muted-foreground">
                        {order.takenBy && order.completedBy && order.takenBy !== order.completedBy
                          ? `${text.orderTakenBy}: ${order.takenBy} · ${text.orderCompletedBy}: ${order.completedBy}`
                          : `${text.orderBy}: ${order.takenBy || order.completedBy}`}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold">{formatMoney(order.total, order.currency, locale)}</span>
                    {canManageOrders ? (
                      <>
                        {order.status !== "cancelled" ? (
                          <Button type="button" variant="outline" size="icon" aria-label={text.editOrder} title={text.editOrder} onClick={() => setEditingOrder(order)}>
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                        ) : null}
                        <Button type="button" variant="destructive" size="icon" aria-label={text.delete} title={text.delete} onClick={() => setDeleteTarget(order)}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p dir={textDir} className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text.noSales}</p>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={text.delete}
        description={text.deleteOrderConfirm}
        confirmLabel={text.delete}
        cancelLabel={text.cancel}
        variant="destructive"
        loading={saving}
        dir={textDir}
        icon={<Trash2 className="h-5 w-5" aria-hidden />}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteOrder()}
      />
      {editingOrder ? (
        <EditOrderDialog
          order={editingOrder}
          menuItems={menuItems}
          categories={categories}
          locale={locale}
          text={text}
          textDir={textDir}
          onClose={() => setEditingOrder(null)}
          onSaved={handleOrderSaved}
        />
      ) : null}
    </div>
  );
}

// Recomputes an order's money the same way POS does: service fee is on the pre-discount subtotal,
// discount is capped at the subtotal, and total = subtotal − discount + fee.
function recomputeOrder(lines: PosOrderLine[], discountType: PosDiscountType, discountValue: number, feeRate: number, currency: Currency) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const raw = discountType === "percent" ? Math.round((subtotal * Math.min(discountValue, 100)) / 100) : discountValue;
  const discountAmount = Math.min(subtotal, Math.max(0, raw));
  const serviceFeeAmount = Math.round(subtotal * Math.max(0, feeRate));
  // Snap the payable total to the nearest cash denomination (250 IQD), same as POS.
  const total = roundCashTotal(subtotal - discountAmount + serviceFeeAmount, currency);
  return { subtotal, discountAmount, serviceFeeAmount, total };
}

function EditOrderDialog({
  order,
  menuItems,
  categories,
  locale,
  text,
  textDir,
  onClose,
  onSaved
}: {
  order: PosCompletedOrder;
  menuItems: MenuItem[];
  categories: { id: string; name: MenuItem["name"] }[];
  locale: Locale;
  text: Record<string, string>;
  textDir: "ltr" | "rtl";
  onClose: () => void;
  onSaved: (order: PosCompletedOrder) => void;
}) {
  const [lines, setLines] = useState<PosOrderLine[]>(order.lines.map((line) => ({ ...line })));
  const [discountType, setDiscountType] = useState<PosDiscountType>(order.discountType);
  const [discountValue, setDiscountValue] = useState<number>(order.discountValue || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keep the order's original fee rate so editing doesn't silently change the fee policy.
  const feeRate =
    typeof order.serviceFeeRate === "number"
      ? order.serviceFeeRate
      : order.subtotal > 0
        ? (order.serviceFeeAmount || 0) / order.subtotal
        : 0;
  const totals = useMemo(
    () => recomputeOrder(lines, discountType, discountValue, feeRate, order.currency),
    [lines, discountType, discountValue, feeRate, order.currency]
  );

  function updateLine(id: string, patch: Partial<PosOrderLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function addFromValue(value: string) {
    if (!value) return;
    const [itemId, variantId] = value.split("::");
    const item = menuItems.find((entry) => entry.id === itemId);
    if (!item) return;
    const variant = variantId ? item.variants.find((entry) => entry.id === variantId) : undefined;
    const unitPrice = variant ? variant.price : item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.basePrice;
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        itemId: item.id,
        name: item.name,
        variantId: variant?.id,
        variantName: variant?.name,
        quantity: 1,
        unitPrice,
        currency: order.currency
      }
    ]);
  }

  async function save() {
    if (!lines.length) {
      setError(text.noSales);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated: PosCompletedOrder = {
        ...order,
        lines,
        discountType,
        discountValue,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        serviceFeeRate: feeRate,
        serviceFeeAmount: totals.serviceFeeAmount,
        total: totals.total
      };
      await updateCompletedOrder(updated);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => {
        if (!saving) onClose();
      }}
    >
      <Card className="dialog-panel flex max-h-[90vh] w-full max-w-lg flex-col" onMouseDown={(event) => event.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle dir={textDir} className="text-lg">{text.editOrder} · {order.tableName}</CardTitle>
          <Button type="button" variant="ghost" size="icon" aria-label={text.cancel} onClick={onClose} disabled={saving}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {error ? <p dir={textDir} className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">{adminErrorText(error, text)}</p> : null}

          <div className="space-y-2">
            {lines.length ? lines.map((line) => (
              <div key={line.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p dir={textDir} className="truncate text-sm font-medium">
                      {localized(line.name, locale)}{line.variantName ? ` · ${localized(line.variantName, locale)}` : ""}
                    </p>
                    {line.flavor ? <p dir={textDir} className="truncate text-xs text-muted-foreground">{line.flavor}</p> : null}
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={text.remove} title={text.remove} onClick={() => removeLine(line.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">
                    <span dir={textDir} className="mb-1 block">{text.quantity}</span>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) => updateLine(line.id, { quantity: Math.max(1, Math.round(Number(event.target.value) || 1)) })}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    <span dir={textDir} className="mb-1 block">{text.price}</span>
                    <Input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(event) => updateLine(line.id, { unitPrice: Math.max(0, Math.round(Number(event.target.value) || 0)) })}
                    />
                  </label>
                </div>
              </div>
            )) : (
              <p dir={textDir} className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{text.noSales}</p>
            )}
          </div>

          <div className="space-y-1">
            <span dir={textDir} className="text-xs font-medium text-muted-foreground">{text.addItem}</span>
            <Select value="" onChange={(event) => { addFromValue(event.target.value); event.target.value = ""; }}>
              <option value="">{text.addItem}…</option>
              {menuItems.map((item) => {
                const variants = item.variants.filter((variant) => variant.isAvailable);
                const categoryName = localized(categories.find((category) => category.id === item.categoryId)?.name, locale, text.noCategory);
                if (variants.length) {
                  return (
                    <optgroup key={item.id} label={`${localized(item.name, locale, item.name.en)} — ${categoryName}`}>
                      {variants.map((variant) => (
                        <option key={variant.id} value={`${item.id}::${variant.id}`}>
                          {localized(item.name, locale, item.name.en)} · {localized(variant.name, locale, variant.name.en)}
                        </option>
                      ))}
                    </optgroup>
                  );
                }
                return (
                  <option key={item.id} value={`${item.id}::`}>
                    {localized(item.name, locale, item.name.en)} — {categoryName}
                  </option>
                );
              })}
            </Select>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select value={discountType} onChange={(event) => setDiscountType(event.target.value as PosDiscountType)}>
              <option value="amount">{order.currency}</option>
              <option value="percent">%</option>
            </Select>
            <label className="flex items-center gap-2">
              <span dir={textDir} className="text-xs text-muted-foreground">{text.discount}</span>
              <Input
                type="number"
                min={0}
                className="w-28"
                value={discountValue}
                onChange={(event) => setDiscountValue(Math.max(0, Math.round(Number(event.target.value) || 0)))}
              />
            </label>
          </div>

          <dl dir="ltr" className="space-y-1 rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{text.subtotal}</dt><dd className="tabular-nums">{formatMoney(totals.subtotal, order.currency, locale)}</dd></div>
            {totals.discountAmount > 0 ? (
              <div className="flex justify-between"><dt className="text-muted-foreground">{text.discount}</dt><dd className="tabular-nums text-destructive">− {formatMoney(totals.discountAmount, order.currency, locale)}</dd></div>
            ) : null}
            {totals.serviceFeeAmount > 0 ? (
              <div className="flex justify-between"><dt className="text-muted-foreground">{text.serviceFees}</dt><dd className="tabular-nums">+ {formatMoney(totals.serviceFeeAmount, order.currency, locale)}</dd></div>
            ) : null}
            <div className="flex justify-between border-t pt-1 font-bold"><dt>{text.total}</dt><dd className="tabular-nums">{formatMoney(totals.total, order.currency, locale)}</dd></div>
          </dl>
        </CardContent>
        <div className="flex shrink-0 gap-2 border-t p-4">
          <Button type="button" className="flex-1" disabled={saving || !lines.length} onClick={() => void save()}>
            {saving ? text.saving : text.saveOrder}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{text.cancel}</Button>
        </div>
      </Card>
    </div>
  );
}

// Local-time YYYY-MM-DD so a day/month picked in the admin's timezone matches.
function localDateKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey(): string {
  return localDateKey(new Date().toISOString());
}

function formatDayLabel(key: string, locale: Locale): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString(locale === "ckb" ? "ar-IQ" : locale, { year: "numeric", month: "long", day: "numeric" });
}

function formatMonthLabel(key: string, locale: Locale): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(locale === "ckb" ? "ar-IQ" : locale, { year: "numeric", month: "long" });
}

function CloseLine({
  label,
  value,
  tone,
  strong = false,
  emphasized = false,
  textDir
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  strong?: boolean;
  emphasized?: boolean;
  textDir: "ltr" | "rtl";
}) {
  const accent = tone === "negative" ? "text-destructive" : tone === "positive" ? "text-primary" : "";
  return (
    <div className={cn("flex items-baseline justify-between gap-4 rounded-md px-1 py-1", emphasized && "bg-primary/5 px-2")}>
      <dt dir={textDir} className={cn("text-muted-foreground", (strong || emphasized) && "font-semibold text-foreground")}>{label}</dt>
      <dd className={cn("shrink-0 tabular-nums", accent, emphasized ? "text-lg font-bold" : strong ? "font-bold" : "font-medium")}>{value}</dd>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-xs text-muted-foreground">{label}</span>
          <span className="block truncate text-xl font-bold">{value}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function SummaryFigure({
  icon,
  label,
  value,
  tone,
  emphasized = false,
  textDir
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "positive" | "negative";
  emphasized?: boolean;
  textDir: "ltr" | "rtl";
}) {
  const accent = tone === "negative" ? "text-destructive" : "text-primary";
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border p-4",
        emphasized ? (tone === "negative" ? "border-destructive/40 bg-destructive/10" : "border-primary/40 bg-primary/10") : "bg-card"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone === "negative" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
          {icon}
        </span>
        <span dir={textDir} className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={cn("mt-2 font-bold tabular-nums", accent, emphasized ? "text-2xl sm:text-3xl" : "text-xl")}>{value}</p>
    </div>
  );
}

function Operator({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 select-none text-center text-xl font-bold text-muted-foreground sm:text-2xl" aria-hidden>
      {children}
    </span>
  );
}
