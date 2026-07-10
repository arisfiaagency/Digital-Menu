"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { clientAdminPath, clientMenuPath, normalizeClientSlug, setActiveClientSlug } from "@/lib/tenant";

type TenantContextValue = {
  clientSlug: string | null;
  adminBasePath: string;
  menuPath: string;
};

const TenantContext = createContext<TenantContextValue>({
  clientSlug: null,
  adminBasePath: "/admin",
  menuPath: "/"
});

export function TenantProvider({ clientSlug, children }: { clientSlug: string | null; children: React.ReactNode }) {
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
      menuPath: normalized ? clientMenuPath(normalized) : "/"
    }),
    [normalized]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
