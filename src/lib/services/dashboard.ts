// src/lib/services/dashboard.ts
// Capa de datos del dashboard del tenant. Lecturas vía createBrowserSB.
import { createBrowserSB } from "@/lib/supabase/client";
import {
  buildRateMap,
  getRateMultiplier,
  type RateInput,
  type RateMap,
} from "@/lib/utils/client-currency";

export interface DashboardKpis {
  appointmentsToday: number;
  totalCustomers: number;
  activeServices: number;
  revenueToday: number;
}

export interface DashboardAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  customer_name: string;
  service_name: string;
  specialist_name: string | null;
}

export interface RevenuePoint {
  date: string; // ISO YYYY-MM-DD
  label: string; // etiqueta corta (ej. "lun 07")
  total: number;
}

export interface StatusSlice {
  status: string;
  label: string;
  count: number;
}

export interface TopService {
  service_id: string;
  name: string;
  count: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  units: number;
  revenue: number; // en moneda base
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

/** Devuelve YYYY-MM-DD local de una fecha. */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

class DashboardService {
  private supabase = createBrowserSB();

  private async getRateContext(
    tenantId: string,
  ): Promise<{ rateMap: RateMap; baseCode: string | null }> {
    const [ratesRes, baseRes] = await Promise.all([
      this.supabase
        .from("exchange_rates")
        .select("from_currency, to_currency, rate")
        .eq("tenant_id", tenantId)
        .is("valid_until", null),
      this.supabase
        .from("currencies")
        .select("code")
        .eq("is_base_currency", true)
        .maybeSingle(),
    ]);

    const rateMap = buildRateMap((ratesRes.data ?? []) as RateInput[]);
    const baseCode = (baseRes.data as { code: string } | null)?.code ?? null;
    return { rateMap, baseCode };
  }

  /** Convierte un monto a la moneda base. Devuelve null si no hay tasa conectable. */
  private toBase(
    amount: number,
    from: string,
    ctx: { rateMap: RateMap; baseCode: string | null },
  ): number | null {
    if (!ctx.baseCode) return null;
    const mult = getRateMultiplier(
      from,
      ctx.baseCode,
      ctx.rateMap,
      ctx.baseCode,
    );
    return mult === null ? null : amount * mult;
  }

  /** 4 KPIs principales. */
  async getKpis(tenantId: string): Promise<DashboardKpis> {
    const todayStart = startOfTodayIso();
    const todayEnd = endOfTodayIso();

    const [apptRes, custRes, svcRes, invRes] = await Promise.all([
      this.supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", todayStart)
        .lte("scheduled_at", todayEnd)
        .neq("status", "cancelled"),
      this.supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      this.supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      this.supabase
        .from("invoices")
        .select("amount_local")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("paid_at", todayStart)
        .lte("paid_at", todayEnd),
    ]);

    let revenueToday = (invRes.data ?? []).reduce(
      (sum, row) => sum + (row.amount_local ?? 0),
      0,
    );

    // Ventas de productos de hoy, convertidas a moneda base y sumadas al KPI.
    const [ctx, salesRes] = await Promise.all([
      this.getRateContext(tenantId),
      this.supabase
        .from("product_sales")
        .select("total, currency_iso")
        .eq("tenant_id", tenantId)
        .gte("sold_at", todayStart)
        .lte("sold_at", todayEnd),
    ]);

    for (const row of (salesRes.data ?? []) as {
      total: number | null;
      currency_iso: string;
    }[]) {
      const converted = this.toBase(row.total ?? 0, row.currency_iso, ctx);
      if (converted !== null) revenueToday += converted;
    }

    return {
      appointmentsToday: apptRes.count ?? 0,
      totalCustomers: custRes.count ?? 0,
      activeServices: svcRes.count ?? 0,
      revenueToday,
    };
  }

  /** Citas de hoy con nombres de cliente/servicio/especialista. */
  async getTodayAppointments(
    tenantId: string,
  ): Promise<DashboardAppointment[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select(
        `id, scheduled_at, status,
         customer:customers!appointments_customer_id_fkey(first_name, last_name, full_name),
         service:services!appointments_service_id_fkey(name),
         specialist:profiles!appointments_specialist_id_fkey(full_name)`,
      )
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", startOfTodayIso())
      .lte("scheduled_at", endOfTodayIso())
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true });

    if (error) throw error;

