// src/providers/client-tenant-provider.tsx
// Contexto para la app del cliente final (/c/[tenant]/...).
// Expone el customer del usuario autenticado, el tenant y helpers.
"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useClientProfile } from "@/hooks/supabase/use-client-profile";
import type { Customer } from "@/types";

interface ClientTenantContextValue {
  tenantSlug: string;
  tenantId: string | null;
  tenantName: string | null;
  customer: Customer | null;
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ClientTenantContext = createContext<ClientTenantContextValue | null>(
  null,
);

interface ClientTenantProviderProps {
  tenantSlug: string;
  children: ReactNode;
}

export function ClientTenantProvider({
  tenantSlug,
  children,
}: ClientTenantProviderProps) {
  const { profile, customer, isLoading, error, mutate } =
    useClientProfile(tenantSlug);

  return (
    <ClientTenantContext.Provider
      value={{
        tenantSlug,
        tenantId: profile?.tenant.id ?? null,
        tenantName: profile?.tenant.name ?? null,
        customer,
        userEmail: profile?.user.email ?? null,
        isLoading,
        error,
        refresh: async () => {
          await mutate();
        },
      }}
    >
      {children}
    </ClientTenantContext.Provider>
  );
}

export function useClientTenant() {
  const ctx = useContext(ClientTenantContext);
  if (!ctx) {
    throw new Error(
      "useClientTenant debe usarse dentro de <ClientTenantProvider>",
    );
  }
  return ctx;
}
