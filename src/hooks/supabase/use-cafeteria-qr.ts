import useSWR from "swr";
import {
  type CafeteriaQrWorkstation,
  workstationsService,
} from "@/lib/services/workstations";

export type PublicCafeteriaQrContext = {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  branch_id: string;
  branch_name: string;
  workstation_id: string;
  workstation_name: string;
  workstation_code: string | null;
  station_active: boolean;
  qr_enabled: boolean;
  specialist_id: string | null;
  specialist_name: string | null;
};

export type PublicCafeteriaTracking = {
  id: string;
  order_number: number;
  status: string;
  total: number;
  currency_iso: string;
  created_at: string;
  estimated_ready_at: string | null;
  workstation_name: string | null;
  placed_by_name: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    notes: string | null;
  }>;
};

export function useCafeteriaQrWorkstations(
  tenantId: string | null,
  branchId?: string | null,
) {
  const key = tenantId
    ? `cafeteria-qr-workstations:${tenantId}:${branchId || "all"}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<CafeteriaQrWorkstation[]>(
    key,
    () => (tenantId ? workstationsService.getCafeteriaQrWorkstations(tenantId, branchId) : []),
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    workstations: data || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    mutate,
  };
}

export function usePublicCafeteriaQrContext(
  tenantSlug: string | null,
  qrSlug: string | null,
) {
  const key =
    tenantSlug && qrSlug
      ? `public-cafeteria-qr-context:${tenantSlug}:${qrSlug}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<PublicCafeteriaQrContext | null>(
    key,
    async () => {
      if (!tenantSlug || !qrSlug) {
        return null;
      }

      const res = await fetch(`/api/cafeteria/qr/${tenantSlug}/${qrSlug}/context`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo resolver el contexto del QR");
      }

      return (json.context || null) as PublicCafeteriaQrContext | null;
    },
    { revalidateOnFocus: false, dedupingInterval: 15000 },
  );

  return {
    context: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    mutate,
  };
}

export function usePublicCafeOrderTracking(orderId: string | null) {
  const key = orderId ? `public-cafe-order-tracking:${orderId}` : null;

  const { data, error, isLoading, mutate } = useSWR<PublicCafeteriaTracking | null>(
    key,
    async () => {
      if (!orderId) {
        return null;
      }

      const res = await fetch(`/api/cafeteria/orders/${orderId}/tracking`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo consultar el pedido");
      }

      return (json.order || null) as PublicCafeteriaTracking | null;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 4000,
      refreshInterval: 4000,
    },
  );

  return {
    order: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    mutate,
  };
}
