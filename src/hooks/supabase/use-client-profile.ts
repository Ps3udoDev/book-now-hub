// src/hooks/supabase/use-client-profile.ts
// Hooks SWR para la app del cliente final (consumen /api/client/*).
import useSWR from "swr";
import {
  type ClientFavoriteWithEntity,
  type ClientHistoryDetail,
  type ClientHistoryFilters,
  type ClientHistoryResponse,
  type ClientProfileResponse,
  clientProfileService,
} from "@/lib/services/client-profile";
import type { CustomerDashboard } from "@/types";

/**
 * Hook del perfil del cliente autenticado en el tenant indicado.
 */
export function useClientProfile(tenantSlug: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ClientProfileResponse>(
    tenantSlug ? `client:profile:${tenantSlug}` : null,
    () => clientProfileService.getProfile(tenantSlug as string),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  return {
    profile: data ?? null,
    customer: data?.customer ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/**
 * Dashboard consolidado: proxima cita, ultimas 5 citas, gasto total,
 * top servicios, conteo de favoritos.
 */
export function useClientDashboard(tenantSlug: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{
    dashboard: CustomerDashboard | null;
    favorites_count: number;
  }>(
    tenantSlug ? `client:dashboard:${tenantSlug}` : null,
    () => clientProfileService.getDashboard(tenantSlug as string),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  return {
    dashboard: data?.dashboard ?? null,
    favoritesCount: data?.favorites_count ?? 0,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/**
 * Historial completo de citas con paginacion y filtros.
 */
export function useClientHistory(
  tenantSlug: string | null,
  filters: ClientHistoryFilters = {},
) {
  const filterKey = JSON.stringify(filters);
  const { data, error, isLoading, mutate } = useSWR<ClientHistoryResponse>(
    tenantSlug ? `client:history:${tenantSlug}:${filterKey}` : null,
    () => clientProfileService.getHistory(tenantSlug as string, filters),
    { revalidateOnFocus: false, dedupingInterval: 15_000 },
  );

  return {
    appointments: data?.appointments ?? [],
    pagination: data?.pagination ?? {
      page: 1,
      page_size: filters.pageSize ?? 20,
      total: 0,
      total_pages: 0,
    },
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/**
 * Detalle de una cita del historial del cliente.
 */
export function useClientHistoryDetail(
  tenantSlug: string | null,
  appointmentId: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR<{
    appointment: ClientHistoryDetail;
  }>(
    tenantSlug && appointmentId
      ? `client:history:${tenantSlug}:detail:${appointmentId}`
      : null,
    () =>
      clientProfileService.getHistoryDetail(
        tenantSlug as string,
        appointmentId as string,
      ),
    { revalidateOnFocus: false, dedupingInterval: 15_000 },
  );

  return {
    appointment: data?.appointment ?? null,
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}

/**
 * Favoritos del cliente con entidad referenciada hidratada.
 */
export function useClientFavorites(tenantSlug: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{
    favorites: ClientFavoriteWithEntity[];
  }>(
    tenantSlug ? `client:favorites:${tenantSlug}` : null,
    () => clientProfileService.getFavorites(tenantSlug as string),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  return {
    favorites: data?.favorites ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
