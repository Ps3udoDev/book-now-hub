// src/hooks/supabase/use-specialists.ts
import useSWR from "swr";
import {
    specialistsService,
    type SpecialistWithServices,
    type SpecialistStats,
} from "@/lib/services/specialists";
import type { Tables } from "@/types";

type Profile = Tables["profiles"]["Row"];
type SpecialistService = Tables["specialist_services"]["Row"];
type Service = Tables["services"]["Row"];

/**
 * Hook para obtener todos los especialistas de un tenant
 */
export function useSpecialists(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Profile[]>(
        tenantId ? `specialists:tenant:${tenantId}` : null,
        () => (tenantId ? specialistsService.getSpecialistsByTenant(tenantId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        specialists: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener especialistas activos
 */
export function useActiveSpecialists(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Profile[]>(
        tenantId ? `specialists:active:${tenantId}` : null,
        () => (tenantId ? specialistsService.getActiveSpecialists(tenantId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        specialists: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener especialistas por sucursal
 */
export function useSpecialistsByBranch(
    tenantId: string | null,
    branchId: string | null
) {
    const { data, error, isLoading, mutate } = useSWR<Profile[]>(
        tenantId && branchId
            ? `specialists:branch:${tenantId}:${branchId}`
            : null,
        () =>
            tenantId && branchId
                ? specialistsService.getSpecialistsByBranch(tenantId, branchId)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        specialists: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener un especialista por ID con sus servicios
 */
export function useSpecialist(specialistId: string | null) {
    const { data, error, isLoading, mutate } =
        useSWR<SpecialistWithServices | null>(
            specialistId ? `specialist:${specialistId}` : null,
            () =>
                specialistId
                    ? specialistsService.getSpecialistById(specialistId)
                    : null,
            {
                revalidateOnFocus: false,
                dedupingInterval: 30000,
            }
        );

    return {
        specialist: data || null,
        services: data?.specialist_services || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener especialistas que pueden realizar un servicio
 */
export function useSpecialistsForService(
    tenantId: string | null,
    serviceId: string | null
) {
    const { data, error, isLoading } = useSWR<Profile[]>(
        tenantId && serviceId
            ? `specialists:service:${tenantId}:${serviceId}`
            : null,
        () =>
            tenantId && serviceId
                ? specialistsService.getSpecialistsForService(tenantId, serviceId)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        specialists: data || [],
        isLoading,
        error: error?.message || null,
    };
}

/**
 * Hook para obtener servicios asignados a un especialista
 */
export function useSpecialistServices(specialistId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<
        (SpecialistService & { service: Service })[]
    >(
        specialistId ? `specialist:services:${specialistId}` : null,
        () =>
            specialistId
                ? specialistsService.getSpecialistServices(specialistId)
                : [],
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        services: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener estadísticas de especialistas
 */
export function useSpecialistStats(tenantId: string | null) {
    const { data, error, isLoading } = useSWR<SpecialistStats>(
        tenantId ? `specialists:stats:${tenantId}` : null,
        () =>
            tenantId
                ? specialistsService.getSpecialistStats(tenantId)
                : { total: 0, active: 0, byBranch: {} },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        stats: data || { total: 0, active: 0, byBranch: {} },
        isLoading,
        error: error?.message || null,
    };
}