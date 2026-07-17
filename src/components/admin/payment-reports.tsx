"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/client-access";
import { listClients, listPlatformPayments } from "@/lib/firebase/firestore";
import type { ClientAccount, Currency, PlatformPayment } from "@/types/models";

function monthKey(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function PaymentReports() {
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [paymentRows, clientRows] = await Promise.all([listPlatformPayments(), listClients()]);
      setPayments(paymentRows);
      setClients(clientRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payment reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const months = useMemo(() => {
    const keys = new Set<string>();
    for (const payment of payments) {
      const key = monthKey(payment.createdAt);
      if (key) keys.add(key);
    }
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      if (clientFilter !== "all" && payment.clientSlug !== clientFilter) return false;
      if (monthFilter !== "all" && monthKey(payment.createdAt) !== monthFilter) return false;
      return true;
    });
  }, [payments, clientFilter, monthFilter]);

  const totalsByCurrency = useMemo(() => {
    const map = new Map<Currency, number>();
    for (const payment of filtered) {
      map.set(payment.currency, (map.get(payment.currency) || 0) + payment.amount);
    }
    return [...map.entries()];
  }, [filtered]);

  const outstandingByCurrency = useMemo(() => {
    const map = new Map<Currency, number>();
    for (const client of clients) {
      const currency = (client.billing?.currency || client.defaultCurrency || "IQD") as Currency;
      const owed = client.billing?.amountOwed || 0;
      if (owed <= 0) continue;
      if (clientFilter !== "all" && client.slug !== clientFilter) continue;
      map.set(currency, (map.get(currency) || 0) + owed);
    }
    return [...map.entries()];
  }, [clients, clientFilter]);

  const thisMonthKey = monthKey(new Date().toISOString());
  const thisMonthTotal = useMemo(() => {
    const map = new Map<Currency, number>();
    for (const payment of payments) {
      if (monthKey(payment.createdAt) !== thisMonthKey) continue;
      if (clientFilter !== "all" && payment.clientSlug !== clientFilter) continue;
      map.set(payment.currency, (map.get(payment.currency) || 0) + payment.amount);
    }
    return [...map.entries()];
  }, [payments, thisMonthKey, clientFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Payment reports</h2>
          <p className="text-sm text-muted-foreground">Ledger of cafe subscription payments recorded in Clients.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payments shown</p>
            <p className="mt-1 text-2xl font-semibold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Collected (filter)</p>
            <div className="mt-1 space-y-0.5">
              {totalsByCurrency.length ? (
                totalsByCurrency.map(([currency, total]) => (
                  <p key={currency} className="text-lg font-semibold">
                    {formatMoney(total, currency)}
                  </p>
                ))
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This month</p>
            <div className="mt-1 space-y-0.5">
              {thisMonthTotal.length ? (
                thisMonthTotal.map(([currency, total]) => (
                  <p key={currency} className="text-lg font-semibold">
                    {formatMoney(total, currency)}
                  </p>
                ))
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Still owed</p>
            <div className="mt-1 space-y-0.5">
              {outstandingByCurrency.length ? (
                outstandingByCurrency.map(([currency, total]) => (
                  <p key={currency} className="text-lg font-semibold text-destructive">
                    {formatMoney(total, currency)}
                  </p>
                ))
              ) : (
                <p className="text-lg font-semibold text-muted-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" aria-hidden />
            Payment history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cafe">
              <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                <option value="all">All cafes</option>
                {clients.map((client) => (
                  <option key={client.slug} value={client.slug}>
                    {client.name} (/{client.slug})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Month">
              <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                <option value="all">All months</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-start text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Cafe</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">After</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                    <th className="px-3 py-2 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">{formatWhen(payment.createdAt)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{payment.clientName}</p>
                        <p className="text-xs text-muted-foreground">/{payment.clientSlug}</p>
                      </td>
                      <td className="px-3 py-2 font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatMoney(payment.amount, payment.currency)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        paid {formatMoney(payment.amountPaidAfter, payment.currency)}
                        <br />
                        owed {formatMoney(payment.amountOwedAfter, payment.currency)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{payment.note || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{payment.recordedByEmail || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No payments recorded yet. Use <span className="font-medium text-foreground">Add payment</span> on a client’s Billing panel.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
