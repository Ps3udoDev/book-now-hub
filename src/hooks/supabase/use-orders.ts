// src/hooks/supabase/use-orders.ts
import useSWR from "swr";
import type { OrderStatus, OrderWithItems } from "@/lib/services/orders";
import { ordersService } from "@/lib/services/orders";

/**
 * Comandas propias del especialista (todas)
 */
export function useMyOrders(tenantId: string | null, specialistId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<OrderWithItems[]>(
    tenantId && specialistId
      ? `orders:specialist:${tenantId}:${specialistId}`
      : null,
    () =>
      tenantId && specialistId
        ? ordersService.getOrdersBySpecialist(tenantId, specialistId)
        : [],
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    orders: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  };
}

/**
 * Comandas de una sucursal filtradas por estado (para caja)
 */
export function useOrdersByBranch(
  branchId: string | null,
  status?: OrderStatus | OrderStatus[],
) {
  const statusKey = Array.isArray(status) ? status.join(",") : (status ?? "all");

  const { data, error, isLoading, mutate } = useSWR<OrderWithItems[]>(
    branchId ? `orders:branch:${branchId}:${statusKey}` : null,
    () =>
      branchId ? ordersService.getOrdersByBranch(branchId, status) : [],
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
 * Detalle de una comanda con sus ítems
 */
export function useOrder(orderId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<OrderWithItems | null>(
    orderId ? `order:${orderId}` : null,
    () => (orderId ? ordersService.getOrderById(orderId) : null),
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  return {
    order: data || null,
    isLoading,
    error: error?.message || null,
    mutate,
  };
}
