// src/hooks/supabase/use-branches.ts
import useSWR from "swr";
import { branchesService } from "@/lib/services/branches";
import type { Tables } from "@/types";

type Branch = Tables["branches"]["Row"];

/**
 * Hook para obtener todas las sucursales de un tenant
 */
export function useBranches(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Branch[]>(
        tenantId ? `branches:tenant:${tenantId}` : null,
        () => (tenantId ? branchesService.getBranchesByTenant(tenantId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        branches: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener sucursales activas de un tenant
 */
export function useActiveBranches(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Branch[]>(
        tenantId ? `branches:active:${tenantId}` : null,
        () => (tenantId ? branchesService.getActiveBranches(tenantId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        branches: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener una sucursal por ID
 */
export function useBranch(branchId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Branch | null>(
        branchId ? `branch:${branchId}` : null,
        () => (branchId ? branchesService.getBranchById(branchId) : null),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        branch: data || null,
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener la sucursal principal de un tenant
 */
export function useMainBranch(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Branch | null>(
        tenantId ? `branch:main:${tenantId}` : null,
        () => (tenantId ? branchesService.getMainBranch(tenantId) : null),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        branch: data || null,
        isLoading,
        error: error?.message || null,
        mutate,
    };
}
