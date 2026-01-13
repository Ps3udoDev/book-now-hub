import useSWR from "swr";
import { modulesService } from "@/lib/services/modules";
import type { Module } from "@/types";

/**
 * Hook para obtener módulos activos con SWR
 */
export function useActiveModules() {
    const { data, error, isLoading, mutate } = useSWR<Module[]>(
        "modules:active",
        () => modulesService.getActiveModules(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minuto
        }
    );

    return {
        modules: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * Hook para obtener módulos core con SWR
 */
export function useCoreModules() {
    const { data, error, isLoading, mutate } = useSWR<Module[]>(
        "modules:core",
        () => modulesService.getCoreModules(),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        modules: data || [],
        isLoading,
        error: error?.message || null,
        mutate,
    };
}
