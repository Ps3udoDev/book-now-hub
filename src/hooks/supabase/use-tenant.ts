// src/hooks/supabase/use-tenants.ts
import useSWR from "swr";
import { tenantsService, TenantWithModules } from "@/lib/services/tenants";
import type { Tenant } from "@/types";

/**
 * Hook para obtener todos los tenants
 */
export function useAllTenants() {
    const { data, error, isLoading, mutate } = useSWR<Tenant[]>(
        "tenants:all",
        () => tenantsService.getAllTenants(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        tenants: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener estadísticas de tenants
 */
export function useTenantsStats() {
    const { data, error, isLoading } = useSWR(
        "tenants:stats",
        () => tenantsService.getTenantsStats(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        stats: data || { total: 0, active: 0, trial: 0, suspended: 0 },
        isLoading,
        error: error?.message || null,
    };
}
/**
 * Hook para obtener datos del tenant con sus módulos usando SWR
 */
export function useTenantData(tenantSlug: string | null) {
    const { data, error, isLoading, mutate } = useSWR<TenantWithModules | null>(
        tenantSlug ? `tenant:${tenantSlug}` : null,
        () => (tenantSlug ? tenantsService.getTenantWithModules(tenantSlug) : null),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        tenant: data?.tenant || null,
        modules: data?.modules || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener solo el tenant (sin módulos)
 */
export function useTenantBySlug(tenantSlug: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Tenant | null>(
        tenantSlug ? `tenant:slug:${tenantSlug}` : null,
        () => (tenantSlug ? tenantsService.getTenantBySlug(tenantSlug) : null),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        tenant: data || null,
        isLoading,
        error: error?.message || null,
        mutate,
    };
}