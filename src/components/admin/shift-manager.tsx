"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, DoorClosed, DoorOpen, History, Receipt, Scale, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { adminErrorText, useAdminLocale } from "@/components/admin/admin-preferences";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { closeCashShift, getAdminAppData, getOpenShift, getPosState, listShifts, openCashShift } from "@/lib/firebase/firestore";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CashShift, Currency, PosCompletedOrder } from "@/types/models";

export function ShiftManager() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  const actorName = auth.profile?.displayName || auth.profile?.username || auth.user?.email || "";
  const actorUid = auth.user?.uid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<Currency>("IQD");
  const [openShift, setOpenShift] = useState<CashShift | null>(null);
  const [history, setHistory] = useState<CashShift[]>([]);
  const [orders, setOrders] = useState<PosCompletedOrder[]>([]);

  const [openingCash, setOpeningCash] = useState("");
  const [openNote, setOpenNote] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closeNote, setCloseNote] = useState("");

  async function refresh() {
    const [data, pos, open, shifts] = await Promise.all([
      getAdminAppData(),
      getPosState(),
      getOpenShift(),
      listShifts(80)
    ]);
    setCurrency(data.general.defaultCurrency);
    setOrders(pos.completedOrders || []);
    setOpenShift(open);
    setHistory(shifts.filter((shift) => shift.status === "closed"));
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err instanceof Error ? err.message : text.settingsSaveFailed))
      .finally(() => setLoading(false));
  }, [text.settingsSaveFailed]);

  const live = useMemo(() => {
    if (!openShift) return null;
    const now = new Date().toISOString();
    const shiftOrders = orders.filter((order) => {
      if (order.status === "cancelled") return false;
      if (order.shiftId === openShift.id) return true;
      if (order.shiftId) return false;
      return order.completedAt >= openShift.openedAt && order.completedAt <= now;
    });
    const salesTotal = shiftOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    return {
      ordersCount: shiftOrders.length,
      salesTotal,
      expectedCash: openShift.openingCash + salesTotal
    };
  }, [openShift, orders]);

  async function handleOpen(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const amount = Math.round(Number(openingCash));
    if (!Number.isFinite(amount) || amount < 0) {
      setError(text.shiftOpeningCashRequired);
      return;
    }
    setSaving(true);
    try {
      await openCashShift({
        openingCash: amount,
        currency,
        openedBy: actorName || undefined,
        openedByUid: actorUid,
        note: openNote.trim() || undefined
      });
      setOpeningCash("");
      setOpenNote("");
      await refresh();
      setMessage(text.shiftOpened);
    } catch (err) {
      setError(adminErrorText(err instanceof Error ? err.message : text.settingsSaveFailed, text) || text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const amount = Math.round(Number(closingCash));
    if (!Number.isFinite(amount) || amount < 0) {
      setError(text.shiftClosingCashRequired);
      return;
    }
    setSaving(true);
    try {
      await closeCashShift({
        closingCashCounted: amount,
        closedBy: actorName || undefined,
        closedByUid: actorUid,
        closeNote: closeNote.trim() || undefined
      });
      setClosingCash("");
      setCloseNote("");
      await refresh();
      setMessage(text.shiftClosed);
    } catch (err) {
      setError(adminErrorText(err instanceof Error ? err.message : text.settingsSaveFailed, text) || text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={textDir}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{text.shift}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{text.shiftDesc}</p>
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {openShift && live ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DoorOpen className="h-5 w-5 text-primary" aria-hidden />
                {text.shiftOpenNow}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {text.shiftOpenedAt}: {formatDateTime(openShift.openedAt, locale)}
                {openShift.openedBy ? ` · ${openShift.openedBy}` : ""}
              </p>
            </div>
            <Badge className="bg-primary/15 text-primary">{text.shiftStatusOpen}</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Wallet} label={text.shiftOpeningCash} value={formatMoney(openShift.openingCash, currency, locale)} />
              <Stat icon={Receipt} label={text.shiftSales} value={formatMoney(live.salesTotal, currency, locale)} hint={`${live.ordersCount} ${text.ordersCount}`} />
              <Stat icon={Scale} label={text.shiftExpectedCash} value={formatMoney(live.expectedCash, currency, locale)} />
              <Stat icon={Clock3} label={text.shiftDuration} value={formatDuration(openShift.openedAt, text)} />
            </div>

            <form onSubmit={handleClose} className="space-y-4 rounded-xl border bg-muted/20 p-4">
              <h2 className="font-medium">{text.shiftCloseTitle}</h2>
              <p className="text-sm text-muted-foreground">{text.shiftCloseHint}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={text.shiftClosingCash}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={closingCash}
                    onChange={(event) => setClosingCash(event.target.value)}
                    placeholder={String(live.expectedCash)}
                    required
                  />
                </Field>
                <Field label={text.note}>
                  <Textarea value={closeNote} onChange={(event) => setCloseNote(event.target.value)} rows={2} />
                </Field>
              </div>
              {closingCash !== "" && Number.isFinite(Number(closingCash)) ? (
                <p className={cn("text-sm font-medium", Math.round(Number(closingCash)) - live.expectedCash === 0 ? "text-primary" : "text-amber-700 dark:text-amber-400")}>
                  {text.shiftVariance}: {formatMoney(Math.round(Number(closingCash)) - live.expectedCash, currency, locale)}
                </p>
              ) : null}
              <Button type="submit" disabled={saving} variant="destructive">
                <DoorClosed className="h-4 w-4" aria-hidden />
                {saving ? text.saving : text.shiftClose}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DoorOpen className="h-5 w-5" aria-hidden />
              {text.shiftOpenTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOpen} className="space-y-4">
              <p className="text-sm text-muted-foreground">{text.shiftOpenHint}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={text.shiftOpeningCash}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={openingCash}
                    onChange={(event) => setOpeningCash(event.target.value)}
                    placeholder="0"
                    required
                  />
                </Field>
                <Field label={text.note}>
                  <Textarea value={openNote} onChange={(event) => setOpenNote(event.target.value)} rows={2} />
                </Field>
              </div>
              <Button type="submit" disabled={saving}>
                <DoorOpen className="h-4 w-4" aria-hidden />
                {saving ? text.saving : text.shiftOpen}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" aria-hidden />
            {text.shiftHistory}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!history.length ? (
            <p className="text-sm text-muted-foreground">{text.shiftNoHistory}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
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
                  </tr>
                </thead>
                <tbody>
                  {history.map((shift) => (
                    <tr key={shift.id} className="border-b last:border-0">
                      <td className="px-2 py-2.5">{formatDateTime(shift.openedAt, locale)}</td>
                      <td className="px-2 py-2.5">{shift.closedAt ? formatDateTime(shift.closedAt, locale) : "—"}</td>
                      <td className="px-2 py-2.5">{formatMoney(shift.openingCash, shift.currency, locale)}</td>
                      <td className="px-2 py-2.5">
                        {formatMoney(shift.salesTotal || 0, shift.currency, locale)}
                        <span className="ms-1 text-muted-foreground">({shift.ordersCount || 0})</span>
                      </td>
                      <td className="px-2 py-2.5">{formatMoney(shift.expectedCash || 0, shift.currency, locale)}</td>
                      <td className="px-2 py-2.5">{formatMoney(shift.closingCashCounted || 0, shift.currency, locale)}</td>
                      <td className={cn("px-2 py-2.5 font-medium", (shift.variance || 0) === 0 ? "text-primary" : "text-amber-700 dark:text-amber-400")}>
                        {formatMoney(shift.variance || 0, shift.currency, locale)}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {[shift.openedBy, shift.closedBy].filter(Boolean).join(" → ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function formatDateTime(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "ckb" ? "ku" : locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDuration(openedAt: string, text: Record<string, string>) {
  const ms = Date.now() - new Date(openedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}${text.shiftMinutesShort}`;
  return `${hours}${text.shiftHoursShort} ${minutes}${text.shiftMinutesShort}`;
}
