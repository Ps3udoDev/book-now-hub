import { maskPhone } from "@/lib/mcp/formatters";
import type { McpRequestContext } from "@/lib/mcp/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ScheduleSummaryInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  branchId?: string;
  specialistId?: string;
}

export interface ListAppointmentsInput {
  startDate: string; // ISO or YYYY-MM-DD
  endDate: string; // ISO or YYYY-MM-DD
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListAvailableSlotsInput {
  serviceId: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  specialistId?: string;
}

/**
 * Valida que la diferencia en días no exceda 31 días.
 */
function validateDateRange(
  startStr: string,
  endStr: string,
): { start: Date; end: Date } {
  const start = new Date(startStr);
  const end = new Date(endStr);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Fechas inválidas. Usa el formato ISO o YYYY-MM-DD.");
  }

  if (start > end) {
    throw new Error(
      "La fecha inicial debe ser anterior o igual a la fecha final.",
    );
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 31) {
    throw new Error(
      "El rango de fechas no puede superar 31 días por consulta.",
    );
  }

  return { start, end };
}

/**
 * Resumen de agenda y ocupación en un rango acotado.
 */
export async function getScheduleSummaryCapability(
  ctx: McpRequestContext,
  input: ScheduleSummaryInput,
) {
  const { start, end } = validateDateRange(input.startDate, input.endDate);

  let query = supabaseAdmin
    .from("appointments")
    .select(
      "id, scheduled_at, ends_at, duration_minutes, status, specialist_id, branch_id, specialist:profiles(full_name)",
    )
    .eq("tenant_id", ctx.tenantId)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .neq("status", "cancelled");

  if (input.branchId) {
    query = query.eq("branch_id", input.branchId);
  }
  if (input.specialistId) {
    query = query.eq("specialist_id", input.specialistId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Error obteniendo resumen de agenda: ${error.message}`);
  }

  const appointments = data || [];
  const totalAppointments = appointments.length;

  // Agrupar por fecha y especialista
  const dailyBreakdown: Record<string, number> = {};
  const specialistBreakdown: Record<string, { name: string; count: number }> =
    {};

  for (const a of appointments) {
    const day = a.scheduled_at.split("T")[0];
    dailyBreakdown[day] = (dailyBreakdown[day] || 0) + 1;

    const specId = a.specialist_id || "unassigned";
    const specName =
      (a.specialist as { full_name?: string } | null)?.full_name ||
      "Sin asignar";
    if (!specialistBreakdown[specId]) {
      specialistBreakdown[specId] = { name: specName, count: 0 };
    }
    specialistBreakdown[specId].count++;
  }

  return {
    period: { start: input.startDate, end: input.endDate },
    totalAppointments,
    dailyAppointments: dailyBreakdown,
    specialistAppointments: Object.values(specialistBreakdown),
  };
}

/**
 * Listado paginado de citas con PII limitada.
 */
export async function listAppointmentsCapability(
  ctx: McpRequestContext,
  input: ListAppointmentsInput,
) {
  const { start, end } = validateDateRange(input.startDate, input.endDate);
  const page = Math.max(input.page || 1, 1);
  const limit = Math.min(Math.max(input.limit || 20, 1), 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("appointments")
    .select(
      `
      id,
      scheduled_at,
      ends_at,
      duration_minutes,
      status,
      estimated_price,
      currency_code,
      customer_notes,
      source,
      customer:customers(id, first_name, last_name, phone),
      specialist:profiles(id, full_name),
      service:services(id, name),
      branch:branches(id, name)
    `,
      { count: "exact" },
    )
    .eq("tenant_id", ctx.tenantId)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (input.status) {
    query = query.eq(
      "status",
      input.status as import("@/types").Database["public"]["Enums"]["appointment_status"],
    );
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Error listando citas: ${error.message}`);
  }

  type QueryRow = {
    id: string;
    scheduled_at: string;
    ends_at: string | null;
    duration_minutes: number;
    status: string | null;
    estimated_price: number | null;
    currency_code: string | null;
    customer_notes: string | null;
    source: string | null;
    customer: {
      id: string;
      first_name: string;
      last_name: string;
      phone?: string | null;
    } | null;
    specialist: { id: string; full_name: string } | null;
    service: { id: string; name: string } | null;
    branch: { id: string; name: string } | null;
  };

  const rows = (data || []) as unknown as QueryRow[];

  const items = rows.map((a) => ({
    id: a.id,
    scheduled_at: a.scheduled_at,
    ends_at: a.ends_at,
    duration_minutes: a.duration_minutes,
    status: a.status,
    estimated_price: a.estimated_price,
    currency_code: a.currency_code,
    customer_notes: a.customer_notes,
    source: a.source,
    customer: a.customer
      ? {
          id: a.customer.id,
          first_name: a.customer.first_name,
          last_name: a.customer.last_name,
          phone_masked: maskPhone(a.customer.phone),
        }
      : null,
    specialist: a.specialist
      ? { id: a.specialist.id, name: a.specialist.full_name }
      : null,
    service: a.service ? { id: a.service.id, name: a.service.name } : null,
    branch: a.branch ? { id: a.branch.id, name: a.branch.name } : null,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Calcula slots disponibles para un servicio en una fecha dada.
 */
export async function listAvailableSlotsCapability(
  ctx: McpRequestContext,
  input: ListAvailableSlotsInput,
) {
  // 1. Obtener servicio
  const { data: service, error: sErr } = await supabaseAdmin
    .from("services")
    .select("id, name, duration_minutes, tenant_id")
    .eq("id", input.serviceId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (sErr || !service) {
    throw new Error("El servicio especificado no existe en este negocio.");
  }

  // 2. Obtener citas del día
  const dayStart = new Date(`${input.date}T00:00:00.000Z`);
  const dayEnd = new Date(`${input.date}T23:59:59.999Z`);

  let apptQuery = supabaseAdmin
    .from("appointments")
    .select("scheduled_at, ends_at, specialist_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("branch_id", input.branchId)
    .gte("scheduled_at", dayStart.toISOString())
    .lte("scheduled_at", dayEnd.toISOString())
    .in("status", ["pending", "confirmed", "in_progress"]);

  if (input.specialistId) {
    apptQuery = apptQuery.eq("specialist_id", input.specialistId);
  }

  const { data: existingAppts } = await apptQuery;
  const busyRanges = (existingAppts || []).map((a) => ({
    start: new Date(a.scheduled_at).getTime(),
    end: new Date(a.ends_at || a.scheduled_at).getTime(),
  }));

  // 3. Generar slots teóricos entre las 08:00 y las 19:00 en bloques de 30 mins
  const durationMs = (service.duration_minutes || 30) * 60 * 1000;
  const slots: string[] = [];

  for (let hour = 8; hour < 19; hour++) {
    for (const min of [0, 30]) {
      const slotStart = new Date(
        `${input.date}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00.000Z`,
      );
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      // Verificar si solapa con alguna cita ocupada
      const overlaps = busyRanges.some(
        (b) => slotStart.getTime() < b.end && slotEnd.getTime() > b.start,
      );

      if (!overlaps) {
        slots.push(slotStart.toISOString());
      }
    }
  }

  return {
    date: input.date,
    service: {
      id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
    },
    branchId: input.branchId,
    specialistId: input.specialistId || null,
    availableSlots: slots,
  };
}
