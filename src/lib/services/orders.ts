// src/lib/services/orders.ts
// Regenerar tipos con `npm run db:types` tras aplicar la migración de tarea 2
import { createBrowserSB } from "@/lib/supabase/client";

export type OrderStatus = "draft" | "sent" | "paid" | "cancelled";
export type OrderItemType = "service" | "product" | "cafeteria";

export interface Order {
  id: string;
  tenant_id: string;
  branch_id: string;
  appointment_id: string | null;
  customer_id: string | null;
  specialist_id: string;
  status: OrderStatus;
  currency_code: string;
  total: number;
  notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  type: OrderItemType;
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  currency_code: string;
  subtotal: number;
  notes: string | null;
  buyer_type: string;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  // Datos denormalizados para mostrar en UI (via join)
  specialist?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
}

export interface CreateOrderData {
  tenant_id: string;
  branch_id: string;
  specialist_id: string;
  appointment_id?: string | null;
  customer_id?: string | null;
  currency_code?: string;
  notes?: string | null;
}

export interface AddItemData {
  type: OrderItemType;
  item_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  currency_code: string;
  notes?: string | null;
  buyer_type?: "customer" | "specialist";
}

const ORDER_WITH_RELATIONS = `
  *,
  specialist:profiles!orders_specialist_id_fkey(id, full_name, avatar_url),
  customer:customers!orders_customer_id_fkey(id, first_name, last_name, phone)
` as const;

class OrdersService {
  private supabase = createBrowserSB();

  // ==================== QUERIES ====================

  async getOrdersBySpecialist(
    tenantId: string,
    specialistId: string,
  ): Promise<OrderWithItems[]> {
    const { data, error } = await this.supabase
      .from("orders")
      .select(`${ORDER_WITH_RELATIONS}, items:order_items(*)`)
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error al obtener comandas: ${error.message}`);
    return (data as unknown as OrderWithItems[]) || [];
  }

  async getOrdersByBranch(
    branchId: string,
    status?: OrderStatus | OrderStatus[],
  ): Promise<OrderWithItems[]> {
    let query = this.supabase
      .from("orders")
      .select(`${ORDER_WITH_RELATIONS}, items:order_items(*)`)
      .eq("branch_id", branchId)
      .order("sent_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (status) {
      if (Array.isArray(status)) {
        query = query.in("status", status);
      } else {
        query = query.eq("status", status);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al obtener comandas: ${error.message}`);
    return (data as unknown as OrderWithItems[]) || [];
  }

  async getOrderById(orderId: string): Promise<OrderWithItems | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select(`${ORDER_WITH_RELATIONS}, items:order_items(*)`)
      .eq("id", orderId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Error al obtener comanda: ${error.message}`);
    }
    return data as unknown as OrderWithItems;
  }

  // ==================== MUTATIONS (vía API routes) ====================
  // Las mutaciones van a través de API routes porque requieren service_role
  // para bypassear RLS. Se incluyen aquí como helpers para llamar al fetch.

  async createOrder(data: CreateOrderData): Promise<Order> {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al crear comanda");
    return json.order;
  }

  async addItem(orderId: string, item: AddItemData): Promise<OrderItem> {
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al agregar ítem");
    return json.item;
  }

  async removeItem(orderId: string, itemId: string): Promise<void> {
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al eliminar ítem");
  }

  async sendOrder(orderId: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/send`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al enviar comanda");
    return json.order;
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al cancelar comanda");
    return json.order;
  }

  async payOrder(
    orderId: string,
    data: {
      cash_register_id: string;
      payments: Array<{
        payment_method: string;
        amount: number;
        reference_number?: string | null;
      }>;
      notes?: string;
      document_type?: "nota_debito" | "factura";
      customer_name?: string | null;
      customer_document?: string | null;
      customer_address?: string | null;
    },
  ): Promise<{ order: Order; invoice_number: string }> {
    const res = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al procesar cobro");
    return { order: json.order, invoice_number: json.invoice_number };
  }

  // ==================== HELPERS ====================

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      draft: "Borrador",
      sent: "En caja",
      paid: "Cobrada",
      cancelled: "Cancelada",
    };
    return labels[status];
  }

  getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      draft: "text-muted-foreground",
      sent: "text-blue-600",
      paid: "text-green-600",
      cancelled: "text-destructive",
    };
    return colors[status];
  }
}

export const ordersService = new OrdersService();
