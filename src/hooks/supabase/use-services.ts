// src/hooks/supabase/use-services.ts
import useSWR from "swr";
import { servicesService, type ServiceWithVariants } from "@/lib/services/services";
import type { Service, ServiceVariant } from "@/types";

/**
 * Hook para obtener todos los servicios de un tenant
 */
export function useServices(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Service[]>(
        tenantId ? `services:tenant:${tenantId}` : null,
        () => (tenantId ? servicesService.getServicesByTenant(tenantId) : []),
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
 * Hook para obtener servicios activos (para clientes/booking)
 */
export function useActiveServices(tenantId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Service[]>(
        tenantId ? `services:active:${tenantId}` : null,
        () => (tenantId ? servicesService.getActiveServices(tenantId) : []),
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
 * Hook para obtener un servicio por ID con variantes
 */
export function useService(serviceId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<ServiceWithVariants | null>(
        serviceId ? `service:${serviceId}` : null,
        () => (serviceId ? servicesService.getServiceById(serviceId) : null),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        service: data || null,
        variants: data?.variants || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener servicios por categoría
 */
export function useServicesByCategory(tenantId: string | null, category: string | null) {
    const { data, error, isLoading, mutate } = useSWR<Service[]>(
        tenantId && category ? `services:category:${tenantId}:${category}` : null,
        () =>
            tenantId && category
                ? servicesService.getServicesByCategory(tenantId, category as "hair" | "nails" | "skin" | "makeup" | "spa" | "barber" | "other")
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
 * Hook para obtener variantes de un servicio
 */
export function useServiceVariants(serviceId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<ServiceVariant[]>(
        serviceId ? `variants:${serviceId}` : null,
        () => (serviceId ? servicesService.getVariantsByService(serviceId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    return {
        variants: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener categorías únicas
 */
export function useServiceCategories(tenantId: string | null) {
    const { data, error, isLoading } = useSWR<string[]>(
        tenantId ? `services:categories:${tenantId}` : null,
        () => (tenantId ? servicesService.getCategories(tenantId) : []),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        categories: data || [],
        isLoading,
        error: error?.message || null,
    };
}

/**
 * Hook para obtener estadísticas de servicios
 */
export function useServicesStats(tenantId: string | null) {
    const { data, error, isLoading } = useSWR(
        tenantId ? `services:stats:${tenantId}` : null,
        () =>
            tenantId
                ? servicesService.countServices(tenantId)
                : { total: 0, active: 0, featured: 0 },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        stats: data || { total: 0, active: 0, featured: 0 },
        isLoading,
        error: error?.message || null,
    };
}