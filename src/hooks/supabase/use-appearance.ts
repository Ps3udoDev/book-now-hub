// src/hooks/supabase/use-appearance.ts
import useSWR from "swr";
import { appearanceService } from "@/lib/services/appearance";
import type { Theme } from "@/types";

/**
 * Hook para obtener todos los temas disponibles
 */
export function useThemes() {
  const { data, error, isLoading, mutate } = useSWR<Theme[]>(
    "themes:all",
    () => appearanceService.getThemes(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  return {
    themes: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Hook para obtener la configuración de tema del tenant
 */
export function useTenantTheme(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantId ? `tenant:theme:${tenantId}` : null,
    () => (tenantId ? appearanceService.getTenantTheme(tenantId) : null),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  return {
    themeId: data?.theme_id || null,
    customTheme: data?.custom_theme || null,
    theme: data?.theme || null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
