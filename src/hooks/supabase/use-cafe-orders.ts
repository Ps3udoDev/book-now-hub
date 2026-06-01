// src/hooks/supabase/use-cafe-orders.ts
import useSWR from "swr";
import type {
  CafeOrderFilters,
  CafeOrderWithItems,
} from "@/lib/services/cafe-orders";
import { cafeOrdersService } from "@/lib/services/cafe-orders";

function filtersKey(filters: CafeOrderFilters): string {
  const status = Array.isArray(filters.status)
    ? filters.status.join(",")
    : (filters.status ?? "all");
  return [
    filters.tenant_id ?? "-",
    filters.branch_id ?? "-",
    filters.order_type ?? "-",
    filters.specialist_id ?? "-",
    filters.client_id ?? "-",
    filters.workstation_id ?? "-",
    filters.from ?? "-",
    filters.to ?? "-",
    status,
  ].join(":");
}

/**
 * Listado filtrable de pedidos de cafeteria.
 */
export function useCafeOrders(filters: CafeOrderFilters, enabled = true) {
  const key = enabled ? `cafe-orders:${filtersKey(filters)}` : null;

  const { data, error, isLoading, mutate } = useSWR<CafeOrderWithItems[]>(
    key,
    () => cafeOrdersService.list(filters),
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  return {
    orders: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Tablero del dia (para cocina/barra). Ideal combinar con Realtime.
 */
export function useCafeOrdersBoard(branchId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CafeOrderWithItems[]>(
    branchId ? `cafe-orders:board:${branchId}` : null,
    () => (branchId ? cafeOrdersService.getTodayBoard(branchId) : []),
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );

  return {
    orders: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Detalle de un pedido.
 */
export function useCafeOrder(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CafeOrderWithItems | null>(
    id ? `cafe-order:${id}` : null,
    () => (id ? cafeOrdersService.getById(id) : null),
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  return {
    order: data || null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
