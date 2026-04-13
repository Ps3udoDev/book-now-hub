// src/lib/services/commissions.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type {
  Commission,
  CommissionRule,
  CommissionScope,
  CommissionStatus,
  CommissionType,
  OrderItemType,
} from "@/types";

export interface SpecialistBalance {
  specialist_id: string;
  full_name: string;
  gross_commissions: number;
  total_deductions: number;
  net_payable: number;
  currency_code: string;
  pending_count: number;
  pending_ids: string[];
}

export interface CommissionRuleWithRelations extends CommissionRule {
  specialist: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  service: { id: string; name: string } | null;
}

export interface CommissionWithRelations extends Commission {
  specialist: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  order: { id: string; currency_code: string } | null;
}

export interface CreateRuleData {
  tenant_id: string;
  specialist_id: string;
  scope: CommissionScope;
  item_type?: OrderItemType | null;
  service_id?: string | null;
  commission_type: CommissionType;
  value: number;
  currency_code?: string | null;
  notes?: string | null;
}

export interface UpdateRuleData {
  commission_type?: CommissionType;
  value?: number;
  currency_code?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

const RULE_WITH_RELATIONS = `
  *,
  specialist:profiles!commission_rules_specialist_id_fkey(id, full_name, avatar_url),
  service:services!commission_rules_service_id_fkey(id, name)
` as const;

const COMMISSION_WITH_RELATIONS = `
  *,
  specialist:profiles!commissions_specialist_id_fkey(id, full_name, avatar_url),
  order:orders!commissions_order_id_fkey(id, currency_code)
` as const;

class CommissionsService {
  private supabase = createBrowserSB();

  // ==================== REGLAS ====================

  async getRulesByTenant(
    tenantId: string,
  ): Promise<CommissionRuleWithRelations[]> {
    const { data, error } = await this.supabase
      .from("commission_rules")
      .select(RULE_WITH_RELATIONS)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error al obtener reglas: ${error.message}`);
    return (data as unknown as CommissionRuleWithRelations[]) || [];
  }

  async getRulesBySpecialist(
    tenantId: string,
    specialistId: string,
  ): Promise<CommissionRuleWithRelations[]> {
    const { data, error } = await this.supabase
      .from("commission_rules")
      .select(RULE_WITH_RELATIONS)
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .order("scope");

    if (error) throw new Error(`Error al obtener reglas: ${error.message}`);
    return (data as unknown as CommissionRuleWithRelations[]) || [];
  }

  // ==================== COMISIONES ====================

  async getCommissions(
    tenantId: string,
    options?: {
      specialistId?: string;
      status?: CommissionStatus;
      from?: string;
      to?: string;
    },
  ): Promise<CommissionWithRelations[]> {
    let query = this.supabase
      .from("commissions")
      .select(COMMISSION_WITH_RELATIONS)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (options?.specialistId)
      query = query.eq("specialist_id", options.specialistId);
    if (options?.status) query = query.eq("status", options.status);
    if (options?.from) query = query.gte("created_at", options.from);
    if (options?.to) query = query.lte("created_at", options.to);

    const { data, error } = await query;
    if (error) throw new Error(`Error al obtener comisiones: ${error.message}`);
    return (data as unknown as CommissionWithRelations[]) || [];
  }

  async getMyCommissions(
    tenantId: string,
    specialistId: string,
    options?: { year?: number; month?: number },
  ): Promise<CommissionWithRelations[]> {
    if (options?.year && options?.month) {
      const firstDay = `${options.year}-${String(options.month).padStart(2, "0")}-01`;
      const lastDay = new Date(options.year, options.month, 0)
        .toISOString()
        .slice(0, 10);
      return this.getCommissions(tenantId, {
        specialistId,
        from: `${firstDay}T00:00:00`,
        to: `${lastDay}T23:59:59`,
      });
    }
    return this.getCommissions(tenantId, { specialistId });
  }

  // Balance de especialistas para liquidación
  async getSpecialistsBalance(
    tenantId: string,
    year: number,
    month: number,
    fortnight?: 1 | 2,
  ): Promise<SpecialistBalance[]> {
    const monthPad = String(month).padStart(2, "0");
    let from: string;
    let to: string;

    if (fortnight === 1) {
      from = `${year}-${monthPad}-01`;
      to = `${year}-${monthPad}-15`;
    } else if (fortnight === 2) {
      from = `${year}-${monthPad}-16`;
      to = new Date(year, month, 0).toISOString().slice(0, 10);
    } else {
      from = `${year}-${monthPad}-01`;
      to = new Date(year, month, 0).toISOString().slice(0, 10);
    }

    // Comisiones pendientes/aprobadas del período
    const { data: commData } = await this.supabase
      .from("commissions")
      .select(
        "id, specialist_id, commission_amount, currency_code, specialist:profiles!commissions_specialist_id_fkey(id, full_name)",
      )
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "approved"])
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`);

