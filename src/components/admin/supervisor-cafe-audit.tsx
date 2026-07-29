"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuditLogManager } from "@/components/admin/audit-manager";
import { AdminLanguageToggle, AdminThemeToggle, useAdminLocale } from "@/components/admin/admin-preferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { hasFirebaseClientConfig } from "@/lib/firebase/client";
import { getClient } from "@/lib/firebase/firestore";
import { normalizeClientSlug } from "@/lib/tenant";
import type { ClientAccount } from "@/types/models";

/** Platform supervisor view of one cafe's activity log. */
export function SupervisorCafeAudit({ slug }: { slug: string }) {
  const auth = useAdminAuth();
  const { text } = useAdminLocale();
  const clientSlug = normalizeClientSlug(slug);
  const [client, setClient] = useState<ClientAccount | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.isAdmin || !clientSlug) return;
    getClient(clientSlug)
      .then((row) => setClient(row))
      .catch((err) => {
        setClient(null);
        setError(err instanceof Error ? err.message : "Could not load cafe.");
      });
  }, [auth.isAdmin, clientSlug]);

  if (!hasFirebaseClientConfig()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-xl">
          <CardContent className="space-y-4 pt-5">
            <h1 className="text-2xl font-semibold">Firebase is not configured</h1>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (auth.loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </main>
    );
  }

  if (!auth.user || !auth.isAdmin || auth.role === "employee") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-5 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold">Supervisor Admin</h1>
            <p className="text-muted-foreground">Sign in with a platform supervisor account to view cafe activity.</p>
            <Button asChild>
              <Link href="/admin/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (client === undefined) {
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </main>
    );
  }

  if (!client) {
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <AdminLanguageToggle />
          <AdminThemeToggle />
        </div>
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h1 className="text-2xl font-semibold">{text.cafeNotFound}</h1>
            <p className="text-muted-foreground">{error || `No cafe found for /${clientSlug}.`}</p>
            <Button asChild variant="outline">
              <Link href="/admin/clients">{text.backToClients}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <div className="flex justify-end gap-2">
          <AdminLanguageToggle />
          <AdminThemeToggle />
        </div>
        <AuditLogManager clientSlug={client.slug} cafeName={client.name} viewer="platform" />
      </div>
    </main>
  );
}
