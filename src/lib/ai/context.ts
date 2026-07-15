// src/lib/ai/context.ts
// Construye un resumen AGREGADO del tenant (sin PII) para alimentar al LLM.
import type { SupabaseClient } from "@supabase/supabase-js";
import { previewSegment } from "@/lib/segments/engine";
import { SEGMENT_FIELDS } from "@/lib/segments/fields";
import type { Database, SegmentRules, TenantSnapshot } from "@/types";

type SB = SupabaseClient<Database>;

/** Cuenta clientes de un segmento sin traer PII. */
async function countSegment(
  supabase: SB,
  tenantId: string,
  rules: SegmentRules,
): Promise<number> {
  const { count } = await previewSegment(supabase, tenantId, rules);
  return count;
}

export async function buildTenantSnapshot(
  supabase: SB,
  tenantId: string,
): Promise<TenantSnapshot> {
  const currentMonth = new Date().getMonth() + 1;

  // Conteos por inactividad y cumpleaños vía el motor real.
  const [d30, d60, d90, birthdays, marketing] = await Promise.all([
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "days_since_last_visit", operator: "gte", value: 30 },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "days_since_last_visit", operator: "gte", value: 60 },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "days_since_last_visit", operator: "gte", value: 90 },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [
        { field: "birthday_month", operator: "eq", value: currentMonth },
      ],
    }),
    countSegment(supabase, tenantId, {
      match: "all",
      conditions: [{ field: "accepts_marketing", operator: "eq", value: true }],
    }),
  ]);

  // Total de clientes activos.
  const { count: totalActiveCustomers } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // Ciudades y ticket promedio (dataset chico → se agrega en JS).
  const { data: rows } = await supabase
    .from("customers")
    .select("city, total_spent, total_visits")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const cityCounts = new Map<string, number>();
  let spentSum = 0;
  let spentN = 0;
  for (const r of rows ?? []) {
    if (r.city) cityCounts.set(r.city, (cityCounts.get(r.city) ?? 0) + 1);
    if ((r.total_visits ?? 0) > 0 && r.total_spent != null) {
      spentSum += Number(r.total_spent);
      spentN += 1;
    }
  }
  const topCities = [...cityCounts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const avgTicket = spentN > 0 ? Math.round(spentSum / spentN) : 0;

  // Top servicios por citas (últimas, agregado en JS).
  // Se hace en dos pasos (en vez de embed `services(name)`) para evitar
  // depender del nombre exacto de la relación FK entre appointments y services.
  const { data: appts } = await supabase
    .from("appointments")
    .select("service_id")
    .eq("tenant_id", tenantId)
    .limit(1000);

  const serviceIdCounts = new Map<string, number>();
  for (const a of appts ?? []) {
    if (a.service_id) {
      serviceIdCounts.set(
        a.service_id,
        (serviceIdCounts.get(a.service_id) ?? 0) + 1,
      );
    }
  }

  let topServices: { name: string; count: number }[] = [];
  if (serviceIdCounts.size > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id, name")
      .in("id", [...serviceIdCounts.keys()]);

    topServices = (services ?? [])
      .map((s) => ({ name: s.name, count: serviceIdCounts.get(s.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  // Citas próximas 7 días (proxy de carga de agenda).
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 86400_000);
  const { count: upcomingAppointments7d } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in7d.toISOString());

  const segmentFields = SEGMENT_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    operators: f.operators,
    options: f.options,
    hint: f.hint,
  }));

  return {
    currency: "USD",
    totalActiveCustomers: totalActiveCustomers ?? 0,
    inactivity: { d30, d60, d90 },
    birthdaysThisMonth: birthdays,
    acceptsMarketing: marketing,
    topCities,
    topServices,
    avgTicket,
    upcomingAppointments7d: upcomingAppointments7d ?? 0,
    segmentFields,
  };
}
