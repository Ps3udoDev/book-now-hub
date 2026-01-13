// src/providers/tenant-provider.tsx
"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useTenantData } from "@/hooks/supabase/use-tenant";
import type { Tenant, Module } from "@/types";

interface TenantContextValue {
  tenant: Tenant | null;
  modules: Module[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  tenantSlug: string;
  children: ReactNode;
}

export function TenantProvider({ tenantSlug, children }: TenantProviderProps) {
  const { tenant, modules, isLoading, error, mutate } = useTenantData(tenantSlug);

  const refetch = async () => {
    await mutate();
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        modules,
        loading: isLoading,
        error,
        refetch,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return context;
}

// Alias para compatibilidad
export const useTenant = useTenantContext;