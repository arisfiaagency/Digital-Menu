"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleOff, ListOrdered, Pencil, PlusCircle, ReceiptText, Search, Scale, Tags, Trash2, TrendingDown, TrendingUp, UserRound, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminErrorText, useAdminLocale } from "@/components/admin/admin-preferences";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { deleteExpense, getAdminAppData, getPosState, listExpenses, saveExpense } from "@/lib/firebase/firestore";
import { formatMoney, normalizeSearch } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Currency, Expense, PosCompletedOrder } from "@/types/models";

type Mode = "daily" | "monthly" | "all";

const expenseCategoryKeys = [
  "expenseCategoryFood",
  "expenseCategorySupplies",
  "expenseCategoryUtilities",
  "expenseCategoryRent",
  "expenseCategorySalary",
  "expenseCategoryMaintenance",
  "expenseCategoryMarketing",
  "expenseCategoryDelivery",
  "expenseCategoryOther"
];

export function ExpenseManager() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  const canManageExpenses = !auth.loading && auth.role === "admin";
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<PosCompletedOrder[]>([]);
  const [currency, setCurrency] = useState<Currency>("IQD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("daily");
  const [day, setDay] = useState(() => todayKey());
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => todayKey());
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  // The expense currently being edited (null = the form adds a new one).
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Recorded automatically as the signed-in user — staff can't change who an
  // expense is attributed to. When editing, the original attribution is kept.
  const recordedBy = auth.profile?.displayName || auth.profile?.username || auth.user?.email || "";
  const formByWho = editingExpense ? editingExpense.byWho : recordedBy;

  function resetForm() {
    setTitle("");
    setCategory("");
    setAmount("");
    setNote("");
    setDate(todayKey());
  }

  function openAddForm() {
    setEditingExpense(null);
    resetForm();
    setFormOpen(true);
    setMessage("");
    setError("");
  }

  function closeForm() {
    setFormOpen(false);
    setEditingExpense(null);
  }

  function startEdit(expense: Expense) {
    setEditingExpense(expense);
    setTitle(expense.title);
    setDate(expense.date);
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setNote(expense.note || "");
    setFormOpen(true);
    setMessage("");
    setError("");
  }

  async function refresh() {
    const [data, pos, nextExpenses] = await Promise.all([getAdminAppData(), getPosState(), listExpenses()]);
    setCurrency(data.general.defaultCurrency);
    setOrders(pos.completedOrders || []);
    setExpenses(nextExpenses);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err instanceof Error ? err.message : text.settingsSaveFailed))
      .finally(() => setLoading(false));
  }, [text.settingsSaveFailed]);

  const categoryOptions = useMemo(() => {
    const fromText = expenseCategoryKeys.map((key) => text[key]).filter(Boolean);
    const fromExpenses = expenses.map((expense) => expense.category).filter(Boolean);
    return [...new Set([...fromText, ...fromExpenses])].sort((a, b) => a.localeCompare(b));
  }, [expenses, text]);

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return expenses
      .filter((expense) => matchesPeriod(expense.date, mode, day, month))
      .filter((expense) => categoryFilter === "all" || expense.category === categoryFilter)
      .filter((expense) => {
        if (!normalizedQuery) return true;
        return normalizeSearch([expense.title, expense.category, expense.note || "", expense.byWho].join(" ")).includes(normalizedQuery);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [categoryFilter, day, expenses, mode, month, query]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => order.status !== "cancelled" && matchesPeriod(localDateKey(order.completedAt), mode, day, month));
  }, [day, mode, month, orders]);

  const activeFilteredExpenses = useMemo(
    () => filteredExpenses.filter((expense) => expense.status !== "cancelled"),
    [filteredExpenses]
  );

  const totals = useMemo(() => {
    const totalExpenses = activeFilteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const largest = activeFilteredExpenses.reduce((max, expense) => Math.max(max, expense.amount), 0);
    return {
      expenses: totalExpenses,
      sales: totalSales,
      net: totalSales - totalExpenses,
      count: activeFilteredExpenses.length,
      average: activeFilteredExpenses.length ? Math.round(totalExpenses / activeFilteredExpenses.length) : 0,
      largest
    };
  }, [activeFilteredExpenses, filteredOrders]);

  const categoryTotals = useMemo(() => groupedTotals(activeFilteredExpenses, (expense) => expense.category), [activeFilteredExpenses]);
  const byWhoTotals = useMemo(() => groupedTotals(activeFilteredExpenses, (expense) => expense.byWho), [activeFilteredExpenses]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();
    // Editing keeps the original attribution; adding uses the signed-in user.
    const trimmedByWho = (editingExpense ? editingExpense.byWho : recordedBy).trim();
    const parsedAmount = Math.round(Number(amount));
    if (!trimmedTitle || !date || !trimmedCategory || !trimmedByWho || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(text.expenseRequired);
      return;
    }

    setSaving(true);
    try {
      if (editingExpense) {
        // Preserve who/when it was originally recorded; only change the details.
        await saveExpense({
          ...editingExpense,
          title: trimmedTitle,
          category: trimmedCategory,
          amount: parsedAmount,
          date,
          note: note.trim() || undefined
        });
      } else {
        await saveExpense({
          id: "",
          title: trimmedTitle,
          category: trimmedCategory,
          amount: parsedAmount,
          currency,
          date,
          note: note.trim() || undefined,
          byWho: trimmedByWho,
          createdByUid: auth.user?.uid,
          createdByEmail: auth.user?.email || undefined,
          status: "active"
        });
      }
      const wasEditing = Boolean(editingExpense);
      resetForm();
      closeForm();
      await refresh();
      setMessage(wasEditing ? text.expenseUpdated : text.expenseSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !canManageExpenses) return;
    setMessage("");
    setError("");
    setSaving(true);
    try {
      await deleteExpense(deleteTarget.id, deleteTarget.title);
      await refresh();
      setDeleteTarget(null);
      setMessage(text.expenseDeleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  const modes: { key: Mode; label: string }[] = [
    { key: "daily", label: text.daily },
    { key: "monthly", label: text.monthly },
    { key: "all", label: text.allTime }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{text.expenses}</h1>
          <p dir={textDir} className="text-muted-foreground">{text.expensesDesc}</p>
        </div>
        <Button type="button" onClick={() => (formOpen ? closeForm() : openAddForm())}>
          <PlusCircle className="h-4 w-4" aria-hidden />
          {text.addExpense}
        </Button>
      </div>

      {message ? <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}
      {error ? <p dir={textDir} className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{adminErrorText(error, text)}</p> : null}

      {formOpen ? (
        <Card className="settings-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="h-5 w-5 text-primary" aria-hidden />
              {editingExpense ? text.editExpense : text.addExpense}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <Field label={text.expenseTitle}>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`${text.amount} (${currency})`}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="text-lg font-semibold"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    onFocus={(event) => event.target.select()}
                  />
                </Field>
                <Field label={text.date}>
                  <Input type="date" className="max-w-[11rem]" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value)} />
                </Field>
              </div>

              <Field label={text.category}>
                <Input list="expense-categories" value={category} onChange={(event) => setCategory(event.target.value)} />
                <datalist id="expense-categories">
                  {categoryOptions.map((option) => <option key={option} value={option} />)}
                </datalist>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {expenseCategoryKeys.map((key) => {
                    const label = text[key];
                    if (!label) return null;
                    const active = category === label;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(active ? "" : label)}
                        className={cn(
                          "focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label={text.byWho}>
                <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm" title={formByWho}>
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span dir={textDir} className="truncate font-medium">{formByWho || "—"}</span>
                </div>
              </Field>

              <Field label={text.note}>
                <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>

              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button type="submit" disabled={saving}>{saving ? text.saving : editingExpense ? text.updateExpense : text.saveExpense}</Button>
                <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>{text.cancel}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

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
        {mode === "daily" ? <Input type="date" value={day} max={todayKey()} onChange={(event) => setDay(event.target.value)} className="h-9 w-auto" aria-label={text.daily} /> : null}
        {mode === "monthly" ? <Input type="month" value={month} max={todayKey().slice(0, 7)} onChange={(event) => setMonth(event.target.value)} className="h-9 w-auto" aria-label={text.monthly} /> : null}
      </div>

      {/* Headline: sales minus expenses = total sale after expense */}
      <Card className="overflow-hidden">
        <CardContent dir="ltr" className="flex flex-col items-stretch gap-3 p-5 sm:flex-row sm:items-center sm:gap-4">
          <SummaryFigure
            icon={<TrendingUp className="h-4 w-4" aria-hidden />}
            label={text.totalSales}
            value={formatMoney(totals.sales, currency, locale)}
            tone="positive"
            textDir={textDir}
          />
          <Operator>−</Operator>
          <SummaryFigure
            icon={<TrendingDown className="h-4 w-4" aria-hidden />}
            label={text.totalExpenses}
            value={formatMoney(totals.expenses, currency, locale)}
            tone="negative"
            textDir={textDir}
          />
          <Operator>=</Operator>
          <SummaryFigure
            icon={<Scale className="h-4 w-4" aria-hidden />}
            label={text.saleAfterExpense}
            value={formatMoney(totals.net, currency, locale)}
            tone={totals.net >= 0 ? "positive" : "negative"}
            emphasized
            textDir={textDir}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<ReceiptText className="h-5 w-5" aria-hidden />} label={text.expensesCount} value={String(totals.count)} />
        <StatCard icon={<Wallet className="h-5 w-5" aria-hidden />} label={text.avgExpense} value={formatMoney(totals.average, currency, locale)} />
        <StatCard icon={<Wallet className="h-5 w-5" aria-hidden />} label={text.largestExpense} value={formatMoney(totals.largest, currency, locale)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownCard title={text.expensesByCategory} icon={<Tags className="h-5 w-5 text-primary" aria-hidden />} rows={categoryTotals} currency={currency} locale={locale} emptyText={text.noExpenses} />
        <BreakdownCard title={text.expensesByPerson} icon={<UserRound className="h-5 w-5 text-primary" aria-hidden />} rows={byWhoTotals} currency={currency} locale={locale} emptyText={text.noExpenses} />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input className="ps-9" placeholder={text.searchExpenses} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">{text.allCategories}</option>
          {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListOrdered className="h-5 w-5 text-primary" aria-hidden />
            {text.expenses}
            {filteredExpenses.length ? <Badge className="border-primary/30 bg-primary/10 text-primary">{filteredExpenses.length}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filteredExpenses.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-start text-xs uppercase text-muted-foreground">
                    <th className="py-2 pe-3 text-start">{text.date}</th>
                    <th className="px-3 py-2 text-start">{text.expenseTitle}</th>
                    <th className="px-3 py-2 text-start">{text.category}</th>
                    <th className="px-3 py-2 text-end">{text.amount}</th>
                    <th className="py-2 ps-3 text-start">{text.byWho}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className={cn("border-b last:border-0", expense.status === "cancelled" && "opacity-60")}>
                      <td className="whitespace-nowrap py-3 pe-3">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
                          {formatDate(expense.date, locale)}
                        </span>
                      </td>
                      <td className="max-w-[260px] px-3 py-3">
                        <p dir={textDir} className="flex items-center gap-2 truncate font-medium">
                          {expense.title}
                          {expense.status === "cancelled" ? <Badge className="bg-destructive/10 text-destructive">{text.cancelled}</Badge> : null}
                        </p>
                        {expense.note ? <p dir={textDir} className="mt-1 line-clamp-2 text-xs text-muted-foreground">{expense.note}</p> : null}
                      </td>
                      <td className="px-3 py-3"><Badge>{expense.category}</Badge></td>
                      <td className="whitespace-nowrap px-3 py-3 text-end font-semibold">{formatMoney(expense.amount, expense.currency, locale)}</td>
                      <td className="py-3 ps-3">
                        <div className="flex items-center justify-between gap-2">
                          <span dir={textDir} className="min-w-0 truncate">{expense.byWho}</span>
                          {canManageExpenses ? (
                            <span className="flex items-center gap-1">
                              {expense.status !== "cancelled" ? (
                                <Button type="button" variant="outline" size="icon" aria-label={text.editExpense} title={text.editExpense} disabled={saving} onClick={() => startEdit(expense)}>
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </Button>
                              ) : null}
                              <Button type="button" variant="destructive" size="icon" aria-label={text.delete} title={text.delete} disabled={saving} onClick={() => setDeleteTarget(expense)}>
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </Button>
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={query || categoryFilter !== "all" ? text.noMatchingExpenses : text.noExpenses} />
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={text.delete}
        description={text.deleteExpenseConfirm}
        confirmLabel={text.delete}
        cancelLabel={text.cancel}
        variant="destructive"
        loading={saving}
        dir={textDir}
        icon={<Trash2 className="h-5 w-5" aria-hidden />}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "default"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "primary" | "destructive";
}) {
  return (
    <Card className={cn(tone === "primary" && "border-primary/30 bg-primary/5", tone === "destructive" && "border-destructive/30 bg-destructive/5")}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{icon}</span>
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
        emphasized
          ? tone === "negative"
            ? "border-destructive/40 bg-destructive/10"
            : "border-primary/40 bg-primary/10"
          : "bg-card"
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

function BreakdownCard({
  title,
  icon,
  rows,
  currency,
  locale,
  emptyText
}: {
  title: string;
  icon: React.ReactNode;
  rows: { key: string; amount: number; count: number }[];
  currency: Currency;
  locale: string;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length ? rows.slice(0, 8).map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
            <span className="min-w-0 truncate text-sm font-medium">{row.key}</span>
            <span className="shrink-0 text-sm text-muted-foreground">{row.count}</span>
            <span className="shrink-0 text-sm font-semibold">{formatMoney(row.amount, currency, locale)}</span>
          </div>
        )) : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyText}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/15 p-8 text-center">
      <CircleOff className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="mt-3 font-medium">{title}</p>
    </div>
  );
}

function groupedTotals(expenses: Expense[], keyOf: (expense: Expense) => string) {
  const map = new Map<string, { key: string; amount: number; count: number }>();
  for (const expense of expenses) {
    const key = keyOf(expense) || "-";
    const current = map.get(key) || { key, amount: 0, count: 0 };
    current.amount += expense.amount;
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function matchesPeriod(dateKey: string, mode: Mode, day: string, month: string) {
  if (mode === "all") return true;
  if (!dateKey) return false;
  return mode === "daily" ? dateKey === day : dateKey.slice(0, 7) === month;
}

function localDateKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return localDateKey(new Date().toISOString());
}

function formatDate(dateKey: string, locale: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year || 0, (month || 1) - 1, day || 1);
  return date.toLocaleDateString(locale === "ckb" ? "ar-IQ" : locale, { year: "numeric", month: "short", day: "numeric" });
}
