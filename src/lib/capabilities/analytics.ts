import type { McpRequestContext } from "@/lib/mcp/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface BusinessSnapshotResult {
  tenantName: string;
  tenantSlug: string;
  metrics: {
    activeBranchesCount: number;
    activeSpecialistsCount: number;
    activeServicesCount: number;
    todayAppointmentsCount: number;
    appointmentsByStatus: Record<string, number>;
  };
  topServices: Array<{ name: string; appointmentsCount: number }>;
  generatedAt: string;
}

export async function getBusinessSnapshotCapability(
  ctx: McpRequestContext,
): Promise<BusinessSnapshotResult> {
  const tenantId = ctx.tenantId;

  // 1. Datos básicos del tenant
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, slug")
    .eq("id", tenantId)
    .single();

  // 2. Conteo de sedes activas
  const { count: branchesCount } = await supabaseAdmin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // 3. Conteo de especialistas activos
  const { count: specialistsCount } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_specialist", true)
    .eq("is_active", true);

  // 4. Conteo de servicios activos
  const { count: servicesCount } = await supabaseAdmin
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  // 5. Citas de los últimos 30 días para métricas de estado
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentAppointments } = await supabaseAdmin
    .from("appointments")
    .select("status, scheduled_at, service:services(name)")
    .eq("tenant_id", tenantId)
    .gte("scheduled_at", thirtyDaysAgo.toISOString());

  const todayStr = new Date().toISOString().split("T")[0];
  let todayCount = 0;
  const statusCounts: Record<string, number> = {};
  const servicePopularity: Record<string, number> = {};

  if (recentAppointments) {
    for (const appt of recentAppointments) {
      const status = appt.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (appt.scheduled_at?.startsWith(todayStr)) {
        todayCount++;
      }

      const sName = (appt.service as { name?: string } | null)?.name;
      if (sName) {
        servicePopularity[sName] = (servicePopularity[sName] || 0) + 1;
      }
    }
  }

  const topServices = Object.entries(servicePopularity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, appointmentsCount: count }));

  return {
    tenantName: tenant?.name || "Negocio",
    tenantSlug: tenant?.slug || ctx.tenantSlug,
    metrics: {
      activeBranchesCount: branchesCount || 0,
      activeSpecialistsCount: specialistsCount || 0,
      activeServicesCount: servicesCount || 0,
      todayAppointmentsCount: todayCount,
      appointmentsByStatus: statusCounts,
    },
    topServices,
    generatedAt: new Date().toISOString(),
  };
}
