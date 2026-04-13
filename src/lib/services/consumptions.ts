// src/lib/services/consumptions.ts
import { createBrowserSB } from "@/lib/supabase/client";
import type { Database } from "@/types";

type ConsumptionRow =
  Database["public"]["Tables"]["specialist_consumptions"]["Row"];

export interface ConsumptionWithService extends ConsumptionRow {
  service: { id: string; name: string } | null;
}

export interface CreateConsumptionData {
  tenant_id: string;
  specialist_id: string;
  description: string;
  service_id?: string | null;
  quantity: number;
  unit_cost: number;
  currency_code: string;
  deduct_from_commission: boolean;
  date: string;
  notes?: string | null;
}

export interface SpecialistMonthStats {
  services_count: number;
  revenue: number;
  commission_amount: number;
  deductions: number;
  net_payable: number;
  currency_code: string;
  weekly_revenue: { week: number; label: string; revenue: number }[];
}

class ConsumptionsService {
  private supabase = createBrowserSB();

  async getBySpecialist(
    tenantId: string,
    specialistId: string,
    options?: { from?: string; to?: string },
  ): Promise<ConsumptionWithService[]> {
    let query = this.supabase
      .from("specialist_consumptions")
      .select(
        "*, service:services!specialist_consumptions_service_id_fkey(id, name)",
      )
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .order("date", { ascending: false });

    if (options?.from) query = query.gte("date", options.from);
    if (options?.to) query = query.lte("date", options.to);

    const { data, error } = await query;
    if (error) throw new Error(`Error al obtener consumos: ${error.message}`);
    return (data as unknown as ConsumptionWithService[]) || [];
  }

  // Estadísticas del mes para el dashboard de desempeño
  async getMonthStats(
    tenantId: string,
    specialistId: string,
    year: number,
    month: number, // 1-12
  ): Promise<SpecialistMonthStats> {
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

    // Órdenes pagadas del mes
    const { data: orders } = await this.supabase
      .from("orders")
      .select("id, total, currency_code, paid_at")
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .eq("status", "paid")
      .gte("paid_at", `${firstDay}T00:00:00`)
      .lte("paid_at", `${lastDay}T23:59:59`);

    const ordersData = orders || [];
    const servicesCount = ordersData.length;
    const revenue = ordersData.reduce((s, o) => s + (o.total ?? 0), 0);
    const mainCurrency =
      ordersData.length > 0
        ? (ordersData
            .map((o) => o.currency_code)
            .sort(
              (a, b) =>
                ordersData.filter((x) => x.currency_code === b).length -
                ordersData.filter((x) => x.currency_code === a).length,
            )[0] ?? "USD")
        : "USD";

    // Comisiones del mes
    const { data: comms } = await this.supabase
      .from("commissions")
      .select("commission_amount, status")
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .gte("created_at", `${firstDay}T00:00:00`)
      .lte("created_at", `${lastDay}T23:59:59`);

    const commissionAmount = (comms || []).reduce(
      (s, c) => s + (c.commission_amount ?? 0),
      0,
    );

    // Consumos del mes
    const { data: consumps } = await this.supabase
      .from("specialist_consumptions")
      .select("total_cost, deduct_from_commission")
      .eq("tenant_id", tenantId)
      .eq("specialist_id", specialistId)
      .gte("date", firstDay)
      .lte("date", lastDay);

    const deductions = (consumps || [])
      .filter((c) => c.deduct_from_commission)
      .reduce((s, c) => s + (c.total_cost ?? 0), 0);

    // Ingresos por semana del mes
    const weeklyMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const order of ordersData) {
      if (!order.paid_at) continue;
      const day = new Date(order.paid_at).getDate();
      const week = Math.ceil(day / 7);
      weeklyMap[week] = (weeklyMap[week] ?? 0) + (order.total ?? 0);
    }

    const weekLabels: Record<number, string> = {
      1: "Sem 1",
      2: "Sem 2",
      3: "Sem 3",
      4: "Sem 4",
      5: "Sem 5",
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    const weeklyRevenue = Array.from({ length: weeksInMonth }, (_, i) => ({
      week: i + 1,
      label: weekLabels[i + 1] ?? `Sem ${i + 1}`,
      revenue: weeklyMap[i + 1] ?? 0,
    }));

    return {
      services_count: servicesCount,
      revenue,
      commission_amount: commissionAmount,
      deductions,
      net_payable: commissionAmount - deductions,
      currency_code: mainCurrency,
      weekly_revenue: weeklyRevenue,
    };
  }

  // Ranking del tenant para el mes
  async getMonthRanking(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<
    {
      specialist_id: string;
      full_name: string;
      revenue: number;
      commission_amount: number;
    }[]
  > {
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data } = await this.supabase
      .from("orders")
      .select(
        "specialist_id, total, specialist:profiles!orders_specialist_id_fkey(id, full_name)",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "paid")
      .gte("paid_at", `${firstDay}T00:00:00`)
      .lte("paid_at", `${lastDay}T23:59:59`);

    const map: Record<
      string,
      {
        specialist_id: string;
        full_name: string;
        revenue: number;
        commission_amount: number;
      }
    > = {};
    for (const row of data || []) {
      const sid = row.specialist_id;
      const name =
        (row.specialist as unknown as { full_name: string } | null)
          ?.full_name ?? "—";
      if (!map[sid])
        map[sid] = {
          specialist_id: sid,
          full_name: name,
          revenue: 0,
          commission_amount: 0,
        };
      map[sid].revenue += row.total ?? 0;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }

  // Mutations vía API routes
  async create(data: CreateConsumptionData): Promise<ConsumptionRow> {
    const res = await fetch("/api/consumptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al registrar consumo");
    return json.consumption;
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/consumptions/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al eliminar consumo");
  }
}

export const consumptionsService = new ConsumptionsService();
export type { ConsumptionRow as Consumption };
