"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { clientAdminPath, normalizeClientSlug, setActiveClientSlug } from "@/lib/tenant";

type TenantContextValue = {
  clientSlug: string | null;
  adminBasePath: string;
  /** Whether this cafe's admin may see the QR-code page (platform-controlled). */
  qrEnabled: boolean;
};

const TenantContext = createContext<TenantContextValue>({
  clientSlug: null,
  adminBasePath: "/admin",
  qrEnabled: true
});

export function TenantProvider({
  clientSlug,
  qrEnabled = true,
  children
}: {
  clientSlug: string | null;
  qrEnabled?: boolean;
  children: React.ReactNode;
}) {
  const normalized = clientSlug ? normalizeClientSlug(clientSlug) : null;
  setActiveClientSlug(normalized);

  useEffect(() => {
    setActiveClientSlug(normalized);
    return () => setActiveClientSlug(null);
  }, [normalized]);

  const value = useMemo<TenantContextValue>(
    () => ({
      clientSlug: normalized,
      adminBasePath: normalized ? clientAdminPath(normalized) : "/admin",
      qrEnabled
    }),
    [normalized, qrEnabled]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
