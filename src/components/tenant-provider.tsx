"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { clientAdminPath, normalizeClientSlug, setActiveClientSlug } from "@/lib/tenant";

type TenantContextValue = {
  clientSlug: string | null;
  adminBasePath: string;
  /** Whether this cafe's admin may see the QR-code page (platform-controlled). */
  qrEnabled: boolean;
  /** Whether ratings are on — gates the public "Rate us" button AND the admin Reviews tab. */
  ratingEnabled: boolean;
  /** Whether this cafe's admin may see the Activity log (platform-controlled). */
  auditEnabled: boolean;
};

const TenantContext = createContext<TenantContextValue>({
  clientSlug: null,
  adminBasePath: "/admin",
  qrEnabled: true,
  ratingEnabled: true,
  auditEnabled: true
});

export function TenantProvider({
  clientSlug,
  qrEnabled = true,
  ratingEnabled = true,
  auditEnabled = true,
  children
}: {
  clientSlug: string | null;
  qrEnabled?: boolean;
  ratingEnabled?: boolean;
  auditEnabled?: boolean;
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
      qrEnabled,
      ratingEnabled,
      auditEnabled
    }),
    [normalized, qrEnabled, ratingEnabled, auditEnabled]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
