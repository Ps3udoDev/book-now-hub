import { mcpDb } from "@/lib/mcp/db";
import type {
  McpAppointmentDraftRecord,
  McpRequestContext,
} from "@/lib/mcp/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CreateAppointmentDraftInput {
  customer_id: string;
  service_id: string;
  service_variant_id?: string | null;
  branch_id: string;
  scheduled_at: string;
  specialist_id?: string | null;
  customer_notes?: string | null;
  idempotency_key: string;
}

export interface ConfirmAppointmentDraftInput {
  draft_id: string;
  idempotency_key: string;
}

/**
 * Crea un borrador de cita con TTL de 10 minutos para confirmación posterior.
 */
export async function createAppointmentDraftCapability(
  ctx: McpRequestContext,
  input: CreateAppointmentDraftInput,
) {
  const {
    customer_id,
    service_id,
    service_variant_id,
    branch_id,
    scheduled_at,
    specialist_id,
    customer_notes,
    idempotency_key,
  } = input;

  if (!idempotency_key || !idempotency_key.trim()) {
    throw new Error(
      "Se requiere 'idempotency_key' para garantizar idempotencia.",
    );
  }

  // 1. Verificar si ya existe un draft con la misma connection_id e idempotency_key
  const { data: existingDraft } = await mcpDb
    .from("mcp_appointment_drafts")
    .select("*")
    .eq("connection_id", ctx.connectionId)
    .eq("idempotency_key", idempotency_key)
    .maybeSingle();

  if (existingDraft) {
    return {
      draft: existingDraft as unknown as McpAppointmentDraftRecord,
      isExisting: true,
      message: "Borrador recuperado por clave de idempotencia.",
    };
  }

  // 2. Validar que el cliente pertenezca al tenant
  const { data: customer, error: cErr } = await supabaseAdmin
    .from("customers")
    .select("id, first_name, last_name, phone")
    .eq("id", customer_id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (cErr || !customer) {
    throw new Error("El cliente no existe o no pertenece a este negocio.");
  }

  // 3. Validar servicio
  const { data: service, error: sErr } = await supabaseAdmin
    .from("services")
    .select("id, name, duration_minutes, base_price, currency_code")
    .eq("id", service_id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (sErr || !service) {
    throw new Error("El servicio no existe o no pertenece a este negocio.");
  }

  // 4. Validar sucursal
  const { data: branch, error: bErr } = await supabaseAdmin
    .from("branches")
    .select("id, name")
    .eq("id", branch_id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (bErr || !branch) {
    throw new Error("La sucursal no existe o no pertenece a este negocio.");
  }

  // 5. Validar especialista si se envió
  let specialistName: string | null = null;
  if (specialist_id) {
    const { data: specialist, error: specErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", specialist_id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (specErr || !specialist) {
      throw new Error(
        "El especialista no existe o no pertenece a este negocio.",
      );
    }
    specialistName = specialist.full_name;
  }

  // 6. Calcular fechas y precios
  const scheduledDate = new Date(scheduled_at);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error(
      "Formato de 'scheduled_at' inválido. Debe ser una fecha ISO 8601.",
    );
  }

  const durationMinutes = service.duration_minutes || 30;
  const endsAt = new Date(
    scheduledDate.getTime() + durationMinutes * 60 * 1000,
  );
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos TTL

  const draftData = {
    tenant_id: ctx.tenantId,
    connection_id: ctx.connectionId,
    actor_auth_user_id: ctx.authUserId,
    customer_id,
    service_id,
    service_variant_id: service_variant_id || null,
    branch_id,
    specialist_id: specialist_id || null,
    scheduled_at: scheduledDate.toISOString(),
    ends_at: endsAt.toISOString(),
    duration_minutes: durationMinutes,
    estimated_price: service.base_price,
    currency_code: service.currency_code || "USD",
    customer_notes: customer_notes || null,
    status: "draft",
    idempotency_key,
    expires_at: expiresAt.toISOString(),
  };

  const { data: newDraft, error: insertError } = await mcpDb
    .from("mcp_appointment_drafts")
    .insert(draftData)
    .select()
    .single();

  if (insertError) {
    throw new Error(
      `Error al guardar el borrador de cita: ${insertError.message}`,
    );
  }

  const typedDraft = newDraft as unknown as McpAppointmentDraftRecord;

  const summary =
    `Borrador de reserva creado para ${customer.first_name} ${customer.last_name}: ` +
    `servicio '${service.name}' en la sede '${branch.name}' ` +
    (specialistName ? `con ${specialistName} ` : "") +
    `el ${scheduledDate.toLocaleDateString("es-ES")} a las ${scheduledDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}. ` +
    `Precio estimado: ${service.base_price} ${service.currency_code || "USD"}. ` +
    `Expira en 10 minutos. Confirma con 'confirm_appointment_draft' usando draft_id: '${typedDraft.id}'.`;

  return {
    draft: typedDraft,
    summary,
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * Confirma atómicamente un borrador de cita utilizando el RPC transaccional.
 */
export async function confirmAppointmentDraftCapability(
  ctx: McpRequestContext,
  input: ConfirmAppointmentDraftInput,
) {
  const { draft_id } = input;

  if (!draft_id) {
    throw new Error("Se requiere 'draft_id'.");
  }

  const { data, error } = await mcpDb.rpc("confirm_mcp_appointment_draft", {
    p_draft_id: draft_id,
    p_actor_auth_user_id: ctx.authUserId,
  });

  if (error) {
    throw new Error(`Error al confirmar la cita: ${error.message}`);
  }

  return {
    success: true,
    result: data,
    message:
      "Cita confirmada exitosamente en estado 'pending' con source='mcp'.",
  };
}