    // biome-ignore lint/suspicious/noExplicitAny: filas con joins anidados
    return (data ?? []).map((row: any) => ({
      id: row.id,
      scheduled_at: row.scheduled_at,
      status: row.status,
      customer_name:
        row.customer?.full_name ||
        `${row.customer?.first_name ?? ""} ${row.customer?.last_name ?? ""}`.trim() ||
        "Cliente",
      service_name: row.service?.name ?? "Servicio",
      specialist_name: row.specialist?.full_name ?? null,
    }));
  }

  /** Ingresos de los últimos 7 días (facturas pagadas por día). */
  async getRevenueLast7Days(tenantId: string): Promise<RevenuePoint[]> {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from("invoices")
      .select("amount_local, paid_at")
      .eq("tenant_id", tenantId)
      .eq("status", "paid")
      .gte("paid_at", from.toISOString());

    if (error) throw error;

    // Inicializar los 7 días en 0
    const buckets = new Map<string, number>();
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = ymd(d);
      buckets.set(key, 0);
      days.push(d);
    }

    for (const row of data ?? []) {
      if (!row.paid_at) continue;
      const key = ymd(new Date(row.paid_at));
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + (row.amount_local ?? 0));
      }
    }

    // Sumar ventas de productos por día (convertidas a moneda base).
    const ctx = await this.getRateContext(tenantId);
    const { data: salesData } = await this.supabase
      .from("product_sales")
      .select("total, currency_iso, sold_at")
      .eq("tenant_id", tenantId)
      .gte("sold_at", from.toISOString());

    for (const row of (salesData ?? []) as {
      total: number | null;
      currency_iso: string;
      sold_at: string;
    }[]) {
      const key = ymd(new Date(row.sold_at));
      if (!buckets.has(key)) continue;
      const converted = this.toBase(row.total ?? 0, row.currency_iso, ctx);
      if (converted !== null) {
        buckets.set(key, (buckets.get(key) ?? 0) + converted);
      }
    }

    return days.map((d) => {
      const key = ymd(d);
      return {
        date: key,
        label: d.toLocaleDateString("es", { weekday: "short", day: "2-digit" }),
        total: buckets.get(key) ?? 0,
      };
    });
  }

  /** Distribución de citas del mes por estado. */
  async getStatusBreakdown(tenantId: string): Promise<StatusSlice[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("status")
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", startOfMonthIso());

    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const s = row.status ?? "pending";
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status] ?? status,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /** Top 5 servicios por nº de citas del mes. */
  async getTopServices(tenantId: string): Promise<TopService[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("service_id, service:services!appointments_service_id_fkey(name)")
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", startOfMonthIso());

    if (error) throw error;

    const counts = new Map<string, { name: string; count: number }>();
    // biome-ignore lint/suspicious/noExplicitAny: join anidado
    for (const row of (data ?? []) as any[]) {
      if (!row.service_id) continue;
      const name = row.service?.name ?? "Servicio";
      const entry = counts.get(row.service_id) ?? { name, count: 0 };
      entry.count += 1;
      counts.set(row.service_id, entry);
    }

    return [...counts.entries()]
      .map(([service_id, { name, count }]) => ({ service_id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /** Top 5 productos del mes por unidades e ingreso (base). */
  async getTopProducts(tenantId: string): Promise<TopProduct[]> {
    const ctx = await this.getRateContext(tenantId);
    const { data, error } = await this.supabase
      .from("product_sales")
      .select(
        "product_id, quantity, total, currency_iso, product:products!product_sales_product_id_fkey(name)",
      )
      .eq("tenant_id", tenantId)
      .gte("sold_at", startOfMonthIso());

    if (error) throw error;

    const acc = new Map<string, TopProduct>();
    // biome-ignore lint/suspicious/noExplicitAny: join anidado
    for (const row of (data ?? []) as any[]) {
      if (!row.product_id) continue;
      const name = row.product?.name ?? "Producto";
      const entry =
        acc.get(row.product_id) ??
        ({
          product_id: row.product_id,
          name,
          units: 0,
          revenue: 0,
        } as TopProduct);
      entry.units += row.quantity ?? 0;
      const converted = this.toBase(row.total ?? 0, row.currency_iso, ctx);
      if (converted !== null) entry.revenue += converted;
      acc.set(row.product_id, entry);
    }

    return [...acc.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  }
}

export const dashboardService = new DashboardService();
