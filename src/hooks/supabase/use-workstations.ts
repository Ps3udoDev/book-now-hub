// src/hooks/supabase/use-workstations.ts
import useSWR from "swr";
import { workstationsService } from "@/lib/services/workstations";
import type { Tables } from "@/types";

type Workstation = Tables["workstations"]["Row"];

/**
 * Hook para obtener todas las estaciones de un tenant
 */
export function useWorkstations(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Workstation[]>(
        tenantId ? `workstations:tenant:${tenantId}` : null,
        () => (tenantId ? workstationsService.getWorkstationsByTenant(tenantId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        workstations: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener estaciones por sucursal
 */
export function useWorkstationsByBranch(branchId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Workstation[]>(
        branchId ? `workstations:branch:${branchId}` : null,
        () => (branchId ? workstationsService.getWorkstationsByBranch(branchId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        workstations: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener estaciones activas por sucursal
 */
export function useActiveWorkstationsByBranch(branchId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Workstation[]>(
        branchId ? `workstations:active:${branchId}` : null,
        () => (branchId ? workstationsService.getActiveWorkstationsByBranch(branchId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        workstations: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener una estación por ID
 */
export function useWorkstation(workstationId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Workstation | null>(
        workstationId ? `workstation:${workstationId}` : null,
        () => (workstationId ? workstationsService.getWorkstationById(workstationId) : null),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        workstation: data || null,
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener estadísticas de estaciones
 */
export function useWorkstationStats(tenantId: string | null) {
    const { data, error, isLoading } = useSWR(
        tenantId ? `workstations:stats:${tenantId}` : null,
        () => (tenantId ? workstationsService.getStats(tenantId) : null),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        stats: data || { total: 0, active: 0, byType: {} },
        isLoading,
        error: error?.message || null,
    };
}