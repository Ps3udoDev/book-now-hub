// src/app/api/client/services/[id]/availability/route.ts
// Slots disponibles para agendar un servicio en una fecha.
// Si specialist_id no se provee, devuelve combinaciones para todos los
// especialistas elegibles (la UI los agrupa por slot_start).
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../../../_utils";

interface AvailabilityRow {
  specialist_id: string;
  specialist_name: string;
  specialist_avatar_url: string | null;
  specialist_rating: number;
  specialist_total_ratings: number;
  slot_start: string;
  slot_end: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id: serviceId } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const branchId = searchParams.get("branch_id");
  const specialistId = searchParams.get("specialist_id");
  const intervalMin = Number(searchParams.get("interval") || "15");

  if (!date) {
    return NextResponse.json(
      { error: "date es requerido (YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  if (!branchId) {
    return NextResponse.json(
      { error: "branch_id es requerido" },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date debe tener formato YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin as any;
  const { data, error } = await admin.rpc("get_available_slots_for_service", {
    p_tenant_id: ctx.tenant.id,
    p_branch_id: branchId,
    p_service_id: serviceId,
    p_date: date,
    p_specialist_id: specialistId,
    p_slot_interval_minutes: intervalMin,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as AvailabilityRow[];

  // Agrupar por slot_start: el "best" specialist por slot (mayor rating)
  // queda primero porque la funcion ordena. Lo guardamos para asignacion auto.
  const grouped = new Map<string, AvailabilityRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.slot_start) ?? [];
    list.push(row);
    grouped.set(row.slot_start, list);
  }

  const slots = Array.from(grouped.entries()).map(([slotStart, options]) => ({
    slot_start: slotStart,
    slot_end: options[0].slot_end,
    best: {
      specialist_id: options[0].specialist_id,
      specialist_name: options[0].specialist_name,
      specialist_avatar_url: options[0].specialist_avatar_url,
      specialist_rating: options[0].specialist_rating,
      specialist_total_ratings: options[0].specialist_total_ratings,
    },
    available_specialists: options.map((option) => ({
      specialist_id: option.specialist_id,
      specialist_name: option.specialist_name,
      specialist_avatar_url: option.specialist_avatar_url,
      specialist_rating: option.specialist_rating,
      specialist_total_ratings: option.specialist_total_ratings,
    })),
  }));

  return NextResponse.json({ slots, raw_count: rows.length });
}
