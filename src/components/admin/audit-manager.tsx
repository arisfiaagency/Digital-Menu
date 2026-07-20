"use client";

import { useEffect, useMemo, useState } from "react";
import { History, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLocale } from "@/components/admin/admin-preferences";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { listAuditLogs } from "@/lib/firebase/audit";
import { humanizeAuditField, humanizeAuditValue } from "@/lib/utils/audit-labels";
import { cn } from "@/lib/utils/cn";
import { normalizeSearch } from "@/lib/utils/format";
import type { AuditLog, Locale } from "@/types/models";

const ACTION_KEYS: Record<string, string> = {
  create: "auditCreate",
  update: "auditUpdate",
  delete: "auditDelete",
  activate: "auditActivate",
  deactivate: "auditDeactivate",
  availability: "auditAvailability",
  reorder: "auditReorder",
  cancel: "auditCancel",
  complete: "auditComplete"
};

const ENTITY_KEYS: Record<string, string> = {
  category: "auditEntCategory",
  menuItem: "auditEntItem",
  expense: "auditEntExpense",
  order: "auditEntOrder",
  settings: "auditEntSettings",
  user: "auditEntUser"
};

const DESTRUCTIVE_ACTIONS = new Set(["delete", "cancel"]);
const POSITIVE_ACTIONS = new Set(["create", "complete", "activate"]);

export function AuditLogManager() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");

  const isMainAdmin = !auth.loading && auth.isMainAdmin;

  async function load() {
    setRefreshing(true);
    setError("");
    try {
      setLogs(await listAuditLogs(400));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isMainAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMainAdmin]);

  const actors = useMemo(() => {
    const names = new Set<string>();
    for (const log of logs || []) {
      const name = log.actorName || log.actorEmail;
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    return (logs || []).filter((log) => {
      if (entityFilter !== "all" && log.entity !== entityFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      const actorName = log.actorName || log.actorEmail || "";
      if (actorFilter !== "all" && actorName !== actorFilter) return false;
      if (!needle) return true;
      const haystack = [log.label, log.summary, actorName, log.entityId, ...(log.changes || []).flatMap((c) => [c.field, c.before, c.after])]
        .filter(Boolean)
        .join(" ");
      return normalizeSearch(haystack).includes(needle);
    });
  }, [logs, query, entityFilter, actionFilter, actorFilter]);

  if (!auth.loading && !isMainAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/15 p-10 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">{text.noAccessTitle}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{text.noAccessDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold">
            <History className="h-7 w-7 text-primary" aria-hidden />
            {text.auditLog}
          </h1>
          <p className="text-muted-foreground">{text.auditLogDescription}</p>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
          {text.auditRefresh}
        </Button>
      </div>

      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_180px]">
        <Input placeholder={text.auditSearchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} aria-label={text.auditType}>
          <option value="all">{text.all}</option>
          {Object.entries(ENTITY_KEYS).map(([value, key]) => (
            <option key={value} value={value}>{text[key]}</option>
          ))}
        </Select>
        <Select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label={text.auditActionLabel}>
          <option value="all">{text.all}</option>
          {Object.entries(ACTION_KEYS).map(([value, key]) => (
            <option key={value} value={value}>{text[key]}</option>
          ))}
        </Select>
        <Select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} aria-label={text.auditStaff}>
          <option value="all">{text.auditStaff}: {text.all}</option>
          {actors.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3">
        {!logs ? (
          Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-[72px] w-full rounded-xl" />)
        ) : filtered.length ? (
          filtered.map((log) => <AuditRow key={log.id} log={log} text={text} textDir={textDir} locale={locale} />)
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/15 p-10 text-center">
            <History className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">{text.auditNoLogs}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AuditRow({ log, text, textDir, locale }: { log: AuditLog; text: Record<string, string>; textDir: "ltr" | "rtl"; locale: string }) {
  const actionLabel = text[ACTION_KEYS[log.action]] || log.action;
  const entityLabel = text[ENTITY_KEYS[log.entity]] || log.entity;
  const actor = log.actorName || log.actorEmail || text.auditSystem;
  const tone = DESTRUCTIVE_ACTIONS.has(log.action)
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : POSITIVE_ACTIONS.has(log.action)
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={tone}>{actionLabel}</Badge>
            <span className="text-xs font-medium text-muted-foreground">{entityLabel}</span>
            {log.label ? <span className="font-semibold">«{log.label}»</span> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{actor}</span>
            {log.summary ? <span> · {log.summary}</span> : null}
          </p>
        </div>
        <time className="shrink-0 text-xs text-muted-foreground" dir="ltr">{formatWhen(log.at, locale)}</time>
      </div>
      {log.changes && log.changes.length ? (
        <div className="mt-3 grid gap-1.5 rounded-lg border bg-muted/20 p-3">
          {log.changes.map((change, index) => (
            <div key={`${change.field}-${index}`} dir={textDir} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
              <span className="font-medium text-foreground">{humanizeAuditField(change.field, locale as Locale)}:</span>
              <span className="text-muted-foreground line-through" dir="auto">
                {change.before ? humanizeAuditValue(change.before, locale as Locale) : text.auditNoValue}
              </span>
              <span aria-hidden className="text-muted-foreground">→</span>
              <span className="text-foreground" dir="auto">
                {change.after ? humanizeAuditValue(change.after, locale as Locale) : text.auditNoValue}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function formatWhen(iso: string | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const intlLocale = locale === "ckb" ? "ckb-IQ" : locale === "ar" ? "ar-IQ" : "en-GB";
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
