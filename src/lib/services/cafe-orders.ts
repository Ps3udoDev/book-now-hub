// src/lib/services/cafe-orders.ts
// Pedidos de cafeteria: lectura via browser client, escrituras via API routes.
import { createBrowserSB } from "@/lib/supabase/client";
import type {
  CafeOrder,
  CafeOrderItem,
  CafeOrderStatus,
  CafeOrderType,
} from "@/types";

export interface CafeOrderItemInput {
  menu_item_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
}

export interface CafeOrderWithItems extends CafeOrder {
  items: CafeOrderItem[];
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
  } | null;
  specialist?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  workstation?: {
    id: string;
    name: string;
    code: string | null;
    cafeteria_qr_slug: string | null;
  } | null;
}

export interface CafeOrderFilters {
  branch_id?: string;
  tenant_id?: string;
  status?: CafeOrderStatus | CafeOrderStatus[];
  order_type?: CafeOrderType;
  specialist_id?: string;
  client_id?: string;
  workstation_id?: string;
  from?: string; // ISO date yyyy-mm-dd
  to?: string;
}

export interface CreateCafeOrderData {
  tenant_id: string;
  branch_id: string;
  order_type: CafeOrderType;
  client_id?: string | null;
  specialist_id?: string | null;
  workstation_id?: string | null;
  currency_iso?: string;
  notes?: string | null;
  charge_to_commissions?: boolean;
  source?: "internal" | "workstation_qr";
  placed_by_name?: string | null;
  placed_by_email?: string | null;
  estimated_ready_at?: string | null;
  items: CafeOrderItemInput[];
}

const CAFE_ORDER_WITH_RELATIONS = `
  *,
  items:cafe_order_items(*),
  client:customers!cafe_orders_client_id_fkey(id, first_name, last_name, full_name),
  specialist:profiles!cafe_orders_specialist_id_fkey(id, full_name, avatar_url),
  workstation:workstations(id, name, code, cafeteria_qr_slug)
` as const;

class CafeOrdersService {
  private supabase = createBrowserSB();

  // ==================== QUERIES ====================

  async list(filters: CafeOrderFilters): Promise<CafeOrderWithItems[]> {
    let query = this.supabase
      .from("cafe_orders")
      .select(CAFE_ORDER_WITH_RELATIONS)
      .order("created_at", { ascending: false });

    if (filters.tenant_id) query = query.eq("tenant_id", filters.tenant_id);
    if (filters.branch_id) query = query.eq("branch_id", filters.branch_id);
    if (filters.order_type) query = query.eq("order_type", filters.order_type);
    if (filters.specialist_id)
      query = query.eq("specialist_id", filters.specialist_id);
    if (filters.client_id) query = query.eq("client_id", filters.client_id);
    if (filters.workstation_id) {
      query = query.eq("workstation_id", filters.workstation_id);
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in("status", filters.status);
      } else {
        query = query.eq("status", filters.status);
      }
    }
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);

    const { data, error } = await query;
    if (error) throw new Error(`Error al obtener pedidos: ${error.message}`);
    return (data as unknown as CafeOrderWithItems[]) || [];
  }

  // Pedidos del dia agrupables por estado (para el tablero Kanban)
  async getTodayBoard(branchId: string): Promise<CafeOrderWithItems[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from("cafe_orders")
      .select(CAFE_ORDER_WITH_RELATIONS)
      .eq("branch_id", branchId)
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Error al obtener tablero: ${error.message}`);
    return (data as unknown as CafeOrderWithItems[]) || [];
  }

  async getById(id: string): Promise<CafeOrderWithItems | null> {
    const { data, error } = await this.supabase
      .from("cafe_orders")
      .select(CAFE_ORDER_WITH_RELATIONS)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Error al obtener pedido: ${error.message}`);
    }
    return data as unknown as CafeOrderWithItems;
  }

  // ==================== MUTATIONS (via API) ====================

  async create(data: CreateCafeOrderData): Promise<CafeOrderWithItems> {
    const res = await fetch("/api/cafe/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al crear pedido");
    return json.order;
  }

  async updateStatus(
    id: string,
    status: CafeOrderStatus,
  ): Promise<CafeOrderWithItems> {
    const res = await fetch(`/api/cafe/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al actualizar estado");
    return json.order;
  }

  // ==================== HELPERS ====================

  getStatusLabel(status: CafeOrderStatus): string {
    const labels: Record<CafeOrderStatus, string> = {
      pending: "Pendiente",
      preparing: "Preparando",
      ready: "Listo",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };
    return labels[status];
  }

  getStatusColor(status: CafeOrderStatus): string {
    const colors: Record<CafeOrderStatus, string> = {
      pending: "text-amber-600",
      preparing: "text-blue-600",
      ready: "text-emerald-600",
      delivered: "text-muted-foreground",
      cancelled: "text-destructive",
    };
    return colors[status];
  }

  // Tiempo transcurrido desde creacion en minutos
  getElapsedMinutes(createdAt: string): number {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - created) / 60000);
  }

  // Estados que se consideran "en cocina" (activos en el tablero)
  getActiveStatuses(): CafeOrderStatus[] {
    return ["pending", "preparing", "ready"];
  }
}

export const cafeOrdersService = new CafeOrdersService();