    // Consumos a descontar del período
    const { data: consData } = await this.supabase
      .from("specialist_consumptions")
      .select("specialist_id, total_cost")
      .eq("tenant_id", tenantId)
      .eq("deduct_from_commission", true)
      .gte("date", from)
      .lte("date", to);

    // Agrupar por especialista
    const map: Record<string, SpecialistBalance> = {};

    for (const c of commData || []) {
      const sid = c.specialist_id;
      const name =
        (c.specialist as unknown as { full_name: string } | null)?.full_name ??
        "—";
      if (!map[sid]) {
        map[sid] = {
          specialist_id: sid,
          full_name: name,
          gross_commissions: 0,
          total_deductions: 0,
          net_payable: 0,
          currency_code: c.currency_code ?? "USD",
          pending_count: 0,
          pending_ids: [],
        };
      }
      map[sid].gross_commissions += c.commission_amount ?? 0;
      map[sid].pending_count += 1;
      map[sid].pending_ids.push(c.id);
    }

    for (const c of consData || []) {
      if (map[c.specialist_id]) {
        map[c.specialist_id].total_deductions += c.total_cost ?? 0;
      }
    }

    for (const bal of Object.values(map)) {
      bal.net_payable = bal.gross_commissions - bal.total_deductions;
    }

    return Object.values(map).sort((a, b) => b.net_payable - a.net_payable);
  }

  // ==================== MUTATIONS (vía API routes) ====================

  async createRule(data: CreateRuleData): Promise<CommissionRule> {
    const res = await fetch("/api/commission-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al crear regla");
    return json.rule;
  }

  async updateRule(id: string, data: UpdateRuleData): Promise<CommissionRule> {
    const res = await fetch(`/api/commission-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al actualizar regla");
    return json.rule;
  }

  async deleteRule(id: string): Promise<void> {
    const res = await fetch(`/api/commission-rules/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al eliminar regla");
  }

  async approveCommission(id: string): Promise<Commission> {
    const res = await fetch(`/api/commissions/${id}/approve`, {
      method: "PATCH",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al aprobar comisión");
    return json.commission;
  }

  async bulkPayCommissions(commissionIds: string[]): Promise<void> {
    const res = await fetch("/api/commissions/bulk-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commission_ids: commissionIds }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al liquidar comisiones");
  }

  async payCommission(id: string, notes?: string): Promise<Commission> {
    const res = await fetch(`/api/commissions/${id}/pay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al liquidar comisión");
    return json.commission;
  }

  // ==================== HELPERS ====================

  getScopeLabel(scope: CommissionRule["scope"]): string {
    return { all: "Global", item_type: "Por tipo", service: "Por servicio" }[
      scope
    ];
  }

  getStatusLabel(status: CommissionStatus): string {
    return {
      pending: "Pendiente",
      approved: "Aprobada",
      paid: "Liquidada",
      cancelled: "Cancelada",
    }[status];
  }

  getStatusColor(status: CommissionStatus): string {
    return {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-600",
    }[status];
  }

  getItemTypeLabel(type: OrderItemType): string {
    return { service: "Servicio", product: "Producto", cafeteria: "Cafetería" }[
      type
    ];
  }
}

export const commissionsService = new CommissionsService();
