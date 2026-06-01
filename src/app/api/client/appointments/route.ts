// src/app/api/client/appointments/route.ts
// Crea una cita reservada por el cliente final.
// Validaciones:
//  - servicio activo del tenant
//  - especialista (si se da) ofrece el servicio y trabaja en la sucursal
//  - el slot sigue disponible al momento de crear la cita
//    (recheck: re-ejecutamos get_available_slots_for_service para esa
//    fecha y validamos que slot_start exista)
//  - si no se da specialist, asignamos el mejor disponible para el slot
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../_utils";

interface CreateAppointmentBody {
  service_id: string;
  branch_id: string;
  scheduled_at: string;
  specialist_id?: string | null;
  customer_notes?: string | null;
}

export async function POST(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as CreateAppointmentBody;

    if (!body.service_id || !body.branch_id || !body.scheduled_at) {
      return NextResponse.json(
        { error: "service_id, branch_id y scheduled_at son requeridos" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin as any;

    // Servicio activo
    const { data: service } = await admin
      .from("services")
      .select(
        "id, tenant_id, name, duration_minutes, base_price, currency_code, requires_specialist, is_active",
      )
      .eq("id", body.service_id)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (!service || !(service as { is_active: boolean }).is_active) {
      return NextResponse.json(
        { error: "Servicio no disponible" },
        { status: 404 },
      );
    }

    const slotDate = new Date(body.scheduled_at);
    if (Number.isNaN(slotDate.getTime())) {
      return NextResponse.json(
        { error: "scheduled_at invalido" },
        { status: 400 },
      );
    }

    // Recheck: el slot tiene que estar libre.
    const dateStr = slotDate.toISOString().substring(0, 10);
    const { data: slotsData, error: slotsError } = await admin.rpc(
      "get_available_slots_for_service",
      {
        p_tenant_id: ctx.tenant.id,
        p_branch_id: body.branch_id,
        p_service_id: body.service_id,
        p_date: dateStr,
        p_specialist_id: body.specialist_id ?? null,
        p_slot_interval_minutes: 5,
      },
    );

    if (slotsError) {
      return NextResponse.json({ error: slotsError.message }, { status: 500 });
    }

    const matching =
      (
        slotsData as Array<{
          slot_start: string;
          specialist_id: string;
          specialist_rating: number;
        }> | null
      )?.filter(
        (row) => new Date(row.slot_start).getTime() === slotDate.getTime(),
      ) ?? [];

    if (matching.length === 0) {
      return NextResponse.json(
        { error: "Ese horario ya no esta disponible" },
        { status: 409 },
      );
    }

    // Asignacion automatica si no se eligio especialista
    let assignedSpecialistId = body.specialist_id ?? null;
    if (!assignedSpecialistId) {
      // matching ya viene ordenado por rating DESC desde la funcion
      assignedSpecialistId = matching[0].specialist_id;
    } else {
      // Si el cliente eligio especialista, asegurar que esta en matching
      const exists = matching.some(
        (row) => row.specialist_id === assignedSpecialistId,
      );
      if (!exists) {
        return NextResponse.json(
          { error: "Ese especialista ya no esta disponible para este horario" },
          { status: 409 },
        );
      }
    }

    const duration = (service as { duration_minutes: number }).duration_minutes;
    const basePrice = (service as { base_price: number }).base_price;
    const currency =
      (service as { currency_code: string | null }).currency_code ?? "USD";

    const { data: appointment, error: insertError } = await admin
      .from("appointments")
      .insert({
        tenant_id: ctx.tenant.id,
        branch_id: body.branch_id,
        customer_id: ctx.customer.id,
        specialist_id: assignedSpecialistId,
        service_id: body.service_id,
        scheduled_at: slotDate.toISOString(),
        duration_minutes: duration,
        status: "pending",
        estimated_price: basePrice,
        currency_code: currency,
        customer_notes: body.customer_notes?.trim() || null,
        source: "client_app",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/client/appointments:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
