// src/lib/services/dashboard.ts
// Capa de datos del dashboard del tenant. Lecturas vía createBrowserSB.
import { createBrowserSB } from "@/lib/supabase/client";

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

    const revenueToday = (invRes.data ?? []).reduce(
      (sum, row) => sum + (row.amount_local ?? 0),
      0,
    );

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
}

export const dashboardService = new DashboardService();
