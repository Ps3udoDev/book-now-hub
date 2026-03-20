// src/app/api/orders/[id]/cancel/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSB } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/orders/:id/cancel
 * Cancela una comanda que no esté pagada.
 * Body: { reason: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: orderId } = await params;
    const supabase = await createServerSB();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, tenant_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Comanda no encontrada" },
        { status: 404 },
      );
    }

    if (order.status === "paid") {
      return NextResponse.json(
        { error: "No se puede cancelar una comanda ya cobrada" },
        { status: 400 },
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "La comanda ya está cancelada" },
        { status: 400 },
      );
    }

    const { data: tenantUser } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("tenant_id", order.tenant_id)
      .eq("is_active", true)
      .single();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Sin permisos en este tenant" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Se requiere un motivo de cancelación" },
        { status: 400 },
      );
    }

    const { data: updated, error } = await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled", cancel_reason: reason.trim() })
      .eq("id", orderId)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error("Error in POST /api/orders/[id]/cancel:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
