// src/app/api/client/history/route.ts
// Historial completo de citas del cliente con paginacion y filtros.
// Devuelve, por cada cita: fecha, servicio principal, especialista, monto pagado.
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireClientCustomer } from "../_utils";

export async function GET(request: NextRequest) {
  const ctx = await requireClientCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("page_size") || "20")),
    );
    const status = searchParams.get("status");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const serviceId = searchParams.get("service_id");
    const specialistId = searchParams.get("specialist_id");

    const admin = supabaseAdmin as any;

    let query = admin
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
        completed_at,
        cancelled_at,
        cancellation_reason,
        service_id,
        services(id, name, category, image_url),
        specialist_id,
        profiles:specialist_id(id, full_name, avatar_url),
        branch_id,
        branches(id, name)
        `,
        { count: "exact" },
      )
      .eq("customer_id", ctx.customer.id)
      .order("scheduled_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (fromDate) query = query.gte("scheduled_at", fromDate);
    if (toDate) query = query.lte("scheduled_at", toDate);
    if (serviceId) query = query.eq("service_id", serviceId);
    if (specialistId) query = query.eq("specialist_id", specialistId);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: appointments, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Cruzar con orders pagadas para mostrar el monto realmente pagado.
    const appointmentIds = (appointments || []).map(
      (appointment: { id: string }) => appointment.id,
    );

    const ordersByAppointment = new Map<
      string,
      { total: number; currency_code: string; paid_at: string | null }
    >();

    if (appointmentIds.length > 0) {
      const { data: orders } = await admin
        .from("orders")
        .select("appointment_id, total, currency_code, paid_at, status")
        .in("appointment_id", appointmentIds)
        .eq("status", "paid");

      for (const order of orders || []) {
        const key = (order as { appointment_id: string | null }).appointment_id;
        if (key) {
          ordersByAppointment.set(key, {
            total: Number((order as { total: number }).total),
            currency_code: (order as { currency_code: string }).currency_code,
            paid_at: (order as { paid_at: string | null }).paid_at,
          });
        }
      }
    }

    const enriched = (appointments || []).map((appointment: any) => {
      const paidOrder = ordersByAppointment.get(appointment.id);
      return {
        ...appointment,
        paid_amount: paidOrder?.total ?? null,
        paid_currency: paidOrder?.currency_code ?? null,
        paid_at: paidOrder?.paid_at ?? null,
      };
    });

    return NextResponse.json({
      appointments: enriched,
      pagination: {
        page,
        page_size: pageSize,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/client/history:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
