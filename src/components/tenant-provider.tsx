"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { clientAdminPath, clientPublicPath, normalizeClientSlug, setActiveClientSlug } from "@/lib/tenant";

type TenantContextValue = {
  clientSlug: string | null;
  adminBasePath: string;
  publicPath: string;
};

const TenantContext = createContext<TenantContextValue>({
  clientSlug: null,
  adminBasePath: "/admin",
  publicPath: "/"
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
      publicPath: normalized ? clientPublicPath(normalized) : "/"
    }),
    [normalized]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
